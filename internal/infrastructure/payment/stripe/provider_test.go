package stripe

import (
	"context"
	"strings"
	"testing"

	"com.nlaak.backend-template/internal/domain/payment"
)

func TestProvider_CreateCheckoutSession(t *testing.T) {
	p := NewProvider("secret", "whsec")
	out, err := p.CreateCheckoutSession(context.Background(), payment.CheckoutRequest{Provider: payment.ProviderStripe, Amount: 100})
	if err != nil {
		t.Fatalf("create checkout failed: %v", err)
	}
	if !strings.HasPrefix(out.SessionID, "cs_test_") {
		t.Fatalf("unexpected session id: %q", out.SessionID)
	}
	if out.Provider != payment.ProviderStripe {
		t.Fatalf("provider mismatch: %s", out.Provider)
	}

	if _, err := NewProvider("", "whsec").CreateCheckoutSession(context.Background(), payment.CheckoutRequest{Amount: 100}); err == nil {
		t.Fatalf("expected missing secret key error")
	}
	if _, err := p.CreateCheckoutSession(context.Background(), payment.CheckoutRequest{Amount: 0}); err == nil {
		t.Fatalf("expected invalid amount error")
	}
}

func TestProvider_HandleWebhook(t *testing.T) {
	p := NewProvider("secret", "whsec")
	out, err := p.HandleWebhook(context.Background(), []byte(`{"metadata":{"playerId":"p1"}}`), "sig")
	if err != nil {
		t.Fatalf("handle webhook failed: %v", err)
	}
	if out.EventType != "unknown" || out.EventID == "" {
		t.Fatalf("unexpected fallback event data: %+v", out)
	}
	if out.Metadata["playerId"] != "p1" {
		t.Fatalf("metadata mismatch: %+v", out.Metadata)
	}

	if _, err := NewProvider("secret", "").HandleWebhook(context.Background(), []byte(`{}`), "sig"); err == nil {
		t.Fatalf("expected missing webhook secret error")
	}
	if _, err := p.HandleWebhook(context.Background(), []byte(`{}`), ""); err == nil {
		t.Fatalf("expected missing signature error")
	}
	if _, err := p.HandleWebhook(context.Background(), []byte(`{`), "sig"); err == nil {
		t.Fatalf("expected invalid json error")
	}
}
