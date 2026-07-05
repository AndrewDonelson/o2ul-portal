package application

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"com.nlaak.backend-template/internal/domain"
)

type authTestRepo struct {
	users map[string]domain.Player
}

func newAuthTestRepo() *authTestRepo {
	return &authTestRepo{users: make(map[string]domain.Player)}
}

func (r *authTestRepo) Create(_ context.Context, player domain.Player) (domain.Player, error) {
	if _, exists := r.users[player.Email]; exists {
		return domain.Player{}, errors.New("duplicate")
	}
	r.users[player.Email] = player
	return player, nil
}

func (r *authTestRepo) ByEmail(_ context.Context, email string) (domain.Player, error) {
	p, ok := r.users[email]
	if !ok {
		return domain.Player{}, errors.New("not found")
	}
	return p, nil
}

func (r *authTestRepo) ByID(_ context.Context, id string) (domain.Player, error) {
	for _, p := range r.users {
		if p.ID == id {
			return p, nil
		}
	}
	return domain.Player{}, errors.New("not found")
}

func (r *authTestRepo) List(_ context.Context) ([]domain.Player, error) {
	out := make([]domain.Player, 0, len(r.users))
	for _, p := range r.users {
		out = append(out, p)
	}
	return out, nil
}

func (r *authTestRepo) UpdateRole(_ context.Context, id string, role domain.Role, updatedAt time.Time) error {
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

func (r *authTestRepo) UpdatePassword(_ context.Context, id string, passwordHash string, updatedAt time.Time) error {
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

type authTestToken struct{}

func (authTestToken) Issue(player domain.Player) (string, error) {
	return "token-for-" + player.ID, nil
}
func (authTestToken) Parse(_ string) (TokenClaims, error) { return TokenClaims{}, nil }

type authTestLog struct{}

func (authTestLog) Info(_ string, _ map[string]any)  {}
func (authTestLog) Error(_ string, _ map[string]any) {}

type authTestResetRepo struct {
	tokens map[string]domain.PasswordResetToken
}

func newAuthTestResetRepo() *authTestResetRepo {
	return &authTestResetRepo{tokens: map[string]domain.PasswordResetToken{}}
}

func (r *authTestResetRepo) Create(_ context.Context, token domain.PasswordResetToken) error {
	r.tokens[token.ID] = token
	return nil
}

func (r *authTestResetRepo) GetValidByHash(_ context.Context, tokenHash string, now time.Time) (domain.PasswordResetToken, error) {
	for _, token := range r.tokens {
		if token.TokenHash != tokenHash {
			continue
		}
		if token.Used || !token.ExpiresAt.After(now) {
			return domain.PasswordResetToken{}, ErrNotFound
		}
		return token, nil
	}
	return domain.PasswordResetToken{}, ErrNotFound
}

func (r *authTestResetRepo) MarkUsed(_ context.Context, id string, usedAt time.Time) error {
	token, ok := r.tokens[id]
	if !ok {
		return ErrNotFound
	}
	token.Used = true
	token.UsedAt = usedAt
	r.tokens[id] = token
	return nil
}

type authTestEmailSender struct {
	lastTo      string
	lastSubject string
	lastBody    string
}

func (s *authTestEmailSender) Send(_ context.Context, _ string, to, subject, body string) error {
	s.lastTo = to
	s.lastSubject = subject
	s.lastBody = body
	return nil
}

func TestAuthServiceRegisterAndLogin(t *testing.T) {
	repo := newAuthTestRepo()
	svc := NewAuthService(repo, authTestToken{}, authTestLog{})

	player, token, err := svc.Register(context.Background(), "USER@Example.com", "pilot1", "secret", domain.RoleMember)
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if token == "" {
		t.Fatalf("expected non-empty token")
	}
	if player.Email != "user@example.com" {
		t.Fatalf("email normalization failed: got %s", player.Email)
	}
	if player.PasswordHash == "secret" {
		t.Fatalf("password was not hashed")
	}

	_, loginToken, err := svc.Login(context.Background(), "user@example.com", "secret")
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}
	if loginToken == "" {
		t.Fatalf("expected login token")
	}
}

func TestAuthServiceLoginRejectsInvalidPassword(t *testing.T) {
	repo := newAuthTestRepo()
	svc := NewAuthService(repo, authTestToken{}, authTestLog{})
	_, _, err := svc.Register(context.Background(), "u@example.com", "pilot2", "secret", domain.RoleMember)
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if _, _, err := svc.Login(context.Background(), "u@example.com", "wrong"); err == nil {
		t.Fatalf("expected invalid credentials error")
	}
}

func TestAuthServiceForgotPassword(t *testing.T) {
	repo := newAuthTestRepo()
	svc := NewAuthService(repo, authTestToken{}, authTestLog{})

	if err := svc.ForgotPassword(context.Background(), ""); err == nil {
		t.Fatalf("expected email required error")
	}

	// Unknown email should still return nil to prevent account enumeration.
	if err := svc.ForgotPassword(context.Background(), "unknown@example.com"); err != nil {
		t.Fatalf("expected nil for unknown email, got %v", err)
	}

	_, _, err := svc.Register(context.Background(), "known@example.com", "pilot3", "secret", domain.RoleMember)
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}

	if err := svc.ForgotPassword(context.Background(), "known@example.com"); err != nil {
		t.Fatalf("expected nil for known email, got %v", err)
	}
}

