package httpinfra

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
)

func TestInfoPanelEndpoints_E2E(t *testing.T) {
	repo := newAuthEndpointTestRepo()
	tokenSvc := NewJWTService("test-secret", time.Hour)
	authSvc := application.NewAuthService(repo, tokenSvc, authEndpointLog{})
	paymentSvc := application.NewPaymentService(authEndpointLog{})

	router := BuildAPIRouter(APIOptions{
		AuthService:    authSvc,
		PaymentService: paymentSvc,
		UserRepo:       repo,
		TokenSvc:       tokenSvc,
	})

	player, _, err := authSvc.Register(context.Background(), "info@example.com", "info-user", "secret", domain.RoleMember)
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}
	token, err := tokenSvc.Issue(player)
	if err != nil {
		t.Fatalf("issue token failed: %v", err)
	}

	t.Run("api health endpoint", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
	})

	t.Run("auth me endpoint", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
	})
}
