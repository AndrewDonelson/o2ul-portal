package httpinfra

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
	"com.nlaak.backend-template/internal/domain/payment"
)

type paymentProviderStub struct {
	name             string
	failCheckout     bool
	failWebhook      bool
	requireSignature bool
	lastSignature    string
}

func (p *paymentProviderStub) ProviderName() string { return p.name }

func (p *paymentProviderStub) CreateCheckoutSession(_ context.Context, req payment.CheckoutRequest) (payment.CheckoutSession, error) {
	if p.failCheckout {
		return payment.CheckoutSession{}, errors.New("checkout failed")
	}
	return payment.CheckoutSession{
		Provider:    req.Provider,
		SessionID:   "sess-123",
		CheckoutURL: "https://checkout.local/sess-123",
		ExpiresAt:   time.Now().UTC().Add(10 * time.Minute),
	}, nil
}

func (p *paymentProviderStub) HandleWebhook(_ context.Context, payload []byte, signature string) (payment.WebhookResult, error) {
	p.lastSignature = signature
	if p.requireSignature && signature == "" {
		return payment.WebhookResult{}, errors.New("missing signature")
	}
	if p.failWebhook {
		return payment.WebhookResult{}, errors.New("webhook failed")
	}
	meta := map[string]string{}
	var body map[string]any
	if err := json.Unmarshal(payload, &body); err == nil {
		if v, ok := body["playerId"].(string); ok && v != "" {
			meta["playerId"] = v
		}
		if m, ok := body["metadata"].(map[string]any); ok {
			if v, ok := m["playerId"].(string); ok && v != "" {
				meta["playerId"] = v
			}
		}
	}
	return payment.WebhookResult{
		Provider:  payment.Provider(p.name),
		EventID:   "evt-123",
		EventType: "payment.succeeded",
		Accepted:  true,
		Metadata:  meta,
	}, nil
}

type paymentTestLog struct{}

func (paymentTestLog) Info(_ string, _ map[string]any)  {}
func (paymentTestLog) Error(_ string, _ map[string]any) {}

type paymentTestRepo struct {
	users map[string]domain.Player
}

func newPaymentTestRepo() *paymentTestRepo {
	return &paymentTestRepo{users: map[string]domain.Player{}}
}

func (r *paymentTestRepo) Create(_ context.Context, player domain.Player) (domain.Player, error) {
	r.users[player.ID] = player
	return player, nil
}
func (r *paymentTestRepo) ByEmail(_ context.Context, email string) (domain.Player, error) {
	for _, user := range r.users {
		if user.Email == email {
			return user, nil
		}
	}
	return domain.Player{}, errors.New("not found")
}
func (r *paymentTestRepo) ByID(_ context.Context, id string) (domain.Player, error) {
	user, ok := r.users[id]
	if !ok {
		return domain.Player{}, errors.New("not found")
	}
	return user, nil
}
func (r *paymentTestRepo) List(_ context.Context) ([]domain.Player, error) {
	out := make([]domain.Player, 0, len(r.users))
	for _, user := range r.users {
		out = append(out, user)
	}
	return out, nil
}
func (r *paymentTestRepo) UpdateRole(_ context.Context, id string, role domain.Role, updatedAt time.Time) error {
	user, ok := r.users[id]
	if !ok {
		return errors.New("not found")
	}
	user.Role = role
	user.UpdatedAt = updatedAt
	r.users[id] = user
	return nil
}

func newPaymentTestRouter(t *testing.T, repo *paymentTestRepo, stripeProvider, steamProvider *paymentProviderStub) (http.Handler, string) {
	t.Helper()
	tokenSvc := NewJWTService("test-secret", time.Hour)
	authSvc := application.NewAuthService(repo, tokenSvc, paymentTestLog{})
	paymentSvc := application.NewPaymentService(paymentTestLog{}, stripeProvider, steamProvider).WithUserRepository(repo)

	token, err := tokenSvc.Issue(domain.Player{
		ID:       "player-1",
		Email:    "player@example.com",
		Username: "player",
		Role:     domain.RoleAdmin,
	})
	if err != nil {
		t.Fatalf("issue token failed: %v", err)
	}

	router := BuildAPIRouter(APIOptions{
		AuthService:    authSvc,
		PaymentService: paymentSvc,
		UserRepo:       repo,
		TokenSvc:       tokenSvc,
	})
	return router, token
}

