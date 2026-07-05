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

	"com.nlaak.backend-template/internal/infrastructure/config"
	httpinfra "com.nlaak.backend-template/internal/infrastructure/http"
	"com.nlaak.backend-template/internal/infrastructure/http/handlers"
	"com.nlaak.backend-template/internal/infrastructure/orchestrator"
	"com.nlaak.backend-template/internal/infrastructure/startup"
)

func waitForHealth(ctx context.Context, url string) error {
	if strings.TrimSpace(url) == "" {
		return nil
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	ticker := time.NewTicker(400 * time.Millisecond)
	defer ticker.Stop()
	for {
		resp, err := http.DefaultClient.Do(req)
		if err == nil {
			_ = resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				return nil
			}
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
		}
	}
}

func main() {
	startup.ConfigureProcessLogger("ORCHESTRATOR")

	cfg := config.LoadFor("ORCHESTRATOR")
	log.Printf("env source: %s", startup.EnvSourceForLog(cfg.EnvFilePath))

	pgProbeErr := startup.ProbePostgres(cfg.PostgresDSN, 2*time.Second)
	redisProbeErr := startup.ProbeRedis(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB, 2*time.Second)
	log.Printf("strata layers preflight: L1=active (in-memory), L2=%s addr=%s db=%d, L3=%s", startup.LayerStatusLabel(redisProbeErr), cfg.RedisAddr, cfg.RedisDB, startup.LayerStatusLabel(pgProbeErr))

	backend, err := orchestrator.BackendFromName(cfg.OrchestratorBackend)
	if err != nil {
		log.Fatalf("backend selection failed: %v", err)
	}
	manager := orchestrator.NewManager(backend)

	if cfg.ManagedStartupEnabled {
		startupCtx, startupCancel := context.WithTimeout(context.Background(), time.Duration(cfg.ManagedStartupTimeoutSeconds)*time.Second)
		if cfg.ManagedStartupTimeoutSeconds <= 0 {
			startupCtx, startupCancel = context.WithTimeout(context.Background(), 30*time.Second)
		}
		defer startupCancel()

		log.Printf("managed startup begin: backend=%s", cfg.OrchestratorBackend)
		apiInstance, err := manager.Spawn(startupCtx, cfg.ManagedAPIService, cfg.ManagedAPICommand, cfg.ManagedAPIArgs)
		if err != nil {
			log.Fatalf("managed startup failed: api spawn error: %v", err)
		}
		if err := waitForHealth(startupCtx, cfg.ManagedAPIHealthURL); err != nil {
			_ = manager.Despawn(context.Background(), apiInstance.ID)
			log.Fatalf("managed startup failed: api health check error: %v", err)
		}
		log.Printf("managed startup ok: service=api health=%s", cfg.ManagedAPIHealthURL)

		webInstance, err := manager.Spawn(startupCtx, cfg.ManagedWebService, cfg.ManagedWebCommand, cfg.ManagedWebArgs)
		if err != nil {
			_ = manager.Despawn(context.Background(), apiInstance.ID)
			log.Fatalf("managed startup failed: web spawn error: %v", err)
		}
		if err := waitForHealth(startupCtx, cfg.ManagedWebHealthURL); err != nil {
			_ = manager.Despawn(context.Background(), webInstance.ID)
			_ = manager.Despawn(context.Background(), apiInstance.ID)
			log.Fatalf("managed startup failed: web health check error: %v", err)
		}
		log.Printf("managed startup ok: service=web health=%s", cfg.ManagedWebHealthURL)
	}

	shutdownSignals := make(chan string, 1)
	requestShutdown := func(reason string) {
		select {
		case shutdownSignals <- reason:
		default:
		}
	}

	handler := handlers.NewOrchestratorHandler(manager, cfg.OrchestratorControlToken, requestShutdown)
	router := httpinfra.BuildOrchestratorRouter(httpinfra.OrchestratorOptions{Handler: handler})
	server := &http.Server{
		Addr:              cfg.OrchestratorAddr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	listener, err := net.Listen("tcp", cfg.OrchestratorAddr)
	if err != nil {
		log.Fatalf("server failed: listen %s: %v", cfg.OrchestratorAddr, err)
	}
	totalShutdownTimeout := time.Duration(cfg.ShutdownTimeoutSeconds) * time.Second
	phaseShutdownTimeout := time.Duration(cfg.ShutdownPhaseTimeoutSeconds) * time.Second
	if totalShutdownTimeout <= 0 {
		totalShutdownTimeout = 30 * time.Second
	}
	if phaseShutdownTimeout <= 0 {
		phaseShutdownTimeout = 10 * time.Second
	}

	var shutdownOnce sync.Once
	shutdownInitiated := make(chan struct{})
	shutdownDone := make(chan struct{})
	go func() {
		for reason := range shutdownSignals {
			shutdownOnce.Do(func() {
				close(shutdownInitiated)
				go func() {
					defer close(shutdownDone)
					shutdownCtx, cancel := context.WithTimeout(context.Background(), totalShutdownTimeout)
					defer cancel()

					shutdownTargets := []string{cfg.ManagedAPIShutdownURL, cfg.ManagedServerShutdownURL}
					phases := []startup.ShutdownPhase{
						{
							Name:    "despawn_managed_instances",
							Timeout: phaseShutdownTimeout,
							Run: func(ctx context.Context) error {
								instances := manager.List()
								failed := 0
								for _, inst := range instances {
									if err := manager.Despawn(ctx, inst.ID); err != nil {
										failed++
										log.Printf("despawn failed: id=%s err=%v", inst.ID, err)
									}
								}
								log.Printf("shutdown metrics: component=ORCHESTRATOR despawn_total=%d despawn_failed=%d", len(instances), failed)
								if failed > 0 {
									return fmt.Errorf("failed despawns: %d", failed)
								}
								return nil
							},
						},
					}

					for i, target := range shutdownTargets {
						trimmed := strings.TrimSpace(target)
						if trimmed == "" {
							continue
						}
						name := "request_managed_shutdown_" + strconv.Itoa(i+1)
						url := trimmed
						phases = append(phases, startup.ShutdownPhase{
							Name:    name,
							Timeout: phaseShutdownTimeout,
							Run: func(ctx context.Context) error {
								err := orchestrator.RequestManagedShutdown(ctx, url, cfg.OrchestratorControlToken, reason)
								if err != nil {
									return fmt.Errorf("target=%s: %w", url, err)
								}
								log.Printf("managed shutdown requested: target=%s", url)
								return nil
							},
						})
					}

					phases = append(phases, startup.ShutdownPhase{
						Name:    "drain_orchestrator_http",
						Timeout: phaseShutdownTimeout,
						Run: func(ctx context.Context) error {
							return server.Shutdown(ctx)
						},
					})

					if err := startup.RunShutdownPhases(shutdownCtx, "ORCHESTRATOR", reason, phases); err != nil {
						log.Printf("shutdown failed: component=ORCHESTRATOR error=%v", err)
					}
				}()
			})
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
	go func() {
		sig := <-sigCh
		requestShutdown("signal_" + sig.String())
	}()

	log.Printf("shutdown policy: component=ORCHESTRATOR timeout_seconds=%s phase_timeout_seconds=%s", strconv.Itoa(cfg.ShutdownTimeoutSeconds), strconv.Itoa(cfg.ShutdownPhaseTimeoutSeconds))
	log.Printf("started on %s using backend=%s", cfg.OrchestratorAddr, cfg.OrchestratorBackend)
	if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server failed: %v", err)
	}

	select {
	case <-shutdownInitiated:
		<-shutdownDone
	default:
	}
}
