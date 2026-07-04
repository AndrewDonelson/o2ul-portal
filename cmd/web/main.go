package main

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"com.nlaak.backend-template/internal/infrastructure/config"
	httpinfra "com.nlaak.backend-template/internal/infrastructure/http"
	"com.nlaak.backend-template/internal/infrastructure/startup"
	"github.com/quic-go/quic-go/http3"
)

func secureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://localhost:8080 http://localhost:8090")
		next.ServeHTTP(w, r)
	})
}

func staticHandler(root string) (http.Handler, error) {
	cleanRoot := filepath.Clean(root)
	if _, err := os.Stat(cleanRoot); err != nil {
		return nil, fmt.Errorf("web root unavailable: %w", err)
	}
	fs := http.FileServer(http.Dir(cleanRoot))
	mux := http.NewServeMux()
	mux.Handle("/", fs)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	return secureHeaders(mux), nil
}

func main() {
	startup.ConfigureProcessLogger("WEB")
	cfg := config.LoadFor("WEB")
	log.Printf("env source: %s", startup.EnvSourceForLog(cfg.EnvFilePath))

	handler, err := staticHandler(cfg.WebRootDir)
	if err != nil {
		log.Fatalf("web handler init failed: %v", err)
	}

	server := &http.Server{
		Addr:              cfg.WebAddr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	var h3Server *http3.Server
	if cfg.WebEnableHTTP3 && strings.TrimSpace(cfg.WebTLSCertFile) != "" && strings.TrimSpace(cfg.WebTLSKeyFile) != "" {
		h3Server = &http3.Server{
			Addr:    cfg.WebAddr,
			Handler: handler,
			TLSConfig: &tls.Config{
				MinVersion: tls.VersionTLS13,
				NextProtos: []string{"h3", "h2", "http/1.1"},
			},
		}
	}

	var shutdownOnce sync.Once
	requestShutdown := func(reason string) {
		shutdownOnce.Do(func() {
			go func() {
				shutdownCtx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.ShutdownTimeoutSeconds)*time.Second)
				defer cancel()
				if cfg.ShutdownTimeoutSeconds <= 0 {
					shutdownCtx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
					defer cancel()
				}
				err := startup.RunShutdownPhases(shutdownCtx, "WEB", reason, []startup.ShutdownPhase{
					{
						Name:    "drain_web_http",
						Timeout: 10 * time.Second,
						Run: func(ctx context.Context) error {
							return server.Shutdown(ctx)
						},
					},
					{
						Name:    "drain_web_http3",
						Timeout: 10 * time.Second,
						Run: func(ctx context.Context) error {
							if h3Server == nil {
								return nil
							}
							return h3Server.Shutdown(ctx)
						},
					},
				})
				if err != nil {
					log.Printf("shutdown failed: component=WEB error=%v", err)
				}
			}()
		})
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
	go func() {
		sig := <-sigCh
		requestShutdown("signal_" + sig.String())
	}()

	if strings.TrimSpace(cfg.OrchestratorControlToken) != "" {
		mux := http.NewServeMux()
		mux.Handle("/", handler)
		mux.HandleFunc("/internal/shutdown", func(w http.ResponseWriter, r *http.Request) {
			if !httpinfra.HasControlTokenForRequest(r, cfg.OrchestratorControlToken) {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusAccepted)
			_, _ = w.Write([]byte(`{"ok":true,"status":"shutdown_requested"}`))
			requestShutdown("orchestrator_control")
		})
		handler = secureHeaders(mux)
		server.Handler = handler
		if h3Server != nil {
			h3Server.Handler = handler
		}
	}

	if h3Server != nil {
		go func() {
			if err := h3Server.ListenAndServeTLS(cfg.WebTLSCertFile, cfg.WebTLSKeyFile); err != nil && !errors.Is(err, http.ErrServerClosed) {
				log.Printf("http3 server failed: %v", err)
			}
		}()
		log.Printf("http/3 enabled: addr=%s", cfg.WebAddr)
	} else if cfg.WebEnableHTTP3 {
		log.Printf("http/3 disabled: tls cert/key not configured")
	}

	log.Printf("started on %s root=%s", cfg.WebAddr, cfg.WebRootDir)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server failed: %v", err)
	}
}