func TestPaymentCheckoutEndpoint_Success(t *testing.T) {
	repo := newPaymentTestRepo()
	stripeProvider := &paymentProviderStub{name: string(payment.ProviderStripe)}
	steamProvider := &paymentProviderStub{name: string(payment.ProviderSteam)}
	router, token := newPaymentTestRouter(t, repo, stripeProvider, steamProvider)

	body := payment.CheckoutRequest{
		Provider:  payment.ProviderStripe,
		PlayerID:  "player-1",
		Email:     "player@example.com",
		ProductID: "sub_monthly",
		Currency:  "USD",
		Amount:    500,
	}
	payload, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/checkout", bytes.NewReader(payload))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d body=%s", rr.Code, rr.Body.String())
	}
	var out payment.CheckoutSession
	if err := json.Unmarshal(rr.Body.Bytes(), &out); err != nil {
		t.Fatalf("unmarshal response failed: %v", err)
	}
	if out.SessionID == "" {
		t.Fatalf("expected session id")
	}
}

func TestPaymentCheckoutEndpoint_ErrorPaths(t *testing.T) {
	t.Run("missing auth", func(t *testing.T) {
		repo := newPaymentTestRepo()
		stripeProvider := &paymentProviderStub{name: string(payment.ProviderStripe)}
		steamProvider := &paymentProviderStub{name: string(payment.ProviderSteam)}
		router, _ := newPaymentTestRouter(t, repo, stripeProvider, steamProvider)

		body := payment.CheckoutRequest{Provider: payment.ProviderStripe, Amount: 100}
		payload, _ := json.Marshal(body)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/checkout", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rr.Code)
		}
	})

	t.Run("provider failure", func(t *testing.T) {
		repo := newPaymentTestRepo()
		stripeProvider := &paymentProviderStub{name: string(payment.ProviderStripe), failCheckout: true}
		steamProvider := &paymentProviderStub{name: string(payment.ProviderSteam)}
		router, token := newPaymentTestRouter(t, repo, stripeProvider, steamProvider)

		body := payment.CheckoutRequest{Provider: payment.ProviderStripe, Amount: 100}
		payload, _ := json.Marshal(body)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/checkout", bytes.NewReader(payload))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rr.Code)
		}
	})

	t.Run("unsupported provider", func(t *testing.T) {
		repo := newPaymentTestRepo()
		stripeProvider := &paymentProviderStub{name: string(payment.ProviderStripe)}
		steamProvider := &paymentProviderStub{name: string(payment.ProviderSteam)}
		router, token := newPaymentTestRouter(t, repo, stripeProvider, steamProvider)

		body := payment.CheckoutRequest{Provider: payment.Provider("unknown"), Amount: 100}
		payload, _ := json.Marshal(body)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/checkout", bytes.NewReader(payload))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rr.Code)
		}
	})
}

