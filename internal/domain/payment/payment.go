package payment

import "time"

type Provider string

const (
	ProviderStripe Provider = "stripe"
	ProviderSteam  Provider = "steam"
)

type CheckoutRequest struct {
	Provider  Provider          `json:"provider"`
	PlayerID  string            `json:"playerId"`
	Email     string            `json:"email"`
	ProductID string            `json:"productId"`
	Currency  string            `json:"currency"`
	Amount    int64             `json:"amount"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}

type CheckoutSession struct {
	Provider    Provider  `json:"provider"`
	SessionID   string    `json:"sessionId"`
	CheckoutURL string    `json:"checkoutUrl"`
	ExpiresAt   time.Time `json:"expiresAt"`
}

type WebhookResult struct {
	Provider  Provider          `json:"provider"`
	EventID   string            `json:"eventId"`
	EventType string            `json:"eventType"`
	Accepted  bool              `json:"accepted"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}
