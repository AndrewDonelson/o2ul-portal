package stripe

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"com.nlaak.backend-template/internal/domain/payment"
	"github.com/google/uuid"
)

type Provider struct {
	secretKey     string
	webhookSecret string
}

func NewProvider(secretKey, webhookSecret string) *Provider {
	return &Provider{secretKey: secretKey, webhookSecret: webhookSecret}
}

func (p *Provider) ProviderName() string {
	return string(payment.ProviderStripe)
}

func (p *Provider) CreateCheckoutSession(_ context.Context, req payment.CheckoutRequest) (payment.CheckoutSession, error) {
	if strings.TrimSpace(p.secretKey) == "" {
		return payment.CheckoutSession{}, errors.New("stripe secret key is not configured")
	}
	if req.Amount <= 0 {
		return payment.CheckoutSession{}, errors.New("amount must be > 0")
	}
	sessionID := "cs_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	return payment.CheckoutSession{
		Provider:    payment.ProviderStripe,
		SessionID:   sessionID,
		CheckoutURL: fmt.Sprintf("https://checkout.stripe.com/pay/%s", sessionID),
		ExpiresAt:   time.Now().UTC().Add(30 * time.Minute),
	}, nil
}

func (p *Provider) HandleWebhook(_ context.Context, payload []byte, signature string) (payment.WebhookResult, error) {
	if strings.TrimSpace(p.webhookSecret) == "" {
		return payment.WebhookResult{}, errors.New("stripe webhook secret is not configured")
	}
	if strings.TrimSpace(signature) == "" {
		return payment.WebhookResult{}, errors.New("missing stripe signature")
	}
	var event map[string]any
	if err := json.Unmarshal(payload, &event); err != nil {
		return payment.WebhookResult{}, err
	}
	eventID, _ := event["id"].(string)
	eventType, _ := event["type"].(string)
	if eventID == "" {
		eventID = "evt_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	}
	if eventType == "" {
		eventType = "unknown"
	}

	meta := map[string]string{}
	if playerID, ok := event["playerId"].(string); ok && playerID != "" {
		meta["playerId"] = playerID
	}
	if rawMeta, ok := event["metadata"].(map[string]any); ok {
		if playerID, ok := rawMeta["playerId"].(string); ok && playerID != "" {
			meta["playerId"] = playerID
		}
	}

	return payment.WebhookResult{
		Provider:  payment.ProviderStripe,
		EventID:   eventID,
		EventType: eventType,
		Accepted:  true,
		Metadata:  meta,
	}, nil
}