func TestPaymentWebhookEndpoint_SuccessAndErrors(t *testing.T) {
	t.Run("stripe success uses Stripe-Signature", func(t *testing.T) {
		repo := newPaymentTestRepo()
		stripeProvider := &paymentProviderStub{name: string(payment.ProviderStripe), requireSignature: true}
		steamProvider := &paymentProviderStub{name: string(payment.ProviderSteam)}
		router, _ := newPaymentTestRouter(t, repo, stripeProvider, steamProvider)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhook/stripe", bytes.NewReader([]byte(`{"id":"evt_1"}`)))
		req.Header.Set("Stripe-Signature", "sig-stripe")
		req.Header.Set("X-Signature", "wrong-sig")
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		if stripeProvider.lastSignature != "sig-stripe" {
			t.Fatalf("expected Stripe-Signature to be used, got %q", stripeProvider.lastSignature)
		}
	})

	t.Run("missing signature", func(t *testing.T) {
		repo := newPaymentTestRepo()
		stripeProvider := &paymentProviderStub{name: string(payment.ProviderStripe), requireSignature: true}
		steamProvider := &paymentProviderStub{name: string(payment.ProviderSteam)}
		router, _ := newPaymentTestRouter(t, repo, stripeProvider, steamProvider)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhook/stripe", bytes.NewReader([]byte(`{"id":"evt_2"}`)))
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rr.Code)
		}
	})

	t.Run("provider failure", func(t *testing.T) {
		repo := newPaymentTestRepo()
		stripeProvider := &paymentProviderStub{name: string(payment.ProviderStripe)}
		steamProvider := &paymentProviderStub{name: string(payment.ProviderSteam), failWebhook: true}
		router, _ := newPaymentTestRouter(t, repo, stripeProvider, steamProvider)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhook/steam", bytes.NewReader([]byte(`{"eventId":"e1"}`)))
		req.Header.Set("X-Signature", "sig-steam")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rr.Code)
		}
	})

	t.Run("unsupported provider", func(t *testing.T) {
		repo := newPaymentTestRepo()
		stripeProvider := &paymentProviderStub{name: string(payment.ProviderStripe)}
		steamProvider := &paymentProviderStub{name: string(payment.ProviderSteam)}
		router, _ := newPaymentTestRouter(t, repo, stripeProvider, steamProvider)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhook/unknown", bytes.NewReader([]byte(`{"eventId":"e2"}`)))
		req.Header.Set("X-Signature", "sig-any")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", rr.Code)
		}
	})

	t.Run("webhook promotes registered user to subscriber", func(t *testing.T) {
		repo := newPaymentTestRepo()
		repo.users["player-registered"] = domain.Player{
			ID:        "player-registered",
			Email:     "registered@example.com",
			Username:  "registered",
			Role:      domain.RoleRegistered,
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}
		stripeProvider := &paymentProviderStub{name: string(payment.ProviderStripe), requireSignature: true}
		steamProvider := &paymentProviderStub{name: string(payment.ProviderSteam)}
		router, _ := newPaymentTestRouter(t, repo, stripeProvider, steamProvider)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhook/stripe", bytes.NewReader([]byte(`{"id":"evt_sub","type":"payment.succeeded","playerId":"player-registered"}`)))
		req.Header.Set("Stripe-Signature", "sig-stripe")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		updated, err := repo.ByID(context.Background(), "player-registered")
		if err != nil {
			t.Fatalf("load promoted user failed: %v", err)
		}
		if updated.Role != domain.RoleSubscriber {
			t.Fatalf("expected subscriber role, got %s", updated.Role)
		}
	})

	t.Run("webhook does not promote guest user", func(t *testing.T) {
		repo := newPaymentTestRepo()
		repo.users["player-guest"] = domain.Player{
			ID:        "player-guest",
			Email:     "guest@example.com",
			Username:  "guest",
			Role:      domain.RoleGuest,
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}
		stripeProvider := &paymentProviderStub{name: string(payment.ProviderStripe), requireSignature: true}
		steamProvider := &paymentProviderStub{name: string(payment.ProviderSteam)}
		router, _ := newPaymentTestRouter(t, repo, stripeProvider, steamProvider)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/payments/webhook/stripe", bytes.NewReader([]byte(`{"id":"evt_sub_guest","type":"payment.succeeded","metadata":{"playerId":"player-guest"}}`)))
		req.Header.Set("Stripe-Signature", "sig-stripe")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		updated, err := repo.ByID(context.Background(), "player-guest")
		if err != nil {
			t.Fatalf("load user failed: %v", err)
		}
		if updated.Role != domain.RoleGuest {
			t.Fatalf("expected guest role unchanged, got %s", updated.Role)
		}
	})
}
