package middleware

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
)

type tokenParserStub struct {
	claims application.TokenClaims
	err    error
}

func (s tokenParserStub) Parse(_ string) (application.TokenClaims, error) {
	if s.err != nil {
		return application.TokenClaims{}, s.err
	}
	return s.claims, nil
}

func TestRequireAuthRejectsMissingToken(t *testing.T) {
	h := RequireAuth(tokenParserStub{})(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestRequireAuthRejectsInvalidToken(t *testing.T) {
	h := RequireAuth(tokenParserStub{err: errors.New("bad token")})(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer bad")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestRequireRoleBoundaries(t *testing.T) {
	base := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	authClaims := application.TokenClaims{Role: domain.RoleModerator}
	h := RequireAuth(tokenParserStub{claims: authClaims})(RequireRole(domain.RoleAdmin)(base))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer valid")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for moderator->admin boundary, got %d", rr.Code)
	}

	hAdmin := RequireAuth(tokenParserStub{claims: application.TokenClaims{Role: domain.RoleAdmin}})(RequireRole(domain.RoleAdmin)(base))
	rr2 := httptest.NewRecorder()
	hAdmin.ServeHTTP(rr2, req)
	if rr2.Code != http.StatusOK {
		t.Fatalf("expected 200 for admin->admin boundary, got %d", rr2.Code)
	}
}