func TestAuthServiceRefreshToken(t *testing.T) {
	repo := newAuthTestRepo()
	svc := NewAuthService(repo, authTestToken{}, authTestLog{})

	player, _, err := svc.Register(context.Background(), "refresh@example.com", "pilot4", "secret", domain.RoleMember)
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}

	refreshedPlayer, token, err := svc.RefreshToken(context.Background(), player.ID)
	if err != nil {
		t.Fatalf("refresh failed: %v", err)
	}
	if token == "" {
		t.Fatalf("expected refreshed token")
	}
	if refreshedPlayer.ID != player.ID {
		t.Fatalf("expected same player id, got %s", refreshedPlayer.ID)
	}

	if _, _, err := svc.RefreshToken(context.Background(), ""); err == nil {
		t.Fatalf("expected player id required error")
	}

	if _, _, err := svc.RefreshToken(context.Background(), "missing-player"); err == nil {
		t.Fatalf("expected invalid token subject error")
	}
}

func TestAuthServiceSMTPRequiredForRegisterAndForgotPassword(t *testing.T) {
	repo := newAuthTestRepo()
	svc := NewAuthService(repo, authTestToken{}, authTestLog{}).WithSMTPConfig("", "", "", "", "")

	if _, _, err := svc.Register(context.Background(), "user@example.com", "pilot5", "secret", domain.RoleRegistered); err == nil {
		t.Fatalf("expected smtp-required error for register")
	}

	if err := svc.ForgotPassword(context.Background(), "user@example.com"); err == nil {
		t.Fatalf("expected smtp-required error for forgot-password")
	}
}

func TestAuthServiceSMTPConfiguredAllowsRegisterAndForgotPassword(t *testing.T) {
	repo := newAuthTestRepo()
	resetRepo := newAuthTestResetRepo()
	emailSender := &authTestEmailSender{}
	svc := NewAuthService(repo, authTestToken{}, authTestLog{}).
		WithSMTPConfig("smtp.example.com", "587", "mailer", "secret", "noreply@example.com").
		WithPasswordReset(resetRepo, emailSender)

	if _, _, err := svc.Register(context.Background(), "user@example.com", "pilot6", "secret", domain.RoleRegistered); err != nil {
		t.Fatalf("register failed with smtp configured: %v", err)
	}

	if err := svc.ForgotPassword(context.Background(), "user@example.com"); err != nil {
		t.Fatalf("forgot-password failed with smtp configured: %v", err)
	}
	if emailSender.lastTo != "user@example.com" {
		t.Fatalf("expected reset email recipient, got %q", emailSender.lastTo)
	}
	if !strings.Contains(emailSender.lastSubject, "Password reset") {
		t.Fatalf("expected password reset subject, got %q", emailSender.lastSubject)
	}
	if !strings.Contains(emailSender.lastBody, "Token:") {
		t.Fatalf("expected token in reset body, got %q", emailSender.lastBody)
	}
}

func TestAuthServiceResetPasswordFlow(t *testing.T) {
	repo := newAuthTestRepo()
	resetRepo := newAuthTestResetRepo()
	emailSender := &authTestEmailSender{}
	svc := NewAuthService(repo, authTestToken{}, authTestLog{}).
		WithSMTPConfig("smtp.example.com", "587", "mailer", "secret", "noreply@example.com").
		WithPasswordReset(resetRepo, emailSender)

	_, _, err := svc.Register(context.Background(), "reset@example.com", "pilot7", "old-password", domain.RoleRegistered)
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}

	if err := svc.ForgotPassword(context.Background(), "reset@example.com"); err != nil {
		t.Fatalf("forgot-password failed: %v", err)
	}

	body := emailSender.lastBody
	start := strings.Index(body, "Token: ")
	if start < 0 {
		t.Fatalf("expected token marker in email body: %q", body)
	}
	line := strings.SplitN(body[start+len("Token: "):], "\n", 2)[0]
	rawToken := strings.TrimSpace(line)
	if rawToken == "" {
		t.Fatalf("expected non-empty reset token")
	}

	if err := svc.ResetPassword(context.Background(), rawToken, "new-password"); err != nil {
		t.Fatalf("reset password failed: %v", err)
	}

	if _, _, err := svc.Login(context.Background(), "reset@example.com", "new-password"); err != nil {
		t.Fatalf("login with new password failed: %v", err)
	}
	if _, _, err := svc.Login(context.Background(), "reset@example.com", "old-password"); err == nil {
		t.Fatalf("expected old password to stop working")
	}

	if err := svc.ResetPassword(context.Background(), rawToken, "another-password"); err == nil {
		t.Fatalf("expected used token to be rejected")
	}
}
