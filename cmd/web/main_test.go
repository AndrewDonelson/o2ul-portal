package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestSecureHeaders(t *testing.T) {
	h := secureHeaders(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/", nil))
	if got := rr.Header().Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("missing nosniff header: %q", got)
	}
	if got := rr.Header().Get("Content-Security-Policy"); got == "" {
		t.Fatalf("missing CSP header")
	}
}

func TestStaticHandler(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("ok"), 0o600); err != nil {
		t.Fatalf("write index failed: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(dir, "assets"), 0o755); err != nil {
		t.Fatalf("mkdir assets failed: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "assets", "styles.css"), []byte("body{}"), 0o600); err != nil {
		t.Fatalf("write stylesheet failed: %v", err)
	}
	h, err := staticHandler(dir)
	if err != nil {
		t.Fatalf("staticHandler failed: %v", err)
	}

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if rr.Code != http.StatusOK {
		t.Fatalf("healthz status mismatch: %d", rr.Code)
	}
	if got := rr.Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("healthz cache-control mismatch: %q", got)
	}

	assetReq := httptest.NewRequest(http.MethodGet, "/assets/styles.css", nil)
	assetRR := httptest.NewRecorder()
	h.ServeHTTP(assetRR, assetReq)
	if got := assetRR.Header().Get("Cache-Control"); got != "public, max-age=31536000, immutable" {
		t.Fatalf("asset cache-control mismatch: %q", got)
	}

	gzipReq := httptest.NewRequest(http.MethodGet, "/", nil)
	gzipReq.Header.Set("Accept-Encoding", "gzip")
	gzipRR := httptest.NewRecorder()
	h.ServeHTTP(gzipRR, gzipReq)
	if got := gzipRR.Header().Get("Content-Encoding"); got != "gzip" {
		t.Fatalf("gzip content-encoding mismatch: %q", got)
	}

	if _, err := staticHandler(filepath.Join(dir, "missing")); err == nil {
		t.Fatalf("expected error for missing root")
	}
}
