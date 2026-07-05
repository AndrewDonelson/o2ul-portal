package steam

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
	publisherKey  string
	webAPIKey     string
	username      string
	loginPassword string
	appID         string
	webhookSecret string
}

func NewProvider(publisherKey, webAPIKey, username, loginPassword, appID, webhookSecret string) *Provider {
	return &Provider{
		publisherKey:  publisherKey,
		webAPIKey:     webAPIKey,
		username:      username,
		loginPassword: loginPassword,
		appID:         appID,
		webhookSecret: webhookSecret,
	}
}

func (p *Provider) ProviderName() string {
	return string(payment.ProviderSteam)
}

func (p *Provider) CreateCheckoutSession(_ context.Context, req payment.CheckoutRequest) (payment.CheckoutSession, error) {
	if strings.TrimSpace(p.appID) == "" {
		return payment.CheckoutSession{}, errors.New("steam app id is required")
	}
	if strings.TrimSpace(p.publisherKey) == "" && strings.TrimSpace(p.webAPIKey) == "" {
		return payment.CheckoutSession{}, errors.New("steam publisher key or steam web api key is required")
	}
	userSet := strings.TrimSpace(p.username) != ""
	passwordSet := strings.TrimSpace(p.loginPassword) != ""
	if userSet != passwordSet {
		return payment.CheckoutSession{}, errors.New("steam username and steam login password must both be set")
	}
	if req.Amount <= 0 {
		return payment.CheckoutSession{}, errors.New("amount must be > 0")
	}
	txnID := "steam_txn_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	return payment.CheckoutSession{
		Provider:    payment.ProviderSteam,
		SessionID:   txnID,
		CheckoutURL: fmt.Sprintf("steam://openurl/https://partner.steam-api.com/pay/%s?appId=%s", txnID, p.appID),
		ExpiresAt:   time.Now().UTC().Add(15 * time.Minute),
	}, nil
}

func (p *Provider) HandleWebhook(_ context.Context, payload []byte, signature string) (payment.WebhookResult, error) {
	if strings.TrimSpace(p.webhookSecret) == "" {
		return payment.WebhookResult{}, errors.New("steam webhook secret is not configured")
	}
	if strings.TrimSpace(signature) == "" {
		return payment.WebhookResult{}, errors.New("missing steam signature")
	}
	var evt map[string]any
	if err := json.Unmarshal(payload, &evt); err != nil {
		return payment.WebhookResult{}, err
	}
	eventID, _ := evt["eventId"].(string)
	eventType, _ := evt["type"].(string)
	if eventID == "" {
		eventID = "steam_evt_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	}
	if eventType == "" {
		eventType = "unknown"
	}

	meta := map[string]string{}
	if playerID, ok := evt["playerId"].(string); ok && playerID != "" {
		meta["playerId"] = playerID
	}
	if rawMeta, ok := evt["metadata"].(map[string]any); ok {
		if playerID, ok := rawMeta["playerId"].(string); ok && playerID != "" {
			meta["playerId"] = playerID
		}
	}

	return payment.WebhookResult{
		Provider:  payment.ProviderSteam,
		EventID:   eventID,
		EventType: eventType,
		Accepted:  true,
		Metadata:  meta,
	}, nil
}
