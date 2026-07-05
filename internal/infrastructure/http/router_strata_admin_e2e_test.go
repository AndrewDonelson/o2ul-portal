package httpinfra

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
)

type strataStatusSvcStub struct {
	status application.StrataStatus
	err    error
}

func (s strataStatusSvcStub) Status(_ context.Context) (application.StrataStatus, error) {
	if s.err != nil {
		return application.StrataStatus{}, s.err
	}
	return s.status, nil
}

func TestStrataAdminStatusEndpoint_AdminOnly(t *testing.T) {
	repo := newPaymentTestRepo()
	tokenSvc := NewJWTService("test-secret", time.Hour)
	authSvc := application.NewAuthService(repo, tokenSvc, paymentTestLog{})
	paymentSvc := application.NewPaymentService(paymentTestLog{}, &paymentProviderStub{name: "stripe"}, &paymentProviderStub{name: "steam"})
	strataSvc := strataStatusSvcStub{status: application.StrataStatus{Gets: 11, Sets: 22, DirtyCount: 3, L1Entries: 9, MigrationCount: 1}}

	router := BuildAPIRouter(APIOptions{
		AuthService:    authSvc,
		PaymentService: paymentSvc,
		StrataAdminSvc: strataSvc,
		UserRepo:       repo,
		TokenSvc:       tokenSvc,
	})

	adminToken, err := tokenSvc.Issue(domain.Player{ID: "a1", Email: "a@example.com", Username: "admin", Role: domain.RoleAdmin})
	if err != nil {
		t.Fatalf("issue admin token failed: %v", err)
	}
	modToken, err := tokenSvc.Issue(domain.Player{ID: "m1", Email: "m@example.com", Username: "mod", Role: domain.RoleModerator})
	if err != nil {
		t.Fatalf("issue moderator token failed: %v", err)
	}

	t.Run("admin can read", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/strata/status", nil)
		req.Header.Set("Authorization", "Bearer "+adminToken)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
	})

	t.Run("non-admin forbidden", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/strata/status", nil)
		req.Header.Set("Authorization", "Bearer "+modToken)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", rr.Code)
		}
	})
}

func TestStrataAdminStatusEndpoint_ServiceError(t *testing.T) {
	repo := newPaymentTestRepo()
	tokenSvc := NewJWTService("test-secret", time.Hour)
	authSvc := application.NewAuthService(repo, tokenSvc, paymentTestLog{})
	paymentSvc := application.NewPaymentService(paymentTestLog{}, &paymentProviderStub{name: "stripe"}, &paymentProviderStub{name: "steam"})
	strataSvc := strataStatusSvcStub{err: errors.New("status failed")}

	router := BuildAPIRouter(APIOptions{
		AuthService:    authSvc,
		PaymentService: paymentSvc,
		StrataAdminSvc: strataSvc,
		UserRepo:       repo,
		TokenSvc:       tokenSvc,
	})

	adminToken, err := tokenSvc.Issue(domain.Player{ID: "a1", Email: "a@example.com", Username: "admin", Role: domain.RoleAdmin})
	if err != nil {
		t.Fatalf("issue admin token failed: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/strata/status", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)
	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rr.Code)
	}
}
