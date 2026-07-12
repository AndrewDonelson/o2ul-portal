package httpinfra

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
)

func TestO2ULWalletEndpoint_FixtureRangeE2E(t *testing.T) {
	tokenSvc := NewJWTService("test-secret", time.Hour)
	users := newO2ULUserRepoStub()

	player := domain.Player{
		ID:        "player-wallet",
		Email:     "wallet@example.com",
		Username:  "wallet",
		Role:      domain.RoleRegistered,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
	users.users[player.ID] = player

	walletSvc, err := application.NewDefaultO2ULWalletService()
	if err != nil {
		t.Fatalf("NewDefaultO2ULWalletService failed: %v", err)
	}

	router := BuildAPIRouter(APIOptions{
		AuthService:       application.NewAuthService(users, tokenSvc, authEndpointLog{}),
		PaymentService:    application.NewPaymentService(authEndpointLog{}),
		UserRepo:          users,
		TokenSvc:          tokenSvc,
		O2ULWalletService: walletSvc,
	})

	token := issueO2ULToken(t, tokenSvc, player)

	t.Run("valid fixture range succeeds", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]any{
			"headerStart": 0,
			"headerEnd":   1,
			"amount":      10,
			"assetId":     "o2ul",
			"mode":        "local",
			"circuitId":   "spend",
			"witness":     []byte("w"),
			"assertions": []map[string]any{
				{"factor": "device", "payload": "ok"},
				{"factor": "passkey", "payload": "ok"},
			},
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/spend/prove", bytes.NewReader(payload))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
	})

	t.Run("missing fixture height returns bad request", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]any{
			"headerStart": 1,
			"headerEnd":   2,
			"amount":      10,
			"assetId":     "o2ul",
			"mode":        "local",
			"circuitId":   "spend",
			"witness":     []byte("w"),
			"assertions": []map[string]any{
				{"factor": "device", "payload": "ok"},
				{"factor": "passkey", "payload": "ok"},
			},
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/spend/prove", bytes.NewReader(payload))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
		}
		if !strings.Contains(rr.Body.String(), "fixture not found") {
			t.Fatalf("expected missing fixture error message, got body=%s", rr.Body.String())
		}
	})
}

func TestO2ULWalletEndpoint_HTTP3FixtureProfileE2E(t *testing.T) {
	t.Setenv(application.WalletHeaderFixtureProfileEnv, "ethapi-http3-fixture")

	tokenSvc := NewJWTService("test-secret", time.Hour)
	users := newO2ULUserRepoStub()
	player := domain.Player{
		ID:        "player-wallet-h3",
		Email:     "wallet-h3@example.com",
		Username:  "wallet-h3",
		Role:      domain.RoleRegistered,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}
	users.users[player.ID] = player

	walletSvc, err := application.NewDefaultO2ULWalletService()
	if err != nil {
		t.Fatalf("NewDefaultO2ULWalletService failed: %v", err)
	}
	router := BuildAPIRouter(APIOptions{
		AuthService:       application.NewAuthService(users, tokenSvc, authEndpointLog{}),
		PaymentService:    application.NewPaymentService(authEndpointLog{}),
		UserRepo:          users,
		TokenSvc:          tokenSvc,
		O2ULWalletService: walletSvc,
	})
	token := issueO2ULToken(t, tokenSvc, player)

	payload, _ := json.Marshal(map[string]any{
		"headerStart": 0,
		"headerEnd":   1,
		"amount":      10,
		"assetId":     "o2ul",
		"mode":        "local",
		"circuitId":   "spend",
		"witness":     []byte("w"),
		"assertions": []map[string]any{
			{"factor": "device", "payload": "ok"},
			{"factor": "passkey", "payload": "ok"},
		},
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/spend/prove", bytes.NewReader(payload))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestO2ULWalletEndpoint_HTTP3RPCProfileRejectsNonHTTPSEndpoint(t *testing.T) {
	t.Setenv(application.WalletHeaderFixtureProfileEnv, "ethapi-http3-rpc")
	t.Setenv(application.WalletHeaderRPCURLEnv, "http://rpc.invalid")

	_, err := application.NewDefaultO2ULWalletService()
	if err == nil {
		t.Fatal("expected wallet service init error for non-https endpoint")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "https") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func (r *o2ulUserRepoStub) UpdatePassword(_ context.Context, id string, passwordHash string, updatedAt time.Time) error {
	u, ok := r.users[id]
	if !ok {
		return errors.New("not found")
	}
	u.PasswordHash = passwordHash
	u.UpdatedAt = updatedAt
	r.users[id] = u
	return nil
}
