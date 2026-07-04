package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestWaitForHealth(t *testing.T) {
	t.Run("blank url is noop", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		if err := waitForHealth(ctx, ""); err != nil {
			t.Fatalf("blank url should be noop: %v", err)
		}
	})

	t.Run("healthy endpoint succeeds", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))
		defer srv.Close()
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		if err := waitForHealth(ctx, srv.URL); err != nil {
			t.Fatalf("expected health success: %v", err)
		}
	})

	t.Run("context timeout propagates", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusServiceUnavailable)
		}))
		defer srv.Close()
		ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
		defer cancel()
		if err := waitForHealth(ctx, srv.URL); err == nil {
			t.Fatalf("expected timeout error")
		}
	})
}
