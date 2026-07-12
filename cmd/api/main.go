package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
	"com.nlaak.backend-template/internal/infrastructure/config"
	"com.nlaak.backend-template/internal/infrastructure/db"
	emailinfra "com.nlaak.backend-template/internal/infrastructure/email"
	httpinfra "com.nlaak.backend-template/internal/infrastructure/http"
	"com.nlaak.backend-template/internal/infrastructure/logging"
	paymentsteam "com.nlaak.backend-template/internal/infrastructure/payment/steam"
	paymentstripe "com.nlaak.backend-template/internal/infrastructure/payment/stripe"
	"com.nlaak.backend-template/internal/infrastructure/startup"
)

func main() {
	cfg := config.LoadFor("API")
	startup.ConfigureProcessLogger(apiOriginTag(cfg.AppAddr))
	logger := logging.New("api", cfg.OrchestratorLogURL)
	log.Printf("env source: %s", startup.EnvSourceForLog(cfg.EnvFilePath))

	pgProbeErr := startup.ProbePostgres(cfg.PostgresDSN, 2*time.Second)
	redisProbeErr := startup.ProbeRedis(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB, 2*time.Second)
	log.Printf("strata layers preflight: L1=active (in-memory), L2=%s addr=%s db=%d, L3=%s", startup.LayerStatusLabel(redisProbeErr), cfg.RedisAddr, cfg.RedisDB, startup.LayerStatusLabel(pgProbeErr))

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	ds, err := db.NewStrataDataStore(ctx, cfg.PostgresDSN, cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		log.Fatalf("strata init failed: %v", err)
	}
	var closeDSOnce sync.Once
	closeDataStore := func() error {
		var closeErr error
		closeDSOnce.Do(func() {
			closeErr = ds.Close()
		})
		return closeErr
	}

	migrator := db.NewMigrator(ds, "./internal/infrastructure/db/migrations")
	if err := migrator.Up(ctx); err != nil {
		log.Fatalf("migration failed: %v", err)
	}
	migrationRecords, migrationStatusErr := ds.MigrationStatus(ctx)
	if migrationStatusErr != nil {
		log.Printf("migration status unavailable: %v", migrationStatusErr)
	} else {
		log.Printf("migration status: applied=%d", len(migrationRecords))
	}

	repo := db.NewStrataUserRepository(ds)
	passwordResetRepo := db.NewStrataPasswordResetRepository(ds)
	preferencesRepo := db.NewStrataPreferencesRepository(ds)
	o2ulProfileRepo := db.NewStrataO2ULUserProfileRepository(ds)
	o2ulPreferencesRepo := db.NewStrataO2ULPreferencesRepository(ds)
	o2ulFilesRepo := db.NewStrataO2ULFilesRepository(ds)
	o2ulPresenceRepo := db.NewStrataO2ULPresenceRepository(ds)
	o2ulNotificationsRepo := db.NewStrataO2ULNotificationsRepository(ds)
	strataAdminSvc := db.NewStrataAdminStatusService(ds)
	tokens := httpinfra.NewJWTService(cfg.JWTSecret, 24*time.Hour)
	authSvc := application.NewAuthService(repo, tokens, logger)
	if err := ensureMasterAdmin(ctx, cfg, authSvc, repo); err != nil {
		log.Fatalf("master admin bootstrap failed: %v", err)
	}
	authSvc.
		WithSMTPConfig(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUsername, cfg.SMTPPassword, cfg.SMTPFrom).
		WithPasswordReset(passwordResetRepo, emailinfra.NewSMTPSender(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUsername, cfg.SMTPPassword))
	preferencesSvc := application.NewPreferencesService(preferencesRepo, logger)
	o2ulUsersSvc := application.NewO2ULUsersService(repo, o2ulProfileRepo)
	o2ulPreferencesSvc := application.NewO2ULPreferencesService(o2ulPreferencesRepo)
	o2ulAuthSyncSvc := application.NewO2ULAuthSyncService(repo, o2ulProfileRepo)
	o2ulFilesSvc := application.NewO2ULFilesService(o2ulFilesRepo)
	o2ulWalletSvc, err := newConfiguredO2ULWalletService(cfg)
	if err != nil {
		log.Fatalf("o2ul wallet service init failed: %v", err)
	}
	o2ulPresenceSvc := application.NewO2ULPresenceService(o2ulPresenceRepo)
	o2ulNotificationsSvc := application.NewO2ULNotificationsService(o2ulNotificationsRepo)
	paymentSvc := application.NewPaymentService(
		logger,
		paymentstripe.NewProvider(cfg.StripeSecretKey, cfg.StripeWebhookSecret),
		paymentsteam.NewProvider(
			cfg.SteamPublisherKey,
			cfg.SteamWebAPIKey,
			cfg.SteamUsername,
			cfg.SteamLoginPassword,
			cfg.SteamAppID,
			cfg.SteamWebhookSecret,
		),
	).WithUserRepository(repo)

	server := &http.Server{
		Addr:              cfg.AppAddr,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	var shutdownOnce sync.Once
	shutdownInitiated := make(chan struct{})
	shutdownDone := make(chan struct{})
	totalShutdownTimeout := time.Duration(cfg.ShutdownTimeoutSeconds) * time.Second
	phaseShutdownTimeout := time.Duration(cfg.ShutdownPhaseTimeoutSeconds) * time.Second
	if totalShutdownTimeout <= 0 {
		totalShutdownTimeout = 30 * time.Second
	}
	if phaseShutdownTimeout <= 0 {
		phaseShutdownTimeout = 10 * time.Second
	}

	requestShutdown := func(reason string) {
		shutdownOnce.Do(func() {
			close(shutdownInitiated)
			go func() {
				defer close(shutdownDone)

				shutdownCtx, cancel := context.WithTimeout(context.Background(), totalShutdownTimeout)
				defer cancel()

				err := startup.RunShutdownPhases(shutdownCtx, "API", reason, []startup.ShutdownPhase{
					{
						Name:    "drain_http_inflight",
						Timeout: phaseShutdownTimeout,
						Run: func(ctx context.Context) error {
							return server.Shutdown(ctx)
						},
					},
					{
						Name:    "snapshot_runtime_state",
						Timeout: phaseShutdownTimeout,
						Run: func(_ context.Context) error {
							stats := ds.Stats()
							log.Printf("shutdown metrics: component=API l1_entries=%d", stats.L1Entries)
							return nil
						},
					},
					{
						Name:    "close_datastore",
						Timeout: phaseShutdownTimeout,
						Run: func(_ context.Context) error {
							return closeDataStore()
						},
					},
				})

				if err != nil {
					log.Printf("shutdown failed: component=API error=%v", err)
				}
			}()
		})
	}

	router := httpinfra.BuildAPIRouter(httpinfra.APIOptions{
		AuthService:              authSvc,
		PaymentService:           paymentSvc,
		PreferencesService:       preferencesSvc,
		O2ULUsersService:         o2ulUsersSvc,
		O2ULPreferencesService:   o2ulPreferencesSvc,
		O2ULAuthSyncService:      o2ulAuthSyncSvc,
		O2ULFilesService:         o2ulFilesSvc,
		O2ULWalletService:        o2ulWalletSvc,
		O2ULPresenceService:      o2ulPresenceSvc,
		O2ULNotificationsService: o2ulNotificationsSvc,
		StrataAdminSvc:           strataAdminSvc,
		UserRepo:                 repo,
		TokenSvc:                 tokens,
		OrchestratorControlToken: cfg.OrchestratorControlToken,
		RequestShutdown:          requestShutdown,
	})
	server.Handler = router

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
	go func() {
		sig := <-sigCh
		requestShutdown("signal_" + sig.String())
	}()

	logger.Info("api_started", map[string]any{"addr": cfg.AppAddr})
	stats := ds.Stats()
	log.Printf("strata runtime: L1=active entries=%d, L2=%s, L3=%s", stats.L1Entries, startup.LayerStatusLabel(redisProbeErr), startup.LayerStatusLabel(pgProbeErr))
	log.Printf("shutdown policy: component=API timeout_seconds=%s phase_timeout_seconds=%s", strconv.Itoa(cfg.ShutdownTimeoutSeconds), strconv.Itoa(cfg.ShutdownPhaseTimeoutSeconds))
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		_ = closeDataStore()
		log.Fatalf("server failed: %v", err)
	}

	select {
	case <-shutdownInitiated:
		<-shutdownDone
	default:
		_ = closeDataStore()
	}
}

