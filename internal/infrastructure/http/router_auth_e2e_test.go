package httpinfra

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
)

type authEndpointTestRepo struct {
	users map[string]domain.Player
}

func newAuthEndpointTestRepo() *authEndpointTestRepo {
	return &authEndpointTestRepo{users: map[string]domain.Player{}}
}

func (r *authEndpointTestRepo) Create(_ context.Context, player domain.Player) (domain.Player, error) {
	r.users[player.Email] = player
	return player, nil
}

func (r *authEndpointTestRepo) ByEmail(_ context.Context, email string) (domain.Player, error) {
	p, ok := r.users[email]
	if !ok {
		return domain.Player{}, errors.New("not found")
	}
	return p, nil
}

func (r *authEndpointTestRepo) ByID(_ context.Context, id string) (domain.Player, error) {
	for _, p := range r.users {
		if p.ID == id {
			return p, nil
		}
	}
	return domain.Player{}, errors.New("not found")
}

func (r *authEndpointTestRepo) List(_ context.Context) ([]domain.Player, error) {
	out := make([]domain.Player, 0, len(r.users))
	for _, p := range r.users {
		out = append(out, p)
	}
	return out, nil
}

func (r *authEndpointTestRepo) UpdateRole(_ context.Context, id string, role domain.Role, updatedAt time.Time) error {
	for email, p := range r.users {
		if p.ID == id {
			p.Role = role
			p.UpdatedAt = updatedAt
			r.users[email] = p
			return nil
		}
	}
	return errors.New("not found")
}

func (r *authEndpointTestRepo) UpdatePassword(_ context.Context, id string, passwordHash string, updatedAt time.Time) error {
	for email, p := range r.users {
		if p.ID == id {
			p.PasswordHash = passwordHash
			p.UpdatedAt = updatedAt
			r.users[email] = p
			return nil
		}
	}
	return errors.New("not found")
}

type authEndpointLog struct{}

func (authEndpointLog) Info(_ string, _ map[string]any)  {}
func (authEndpointLog) Error(_ string, _ map[string]any) {}

type authEndpointResetRepo struct {
	tokens map[string]domain.PasswordResetToken
}

func newAuthEndpointResetRepo() *authEndpointResetRepo {
	return &authEndpointResetRepo{tokens: map[string]domain.PasswordResetToken{}}
}

func (r *authEndpointResetRepo) Create(_ context.Context, token domain.PasswordResetToken) error {
	r.tokens[token.ID] = token
	return nil
}

func (r *authEndpointResetRepo) GetValidByHash(_ context.Context, tokenHash string, now time.Time) (domain.PasswordResetToken, error) {
	for _, token := range r.tokens {
		if token.TokenHash != tokenHash {
			continue
		}
		if token.Used || !token.ExpiresAt.After(now) {
			return domain.PasswordResetToken{}, application.ErrNotFound
		}
		return token, nil
	}
	return domain.PasswordResetToken{}, application.ErrNotFound
}

func (r *authEndpointResetRepo) MarkUsed(_ context.Context, id string, usedAt time.Time) error {
	token, ok := r.tokens[id]
	if !ok {
		return application.ErrNotFound
	}
	token.Used = true
	token.UsedAt = usedAt
	r.tokens[id] = token
	return nil
}

type authEndpointEmailSender struct {
	lastBody string
}

func (s *authEndpointEmailSender) Send(_ context.Context, _ string, _ string, _ string, body string) error {
	s.lastBody = body
	return nil
}

