package application

import (
	"context"
	"errors"
	"time"

	"com.nlaak.backend-template/internal/domain"
	"com.nlaak.backend-template/internal/domain/payment"
	"com.nlaak.backend-template/internal/infrastructure/orchestrator"
)

var ErrNotFound = errors.New("not found")

type UserRepository interface {
	Create(ctx context.Context, player domain.Player) (domain.Player, error)
	ByEmail(ctx context.Context, email string) (domain.Player, error)
	ByID(ctx context.Context, id string) (domain.Player, error)
	List(ctx context.Context) ([]domain.Player, error)
	UpdateRole(ctx context.Context, id string, role domain.Role, updatedAt time.Time) error
}

type PreferencesRepository interface {
	GetSettings(ctx context.Context, playerID string) (domain.UserSettings, error)
	UpsertSettings(ctx context.Context, settings domain.UserSettings) error
	GetNotificationPreferences(ctx context.Context, playerID string) (domain.NotificationPreferences, error)
	UpsertNotificationPreferences(ctx context.Context, prefs domain.NotificationPreferences) error
}

type TokenService interface {
	Issue(player domain.Player) (string, error)
	Parse(token string) (TokenClaims, error)
}

type TokenClaims struct {
	PlayerID  string      `json:"playerId"`
	Email     string      `json:"email"`
	Username  string      `json:"username"`
	Role      domain.Role `json:"role"`
	ExpiresAt int64       `json:"expiresAt"`
}

type LogSink interface {
	Info(msg string, fields map[string]any)
	Error(msg string, fields map[string]any)
}

type InstanceOrchestrator interface {
	Spawn(ctx context.Context, service, command string, args []string) (orchestrator.Instance, error)
	Despawn(ctx context.Context, id string) error
	List() []orchestrator.Instance
}

type PaymentProvider interface {
	ProviderName() string
	CreateCheckoutSession(ctx context.Context, req payment.CheckoutRequest) (payment.CheckoutSession, error)
	HandleWebhook(ctx context.Context, payload []byte, signature string) (payment.WebhookResult, error)
}

type PasswordResetRepository interface {
	Create(ctx context.Context, token domain.PasswordResetToken) error
	GetValidByHash(ctx context.Context, tokenHash string, now time.Time) (domain.PasswordResetToken, error)
	MarkUsed(ctx context.Context, id string, usedAt time.Time) error
}

type EmailSender interface {
	Send(ctx context.Context, from, to, subject, body string) error
}
