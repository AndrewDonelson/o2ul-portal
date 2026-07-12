package httpinfra

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
	"com.nlaak.backend-template/internal/infrastructure/http/handlers"
	mw "com.nlaak.backend-template/internal/infrastructure/http/middleware"
	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

type APIOptions struct {
	AuthService              *application.AuthService
	PaymentService           *application.PaymentService
	PreferencesService       *application.PreferencesService
	O2ULUsersService         *application.O2ULUsersService
	O2ULPreferencesService   *application.O2ULPreferencesService
	O2ULAuthSyncService      *application.O2ULAuthSyncService
	O2ULFilesService         *application.O2ULFilesService
	O2ULWalletService        *application.O2ULWalletService
	O2ULPresenceService      *application.O2ULPresenceService
	O2ULNotificationsService *application.O2ULNotificationsService
	StrataAdminSvc           application.StrataAdminService
	UserRepo                 application.UserRepository
	TokenSvc                 *JWTService
	OrchestratorControlToken string
	RequestShutdown          func(reason string)
}

func BuildAPIRouter(opts APIOptions) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Orchestrator-Token"},
		ExposedHeaders: []string{"Link"},
		MaxAge:         300,
	}))

	authH := handlers.NewAuthHandler(opts.AuthService, opts.UserRepo)
	adminH := handlers.NewAdminHandler(opts.UserRepo)
	paymentH := handlers.NewPaymentHandler(opts.PaymentService)
	strataAdminH := handlers.NewStrataAdminHandler(opts.StrataAdminSvc)
	preferencesH := handlers.NewPreferencesHandler(opts.PreferencesService)
	o2ulUsersH := handlers.NewO2ULUsersHandler(opts.O2ULUsersService)
	o2ulPreferencesH := handlers.NewO2ULPreferencesHandler(opts.O2ULPreferencesService)
	o2ulAuthSyncH := handlers.NewO2ULAuthSyncHandler(opts.O2ULAuthSyncService)
	o2ulFilesH := handlers.NewO2ULFilesHandler(opts.O2ULFilesService)
	o2ulWalletH := handlers.NewO2ULWalletHandler(opts.O2ULWalletService)
	o2ulPresenceH := handlers.NewO2ULPresenceHandler(opts.O2ULPresenceService)
	o2ulNotificationsH := handlers.NewO2ULNotificationsHandler(opts.O2ULNotificationsService)

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	if opts.RequestShutdown != nil {
		r.Post("/internal/shutdown", func(w http.ResponseWriter, r *http.Request) {
			if !HasControlTokenForRequest(r, opts.OrchestratorControlToken) {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}
			respondRouterJSON(w, http.StatusAccepted, map[string]any{"ok": true, "status": "shutdown_requested"})
			opts.RequestShutdown("orchestrator_control")
		})
	}

	r.Route("/api/v1", func(api chi.Router) {
		api.Post("/auth/register", authH.Register)
		api.Post("/auth/login", authH.Login)
		api.Post("/auth/forgot-password", authH.ForgotPassword)
		api.Post("/auth/reset-password", authH.ResetPassword)
		api.Post("/payments/webhook/{provider}", paymentH.Webhook)

		api.Group(func(protected chi.Router) {
			protected.Use(mw.RequireAuth(opts.TokenSvc))
			protected.Get("/auth/me", authH.Me)
			protected.Post("/auth/refresh", authH.Refresh)
			protected.Post("/auth/renew", authH.Refresh)
			protected.Post("/payments/checkout", paymentH.CreateCheckoutSession)
			protected.With(mw.RequireRole(domain.RoleModerator)).Patch("/admin/users/{id}/role", adminH.UpdateRole)
			if opts.PreferencesService != nil {
				protected.Get("/settings", preferencesH.GetSettings)
				protected.Put("/settings", preferencesH.UpdateSettings)
				protected.Get("/notifications/preferences", preferencesH.GetNotificationPreferences)
				protected.Put("/notifications/preferences", preferencesH.UpdateNotificationPreferences)
			}

			protected.Group(func(admin chi.Router) {
				admin.Use(mw.RequireRole(domain.RoleAdmin))
				admin.Get("/admin/users", adminH.ListUsers)
				admin.Get("/admin/strata/status", strataAdminH.Status)
			})

			if opts.O2ULUsersService != nil {
				protected.Get("/o2ul/users/viewer", o2ulUsersH.Viewer)
				protected.Get("/o2ul/users/current", o2ulUsersH.Current)
				protected.Get("/o2ul/users", o2ulUsersH.List)
				protected.Post("/o2ul/users/profiles:batch-get", o2ulUsersH.BatchGetProfiles)
				protected.Post("/o2ul/users/init", o2ulUsersH.Init)
				protected.Patch("/o2ul/users/profile", o2ulUsersH.UpdateProfile)
				protected.Patch("/o2ul/users/profile/background", o2ulUsersH.UpdateBackground)
				protected.Delete("/o2ul/users/platform/{platform}", o2ulUsersH.DeletePlatformData)
				protected.Post("/o2ul/auth/sync-profile", o2ulAuthSyncH.SyncProfile)
			}

			if opts.O2ULFilesService != nil {
				protected.Post("/o2ul/files/upload-url", o2ulFilesH.GenerateUploadURL)
				protected.Post("/o2ul/files", o2ulFilesH.AddFile)
				protected.Get("/o2ul/files/{id}/storage-id", o2ulFilesH.GetStorageID)
				protected.Get("/o2ul/files/{id}/url", o2ulFilesH.GetFileURL)
				protected.Get("/o2ul/files/by-md5/{hash}", o2ulFilesH.GetFileByMD5)
				protected.Delete("/o2ul/files/{id}", o2ulFilesH.RemoveFile)
			}

			if opts.O2ULWalletService != nil {
				protected.Post("/o2ul/wallet/spend/prove", o2ulWalletH.VerifyAuthorizeAndProve)
				protected.Post("/o2ul/wallet/notes/scan", o2ulWalletH.ScanNotes)
				protected.Post("/o2ul/wallet/transactions/build", o2ulWalletH.BuildSpendTransaction)
				protected.Post("/o2ul/wallet/transactions/sign", o2ulWalletH.SignTransaction)
				protected.Post("/o2ul/wallet/transactions/submit", o2ulWalletH.SubmitTransaction)
				protected.Post("/o2ul/wallet/transactions/status", o2ulWalletH.TransactionStatus)
			}

			if opts.O2ULPresenceService != nil {
				protected.Get("/o2ul/presence/me", o2ulPresenceH.GetPresence)
				protected.Patch("/o2ul/presence", o2ulPresenceH.UpdatePresence)
				protected.Post("/o2ul/presence/offline", o2ulPresenceH.SetOffline)
				protected.Get("/o2ul/presence/ccu", o2ulPresenceH.GetCCUMetrics)
			}

			if opts.O2ULNotificationsService != nil {
				protected.Get("/o2ul/notifications/subscriptions", o2ulNotificationsH.ListSubscriptions)
				protected.Post("/o2ul/notifications/subscriptions", o2ulNotificationsH.StoreSubscription)
				protected.Delete("/o2ul/notifications/subscriptions", o2ulNotificationsH.RemoveSubscription)
				protected.Post("/o2ul/notifications/pending", o2ulNotificationsH.CreateNotification)
				protected.Get("/o2ul/notifications/pending", o2ulNotificationsH.ListPending)
				protected.Patch("/o2ul/notifications/pending/{id}/status", o2ulNotificationsH.UpdateStatus)
			}

			if opts.O2ULPreferencesService != nil {
				protected.Patch("/o2ul/preferences/mode", o2ulPreferencesH.UpdateMode)
				protected.Patch("/o2ul/preferences/calling", o2ulPreferencesH.UpdateCallingState)
				protected.Patch("/o2ul/preferences/oauth-providers", o2ulPreferencesH.UpdateOAuthProviders)
			}
		})

		if opts.O2ULUsersService != nil {
			api.Get("/o2ul/users/{id}", o2ulUsersH.Get)
		}
		if opts.O2ULPreferencesService != nil {
			api.Get("/o2ul/preferences", o2ulPreferencesH.Get)
			api.Get("/o2ul/preferences/oauth-providers/{provider}/enabled", o2ulPreferencesH.IsOAuthProviderEnabled)
		}
	})
	return r
}

func HasControlTokenForRequest(r *http.Request, token string) bool {
	if strings.TrimSpace(token) == "" {
		return false
	}
	xToken := strings.TrimSpace(r.Header.Get("X-Orchestrator-Token"))
	if xToken != "" {
		return xToken == token
	}
	auth := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(auth, "Bearer ")) == token
	}
	return false
}

func respondRouterJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

type OrchestratorOptions struct {
	Handler *handlers.OrchestratorHandler
}

func BuildOrchestratorRouter(opts OrchestratorOptions) http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Orchestrator-Token"},
		ExposedHeaders: []string{"Link"},
		MaxAge:         300,
	}))

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Route("/api/v1", func(api chi.Router) {
		api.Post("/instances/spawn", opts.Handler.Spawn)
		api.Post("/instances/{id}/despawn", opts.Handler.Despawn)
		api.Get("/instances", opts.Handler.List)
		api.Post("/control/shutdown", opts.Handler.Shutdown)
		api.Post("/logs/ingest", opts.Handler.IngestLog)
		api.Get("/logs", opts.Handler.ListLogs)
	})

	return r
}
