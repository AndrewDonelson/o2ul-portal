package steam

import (
	"context"
	"strings"
	"testing"

	"com.nlaak.backend-template/internal/domain/payment"
)

func TestProvider_CreateCheckoutSession(t *testing.T) {
	p := NewProvider("pub", "", "", "", "123", "whsec")
	out, err := p.CreateCheckoutSession(context.Background(), payment.CheckoutRequest{Provider: payment.ProviderSteam, Amount: 100})
	if err != nil {
		t.Fatalf("create checkout failed: %v", err)
	}
	if !strings.HasPrefix(out.SessionID, "steam_txn_") {
		t.Fatalf("unexpected session id: %q", out.SessionID)
	}
	if !strings.Contains(out.CheckoutURL, "appId=123") {
		t.Fatalf("unexpected checkout url: %q", out.CheckoutURL)
	}

	if _, err := NewProvider("", "", "", "", "123", "whsec").CreateCheckoutSession(context.Background(), payment.CheckoutRequest{Amount: 100}); err == nil {
		t.Fatalf("expected missing provider config error")
	}
	if _, err := NewProvider("", "web-api", "", "", "123", "whsec").CreateCheckoutSession(context.Background(), payment.CheckoutRequest{Amount: 100}); err != nil {
		t.Fatalf("web api key should satisfy steam provider credentials: %v", err)
	}
	if _, err := NewProvider("pub", "", "steam-user", "", "123", "whsec").CreateCheckoutSession(context.Background(), payment.CheckoutRequest{Amount: 100}); err == nil {
		t.Fatalf("expected username/password pairing error")
	}
	if _, err := p.CreateCheckoutSession(context.Background(), payment.CheckoutRequest{Amount: 0}); err == nil {
		t.Fatalf("expected invalid amount error")
	}
}

func TestProvider_HandleWebhook(t *testing.T) {
	p := NewProvider("pub", "", "", "", "123", "whsec")
	out, err := p.HandleWebhook(context.Background(), []byte(`{"playerId":"p2"}`), "sig")
	if err != nil {
		t.Fatalf("handle webhook failed: %v", err)
	}
	if out.EventType != "unknown" || out.EventID == "" {
		t.Fatalf("unexpected fallback event data: %+v", out)
	}
	if out.Metadata["playerId"] != "p2" {
		t.Fatalf("metadata mismatch: %+v", out.Metadata)
	}

	if _, err := NewProvider("pub", "", "", "", "123", "").HandleWebhook(context.Background(), []byte(`{}`), "sig"); err == nil {
		t.Fatalf("expected missing webhook secret error")
	}
	if _, err := p.HandleWebhook(context.Background(), []byte(`{}`), ""); err == nil {
		t.Fatalf("expected missing signature error")
	}
	if _, err := p.HandleWebhook(context.Background(), []byte(`{`), "sig"); err == nil {
		t.Fatalf("expected invalid json error")
	}
}
