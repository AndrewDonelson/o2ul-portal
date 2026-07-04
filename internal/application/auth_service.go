package application

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"com.nlaak.backend-template/internal/domain"
	"github.com/google/uuid"
)

type AuthService struct {
	repo          UserRepository
	token         TokenService
	logs          LogSink
	resetRepo     PasswordResetRepository
	emailSender   EmailSender
	enforceSMTP   bool
	smtpHost      string
	smtpPort      string
	smtpUsername  string
	smtpPassword  string
	smtpFromEmail string
	resetTokenTTL time.Duration
	now           func() time.Time
}

func NewAuthService(repo UserRepository, token TokenService, logs LogSink) *AuthService {
	return &AuthService{
		repo:          repo,
		token:         token,
		logs:          logs,
		resetTokenTTL: 30 * time.Minute,
		now: func() time.Time {
			return time.Now().UTC()
		},
	}
}

func (s *AuthService) WithPasswordReset(resetRepo PasswordResetRepository, emailSender EmailSender) *AuthService {
	s.resetRepo = resetRepo
	s.emailSender = emailSender
	return s
}

func (s *AuthService) WithPasswordResetTokenTTL(ttl time.Duration) *AuthService {
	if ttl > 0 {
		s.resetTokenTTL = ttl
	}
	return s
}

func (s *AuthService) WithSMTPConfig(host, port, username, password, from string) *AuthService {
	s.enforceSMTP = true
	s.smtpHost = strings.TrimSpace(host)
	s.smtpPort = strings.TrimSpace(port)
	s.smtpUsername = strings.TrimSpace(username)
	s.smtpPassword = password
	s.smtpFromEmail = strings.TrimSpace(from)
	return s
}

func (s *AuthService) validateSMTPConfig() error {
	if !s.enforceSMTP {
		return nil
	}

	missing := make([]string, 0, 5)
	if s.smtpHost == "" {
		missing = append(missing, "SMTP_HOST")
	}
	if s.smtpPort == "" {
		missing = append(missing, "SMTP_PORT")
	}
	if s.smtpUsername == "" {
		missing = append(missing, "SMTP_USERNAME")
	}
	if strings.TrimSpace(s.smtpPassword) == "" {
		missing = append(missing, "SMTP_PASSWORD")
	}
	if s.smtpFromEmail == "" {
		missing = append(missing, "SMTP_FROM")
	}
	if len(missing) > 0 {
		return fmt.Errorf("smtp config required for auth flows: missing %s", strings.Join(missing, ", "))
	}
	return nil
}

func (s *AuthService) validatePasswordResetDependencies() error {
	if !s.enforceSMTP {
		return nil
	}
	if s.resetRepo == nil || s.emailSender == nil {
		return errors.New("password reset dependencies are not configured")
	}
	return nil
}

