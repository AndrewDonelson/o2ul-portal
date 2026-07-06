package main

import (
	"compress/gzip"
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/infrastructure/config"
	httpinfra "com.nlaak.backend-template/internal/infrastructure/http"
	"com.nlaak.backend-template/internal/infrastructure/imageopt"
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

func cacheControl(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		switch {
		case path == "/healthz" || path == "/internal/shutdown":
			w.Header().Set("Cache-Control", "no-store")
		case strings.HasPrefix(path, "/assets/") ||
			strings.HasPrefix(path, "/dist/") ||
			strings.HasPrefix(path, "/images/") ||
			strings.HasPrefix(path, "/json/") ||
			strings.HasPrefix(path, "/themes/") ||
			path == "/favicon.svg" ||
			path == "/manifest.webmanifest":
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		case path == "/" || strings.HasSuffix(path, ".html"):
			w.Header().Set("Cache-Control", "public, max-age=300")
		}

		next.ServeHTTP(w, r)
	})
}

type gzipResponseWriter struct {
	http.ResponseWriter
	Writer io.Writer
}

func (g gzipResponseWriter) Write(p []byte) (int, error) {
	return g.Writer.Write(p)
}

func compression(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			next.ServeHTTP(w, r)
			return
		}
		if r.Header.Get("Range") != "" {
			next.ServeHTTP(w, r)
			return
		}
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		path := r.URL.Path
		compressible := path == "/" ||
			strings.HasSuffix(path, ".html") ||
			strings.HasSuffix(path, ".css") ||
			strings.HasSuffix(path, ".js") ||
			strings.HasSuffix(path, ".svg") ||
			strings.HasSuffix(path, ".json") ||
			strings.HasSuffix(path, ".webmanifest") ||
			strings.HasSuffix(path, ".txt")
		if !compressible {
			next.ServeHTTP(w, r)
			return
		}

		w.Header().Add("Vary", "Accept-Encoding")
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Del("Content-Length")

		gzipWriter := gzip.NewWriter(w)
		defer gzipWriter.Close()

		next.ServeHTTP(gzipResponseWriter{ResponseWriter: w, Writer: gzipWriter}, r)
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
	return secureHeaders(cacheControl(compression(mux))), nil
}

func main() {
	startup.ConfigureProcessLogger("WEB")
	cfg := config.LoadFor("WEB")
	log.Printf("env source: %s", startup.EnvSourceForLog(cfg.EnvFilePath))
	if cfg.WebImageOptimizationEnabled {
		optCtx, optCancel := context.WithTimeout(context.Background(), time.Duration(cfg.WebImageOptimizationTimeout)*time.Second)
		if cfg.WebImageOptimizationTimeout <= 0 {
			optCtx, optCancel = context.WithTimeout(context.Background(), 20*time.Second)
		}
		defer optCancel()

		var optimizer application.ImageOptimizer = imageopt.NewOptimizer()
		res, err := optimizer.Optimize(optCtx, application.ImageOptimizationRequest{
			RootDir:      cfg.WebRootDir,
			Mode:         cfg.WebImageOptimizationMode,
			ManifestPath: cfg.WebImageOptimizationManifest,
		})
		log.Printf("image optimization startup: configured_mode=%s effective_mode=%s manifest=%s root=%s timeout_seconds=%d", cfg.WebImageOptimizationMode, res.EffectiveMode, res.ManifestPath, cfg.WebRootDir, cfg.WebImageOptimizationTimeout)
		if err != nil {
			log.Printf("image optimization skipped: mode=%s root=%s err=%v", cfg.WebImageOptimizationMode, cfg.WebRootDir, err)
		} else {
			log.Printf("image optimization: mode=%s scanned=%d optimized=%d skipped=%d failed=%d bytes_before=%d bytes_after=%d", cfg.WebImageOptimizationMode, res.Scanned, res.Optimized, res.Skipped, res.Failed, res.BytesBefore, res.BytesAfter)
		}
		for _, f := range res.Files {
			if f.Error != "" {
				log.Printf("image optimization file: %s before %s, after %s change %s status=%s err=%s", f.Path, formatBytes(f.BytesBefore), formatBytes(f.BytesAfter), formatChangePercent(f.BytesBefore, f.BytesAfter), f.Status, f.Error)
				continue
			}
			log.Printf("image optimization file: %s before %s, after %s change %s status=%s", f.Path, formatBytes(f.BytesBefore), formatBytes(f.BytesAfter), formatChangePercent(f.BytesBefore, f.BytesAfter), f.Status)
		}
	}

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

func formatBytes(v int64) string {
	if v < 1024 {
		return fmt.Sprintf("%dB", v)
	}
	if v < 1024*1024 {
		return fmt.Sprintf("%.1fKB", float64(v)/1024.0)
	}
	return fmt.Sprintf("%.1fMB", float64(v)/(1024.0*1024.0))
}

func formatChangePercent(before, after int64) string {
	if before <= 0 {
		return "0%"
	}
	pct := (float64(before-after) / float64(before)) * 100.0
	return fmt.Sprintf("%.0f%%", pct)
}