func TestForgotPasswordEndpoint(t *testing.T) {
	repo := newAuthEndpointTestRepo()
	resetRepo := newAuthEndpointResetRepo()
	emailSender := &authEndpointEmailSender{}
	tokenSvc := NewJWTService("test-secret", time.Hour)
	authSvc := application.NewAuthService(repo, tokenSvc, authEndpointLog{}).
		WithSMTPConfig("smtp.example.com", "587", "mailer", "secret", "noreply@example.com").
		WithPasswordReset(resetRepo, emailSender)
	paymentSvc := application.NewPaymentService(authEndpointLog{})

	router := BuildAPIRouter(APIOptions{
		AuthService:    authSvc,
		PaymentService: paymentSvc,
		UserRepo:       repo,
		TokenSvc:       tokenSvc,
	})

	t.Run("accepted for known email", func(t *testing.T) {
		_, _, err := authSvc.Register(context.Background(), "known@example.com", "pilot", "secret", domain.RoleMember)
		if err != nil {
			t.Fatalf("register failed: %v", err)
		}

		payload, _ := json.Marshal(map[string]string{"email": "known@example.com"})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusAccepted {
			t.Fatalf("expected 202, got %d body=%s", rr.Code, rr.Body.String())
		}
	})

	t.Run("accepted for unknown email", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]string{"email": "missing@example.com"})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusAccepted {
			t.Fatalf("expected 202, got %d body=%s", rr.Code, rr.Body.String())
		}
	})

	t.Run("bad request for empty email", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]string{"email": ""})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
		}
	})

	t.Run("reset-password works with token", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]string{"email": "known@example.com"})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/forgot-password", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusAccepted {
			t.Fatalf("expected 202, got %d body=%s", rr.Code, rr.Body.String())
		}

		marker := "Token: "
		idx := strings.Index(emailSender.lastBody, marker)
		if idx < 0 {
			t.Fatalf("expected token marker in email body: %q", emailSender.lastBody)
		}
		tokenLine := strings.SplitN(emailSender.lastBody[idx+len(marker):], "\n", 2)[0]
		rawToken := strings.TrimSpace(tokenLine)

		resetPayload, _ := json.Marshal(map[string]string{"token": rawToken, "password": "new-secret"})
		resetReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/reset-password", bytes.NewReader(resetPayload))
		resetReq.Header.Set("Content-Type", "application/json")
		resetRR := httptest.NewRecorder()
		router.ServeHTTP(resetRR, resetReq)
		if resetRR.Code != http.StatusAccepted {
			t.Fatalf("expected 202 reset, got %d body=%s", resetRR.Code, resetRR.Body.String())
		}

		loginPayload, _ := json.Marshal(map[string]string{"email": "known@example.com", "password": "new-secret"})
		loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(loginPayload))
		loginReq.Header.Set("Content-Type", "application/json")
		loginRR := httptest.NewRecorder()
		router.ServeHTTP(loginRR, loginReq)
		if loginRR.Code != http.StatusOK {
			t.Fatalf("expected 200 login with new password, got %d body=%s", loginRR.Code, loginRR.Body.String())
		}
	})
}

func TestRefreshEndpoint(t *testing.T) {
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

	player, _, err := authSvc.Register(context.Background(), "refresh@example.com", "pilot-refresh", "secret", domain.RoleMember)
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}

	t.Run("requires auth", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d body=%s", rr.Code, rr.Body.String())
		}
	})

	t.Run("refresh returns new token", func(t *testing.T) {
		token, err := tokenSvc.Issue(player)
		if err != nil {
			t.Fatalf("issue token failed: %v", err)
		}

		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}

		var out map[string]any
		if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
			t.Fatalf("unmarshal response failed: %v", err)
		}
		if out["token"] == "" {
			t.Fatalf("expected token in response")
		}
	})

	t.Run("renew alias works", func(t *testing.T) {
		token, err := tokenSvc.Issue(player)
		if err != nil {
			t.Fatalf("issue token failed: %v", err)
		}

		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/renew", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
	})
}

func TestRegisterRolePolicy(t *testing.T) {
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

	t.Run("registered is accepted", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]string{
			"email":    "registered@example.com",
			"username": "registered",
			"password": "secret",
			"role":     "registered",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusCreated {
			t.Fatalf("expected 201, got %d body=%s", rr.Code, rr.Body.String())
		}
	})

	t.Run("subscriber is rejected", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]string{
			"email":    "subscriber@example.com",
			"username": "subscriber",
			"password": "secret",
			"role":     "subscriber",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
		}
	})
}
