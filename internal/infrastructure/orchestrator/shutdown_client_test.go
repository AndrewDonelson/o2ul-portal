package orchestrator

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
)

func TestRequestManagedShutdown(t *testing.T) {
	t.Run("blank url is noop", func(t *testing.T) {
		if err := RequestManagedShutdown(context.Background(), "", "token", "reason"); err != nil {
			t.Fatalf("blank url should be noop: %v", err)
		}
	})

	t.Run("missing token is rejected", func(t *testing.T) {
		if err := RequestManagedShutdown(context.Background(), "http://example.com", "", "reason"); err == nil {
			t.Fatalf("expected missing token error")
		}
	})

	t.Run("non 2xx status returns error", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusForbidden)
		}))
		defer srv.Close()
		if err := RequestManagedShutdown(context.Background(), srv.URL, "token", "reason"); err == nil {
			t.Fatalf("expected error for non-2xx status")
		}
	})

	t.Run("success sends token and json body", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if got := r.Header.Get("X-Orchestrator-Token"); got != "token" {
				t.Fatalf("token mismatch: got=%q", got)
			}
			var payload map[string]any
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("decode body failed: %v", err)
			}
			if payload["reason"] != "test-reason" {
				t.Fatalf("reason mismatch: got=%v", payload["reason"])
			}
			w.WriteHeader(http.StatusAccepted)
		}))
		defer srv.Close()
		if err := RequestManagedShutdown(context.Background(), srv.URL, "token", "test-reason"); err != nil {
			t.Fatalf("unexpected shutdown request error: %v", err)
		}
	})

	t.Run("connection refused is treated as already stopped", func(t *testing.T) {
		ln, err := net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			t.Fatalf("listen failed: %v", err)
		}
		addr := ln.Addr().(*net.TCPAddr)
		_ = ln.Close()

		target := "http://127.0.0.1:" + strconv.Itoa(addr.Port) + "/internal/shutdown"
		if err := RequestManagedShutdown(context.Background(), target, "token", "reason"); err != nil {
			t.Fatalf("connection refused should be non-fatal: %v", err)
		}
	})
}