func (s *AuthService) Register(ctx context.Context, email, username, password string, role domain.Role) (domain.Player, string, error) {
	if err := s.validateSMTPConfig(); err != nil {
		return domain.Player{}, "", err
	}

	normEmail := strings.ToLower(strings.TrimSpace(email))
	normUser := strings.TrimSpace(username)
	if normEmail == "" || normUser == "" || password == "" {
		return domain.Player{}, "", errors.New("email, username, and password are required")
	}
	if role == "" {
		role = domain.RoleRegistered
	}
	role = domain.NormalizeRole(role)
	if !domain.IsValidRole(role) {
		return domain.Player{}, "", errors.New("invalid role")
	}
	hash, err := domain.HashPassword(password)
	if err != nil {
		return domain.Player{}, "", err
	}
	now := time.Now().UTC()
	player := domain.Player{
		ID:           uuid.NewString(),
		Email:        normEmail,
		Username:     normUser,
		PasswordHash: hash,
		Role:         role,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	created, err := s.repo.Create(ctx, player)
	if err != nil {
		return domain.Player{}, "", err
	}
	tkn, err := s.token.Issue(created)
	if err != nil {
		return domain.Player{}, "", err
	}
	s.logs.Info("player_registered", map[string]any{"playerId": created.ID, "role": created.Role})
	return created, tkn, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (domain.Player, string, error) {
	player, err := s.repo.ByEmail(ctx, strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		return domain.Player{}, "", errors.New("invalid credentials")
	}
	if !domain.VerifyPassword(player.PasswordHash, password) {
		return domain.Player{}, "", errors.New("invalid credentials")
	}
	tkn, err := s.token.Issue(player)
	if err != nil {
		return domain.Player{}, "", err
	}
	s.logs.Info("player_logged_in", map[string]any{"playerId": player.ID})
	return player, tkn, nil
}

func (s *AuthService) ForgotPassword(ctx context.Context, email string) error {
	if err := s.validateSMTPConfig(); err != nil {
		return err
	}
	if err := s.validatePasswordResetDependencies(); err != nil {
		return err
	}

	normEmail := strings.ToLower(strings.TrimSpace(email))
	if normEmail == "" {
		return errors.New("email is required")
	}

	player, err := s.repo.ByEmail(ctx, normEmail)
	if err != nil {
		// Avoid user enumeration. Always act like the request was accepted.
		s.logs.Info("password_reset_requested", map[string]any{"email": normEmail, "found": false})
		return nil
	}
	if s.resetRepo == nil || s.emailSender == nil {
		s.logs.Info("password_reset_requested", map[string]any{"playerId": player.ID, "found": true, "delivery": "disabled"})
		return nil
	}

	rawToken, err := generateResetToken()
	if err != nil {
		return err
	}
	now := s.now()
	resetToken := domain.PasswordResetToken{
		ID:        uuid.NewString(),
		PlayerID:  player.ID,
		TokenHash: hashResetToken(rawToken),
		ExpiresAt: now.Add(s.resetTokenTTL),
		CreatedAt: now,
	}
	if err := s.resetRepo.Create(ctx, resetToken); err != nil {
		return err
	}

	body := fmt.Sprintf("Use this reset token to set a new password. Token: %s\nExpiresAt: %s", rawToken, resetToken.ExpiresAt.Format(time.RFC3339))
	if err := s.emailSender.Send(ctx, s.smtpFromEmail, player.Email, "Password reset request", body); err != nil {
		return err
	}

	s.logs.Info("password_reset_requested", map[string]any{"playerId": player.ID, "found": true})
	return nil
}

type passwordUpdater interface {
	UpdatePassword(ctx context.Context, id string, passwordHash string, updatedAt time.Time) error
}

func (s *AuthService) ResetPassword(ctx context.Context, rawToken, newPassword string) error {
	if strings.TrimSpace(rawToken) == "" || strings.TrimSpace(newPassword) == "" {
		return errors.New("token and password are required")
	}
	if err := s.validatePasswordResetDependencies(); err != nil {
		return err
	}
	if s.resetRepo == nil || s.emailSender == nil {
		return errors.New("password reset dependencies are not configured")
	}
	if s.repo == nil {
		return errors.New("user repository is not configured")
	}
	if err := s.validateSMTPConfig(); err != nil {
		return err
	}

	resetToken, err := s.resetRepo.GetValidByHash(ctx, hashResetToken(rawToken), s.now())
	if err != nil {
		return errors.New("invalid or expired reset token")
	}

	updater, ok := s.repo.(passwordUpdater)
	if !ok {
		return errors.New("password updates are not supported by repository")
	}

	hash, err := domain.HashPassword(newPassword)
	if err != nil {
		return err
	}
	now := s.now()
	if err := updater.UpdatePassword(ctx, resetToken.PlayerID, hash, now); err != nil {
		return err
	}
	if err := s.resetRepo.MarkUsed(ctx, resetToken.ID, now); err != nil {
		return err
	}

	s.logs.Info("password_reset_completed", map[string]any{"playerId": resetToken.PlayerID})
	return nil
}

func (s *AuthService) RefreshToken(ctx context.Context, playerID string) (domain.Player, string, error) {
	if strings.TrimSpace(playerID) == "" {
		return domain.Player{}, "", errors.New("player id is required")
	}

	player, err := s.repo.ByID(ctx, playerID)
	if err != nil {
		return domain.Player{}, "", errors.New("invalid token subject")
	}

	tkn, err := s.token.Issue(player)
	if err != nil {
		return domain.Player{}, "", err
	}

	s.logs.Info("auth_token_refreshed", map[string]any{"playerId": player.ID})
	return player, tkn, nil
}

func generateResetToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func hashResetToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
