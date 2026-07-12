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

func TestO2ULWalletEndpoint_HighRangeParityE2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-highrange-" + profile,
				Email:     "wallet-highrange-" + profile + "@example.com",
				Username:  "wallet-highrange-" + profile,
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
				"headerStart": 9,
				"headerEnd":   10,
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
	}
}

func TestO2ULWalletEndpoint_HighRangeGapParityE2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-gap-" + profile,
				Email:     "wallet-gap-" + profile + "@example.com",
				Username:  "wallet-gap-" + profile,
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
				"headerStart": 10,
				"headerEnd":   11,
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
			if !strings.Contains(strings.ToLower(rr.Body.String()), "parent hash mismatch") {
				t.Fatalf("expected chain-mismatch message, got body=%s", rr.Body.String())
			}
		})
	}
}

func TestO2ULWalletEndpoint_HighRangeSingleHeaderSuccessE2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-single11-" + profile,
				Email:     "wallet-single11-" + profile + "@example.com",
				Username:  "wallet-single11-" + profile,
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
				"headerStart": 11,
				"headerEnd":   11,
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
	}
}

func TestO2ULWalletEndpoint_HighRangeContiguous11To12SuccessE2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-beyond11-" + profile,
				Email:     "wallet-beyond11-" + profile + "@example.com",
				Username:  "wallet-beyond11-" + profile,
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
				"headerStart": 11,
				"headerEnd":   12,
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
	}
}

func TestO2ULWalletEndpoint_HighRangeContiguous12To13SuccessE2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-12to13-" + profile,
				Email:     "wallet-12to13-" + profile + "@example.com",
				Username:  "wallet-12to13-" + profile,
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
				"headerStart": 12,
				"headerEnd":   13,
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
	}
}

func TestO2ULWalletEndpoint_HighRangeContiguous13To14SuccessE2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-13to14-" + profile,
				Email:     "wallet-13to14-" + profile + "@example.com",
				Username:  "wallet-13to14-" + profile,
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
				"headerStart": 13,
				"headerEnd":   14,
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
	}
}

func TestO2ULWalletEndpoint_HighRangeContiguous14To15SuccessE2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-14to15-" + profile,
				Email:     "wallet-14to15-" + profile + "@example.com",
				Username:  "wallet-14to15-" + profile,
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
				"headerStart": 14,
				"headerEnd":   15,
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
	}
}

func TestO2ULWalletEndpoint_HighRangeContiguous15To16SuccessE2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-15to16-" + profile,
				Email:     "wallet-15to16-" + profile + "@example.com",
				Username:  "wallet-15to16-" + profile,
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
				"headerStart": 15,
				"headerEnd":   16,
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
	}
}

func TestO2ULWalletEndpoint_HighRangeContiguous16To17SuccessE2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-16to17-" + profile,
				Email:     "wallet-16to17-" + profile + "@example.com",
				Username:  "wallet-16to17-" + profile,
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
				"headerStart": 16,
				"headerEnd":   17,
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
	}
}

func TestO2ULWalletEndpoint_HighRangeContiguous17To18SuccessE2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-17to18-" + profile,
				Email:     "wallet-17to18-" + profile + "@example.com",
				Username:  "wallet-17to18-" + profile,
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
				"headerStart": 17,
				"headerEnd":   18,
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
	}
}

func TestO2ULWalletEndpoint_HighRangeContiguous19To20SuccessE2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-19to20-" + profile,
				Email:     "wallet-19to20-" + profile + "@example.com",
				Username:  "wallet-19to20-" + profile,
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
				"headerStart": 19,
				"headerEnd":   20,
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
	}
}

func TestO2ULWalletEndpoint_SingleUnsupported21E2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-single21-" + profile,
				Email:     "wallet-single21-" + profile + "@example.com",
				Username:  "wallet-single21-" + profile,
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
				"headerStart": 21,
				"headerEnd":   21,
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
			if !strings.Contains(strings.ToLower(rr.Body.String()), "not found") {
				t.Fatalf("expected missing-fixture message, got body=%s", rr.Body.String())
			}
		})
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