func apiOriginTag(addr string) string {
	port := extractPort(addr)
	if port == "" {
		return "API"
	}
	return "API-" + port
}

func newConfiguredO2ULWalletService(cfg config.Config) (*application.O2ULWalletService, error) {
	profile := strings.TrimSpace(cfg.O2ULWalletHeaderProfile)
	if profile == "" {
		profile = "ethapi-core"
	}
	log.Printf("o2ul wallet light-client profile=%s", profile)
	return application.NewDefaultO2ULWalletServiceWithProfile(profile, cfg.O2ULWalletRPCURL)
}

func extractPort(addr string) string {
	trimmed := strings.TrimSpace(addr)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, ":") {
		return strings.TrimPrefix(trimmed, ":")
	}
	if _, port, err := net.SplitHostPort(trimmed); err == nil {
		return strings.TrimSpace(port)
	}
	idx := strings.LastIndex(trimmed, ":")
	if idx >= 0 && idx < len(trimmed)-1 {
		return strings.TrimSpace(trimmed[idx+1:])
	}
	return ""
}

func ensureMasterAdmin(ctx context.Context, cfg config.Config, authSvc *application.AuthService, repo application.UserRepository) error {
	username := strings.TrimSpace(cfg.MasterAdminUsername)
	email := strings.ToLower(strings.TrimSpace(cfg.MasterAdminEmail))
	password := cfg.MasterAdminPassword
	if username == "" || email == "" || strings.TrimSpace(password) == "" {
		return nil
	}

	current, err := repo.ByEmail(ctx, email)
	if err != nil {
		_, _, regErr := authSvc.Register(ctx, email, username, password, domain.RoleMasterAdmin)
		if regErr != nil {
			return fmt.Errorf("create master admin: %w", regErr)
		}
		log.Printf("master admin bootstrapped: email=%s username=%s", email, username)
		current, err = repo.ByEmail(ctx, email)
		if err != nil {
			return fmt.Errorf("reload master admin after bootstrap: %w", err)
		}
	}

	if domain.NormalizeRole(current.Role) != domain.RoleMasterAdmin {
		if err := repo.UpdateRole(ctx, current.ID, domain.RoleMasterAdmin, time.Now().UTC()); err != nil {
			return fmt.Errorf("enforce master admin role: %w", err)
		}
		log.Printf("master admin role enforced for existing user: email=%s", email)
	}

	users, err := repo.List(ctx)
	if err != nil {
		return fmt.Errorf("list users for master admin enforcement: %w", err)
	}

	for _, user := range users {
		if user.ID == current.ID {
			continue
		}
		if domain.NormalizeRole(user.Role) != domain.RoleMasterAdmin {
			continue
		}
		if err := repo.UpdateRole(ctx, user.ID, domain.RoleAdmin, time.Now().UTC()); err != nil {
			return fmt.Errorf("demote extra master admin (%s): %w", user.Email, err)
		}
		log.Printf("extra master admin demoted to admin: email=%s id=%s", user.Email, user.ID)
	}

	return nil
}
