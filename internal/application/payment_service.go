package application

import (
	"context"
	"errors"
	"time"

	"com.nlaak.backend-template/internal/domain"
	"com.nlaak.backend-template/internal/domain/payment"
)

type PaymentService struct {
	providers map[payment.Provider]PaymentProvider
	logs      LogSink
	users     UserRepository
}

func NewPaymentService(logs LogSink, providers ...PaymentProvider) *PaymentService {
	mapped := make(map[payment.Provider]PaymentProvider, len(providers))
	for _, p := range providers {
		mapped[payment.Provider(p.ProviderName())] = p
	}
	return &PaymentService{providers: mapped, logs: logs}
}

func (s *PaymentService) WithUserRepository(users UserRepository) *PaymentService {
	s.users = users
	return s
}

func (s *PaymentService) CreateCheckoutSession(ctx context.Context, req payment.CheckoutRequest) (payment.CheckoutSession, error) {
	provider, ok := s.providers[req.Provider]
	if !ok {
		return payment.CheckoutSession{}, errors.New("unsupported payment provider")
	}
	out, err := provider.CreateCheckoutSession(ctx, req)
	if err != nil {
		s.logs.Error("payment_checkout_failed", map[string]any{"provider": req.Provider, "playerId": req.PlayerID, "error": err.Error()})
		return payment.CheckoutSession{}, err
	}
	s.logs.Info("payment_checkout_created", map[string]any{"provider": req.Provider, "playerId": req.PlayerID, "sessionId": out.SessionID})
	return out, nil
}

func (s *PaymentService) HandleWebhook(ctx context.Context, providerName payment.Provider, payload []byte, signature string) (payment.WebhookResult, error) {
	provider, ok := s.providers[providerName]
	if !ok {
		return payment.WebhookResult{}, errors.New("unsupported payment provider")
	}
	out, err := provider.HandleWebhook(ctx, payload, signature)
	if err != nil {
		s.logs.Error("payment_webhook_failed", map[string]any{"provider": providerName, "error": err.Error()})
		return payment.WebhookResult{}, err
	}
	if out.Accepted {
		s.promoteSubscriberIfEligible(ctx, out)
	}
	s.logs.Info("payment_webhook_processed", map[string]any{"provider": providerName, "eventId": out.EventID, "eventType": out.EventType})
	return out, nil
}

func (s *PaymentService) promoteSubscriberIfEligible(ctx context.Context, out payment.WebhookResult) {
	if s.users == nil {
		return
	}
	playerID := resolvePlayerID(out.Metadata)
	if playerID == "" {
		return
	}

	player, err := s.users.ByID(ctx, playerID)
	if err != nil {
		s.logs.Error("payment_role_promotion_failed", map[string]any{"playerId": playerID, "error": err.Error()})
		return
	}

	currentRole := domain.NormalizeRole(player.Role)
	if !domain.IsRegisteredUser(currentRole) {
		s.logs.Error("payment_role_promotion_rejected", map[string]any{"playerId": playerID, "reason": "target_not_registered"})
		return
	}
	if currentRole == domain.RoleSubscriber {
		return
	}

	if err := s.users.UpdateRole(ctx, playerID, domain.RoleSubscriber, time.Now().UTC()); err != nil {
		s.logs.Error("payment_role_promotion_failed", map[string]any{"playerId": playerID, "error": err.Error()})
		return
	}
	s.logs.Info("payment_role_promoted", map[string]any{"playerId": playerID, "role": domain.RoleSubscriber})
}

func resolvePlayerID(metadata map[string]string) string {
	if len(metadata) == 0 {
		return ""
	}
	if id := metadata["playerId"]; id != "" {
		return id
	}
	if id := metadata["playerID"]; id != "" {
		return id
	}
	if id := metadata["player_id"]; id != "" {
		return id
	}
	return ""
}
