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

	t.Run("scan notes endpoint succeeds", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]any{
			"assetId":      "o2ul",
			"includeSpent": false,
			"limit":        2,
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/notes/scan", bytes.NewReader(payload))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
	})

	t.Run("build transaction endpoint succeeds", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]any{
			"assetId":    "o2ul",
			"recipient":  "recipient-1",
			"amount":     10,
			"fee":        2,
			"inputNotes": []string{"player-wallet-note-01"},
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/transactions/build", bytes.NewReader(payload))
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
	})

	t.Run("submit and status endpoints succeed", func(t *testing.T) {
		unsignedTx, _ := json.Marshal(map[string]any{
			"walletId":   player.ID,
			"assetId":    "o2ul",
			"recipient":  "recipient-1",
			"amount":     10,
			"fee":        2,
			"inputNotes": []string{player.ID + "-note-01"},
		})

		signPayload, _ := json.Marshal(map[string]any{
			"unsignedTx": unsignedTx,
			"assertions": []map[string]any{{"factor": "device", "payload": "ok"}, {"factor": "passkey", "payload": "ok"}},
		})
		signReq := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/transactions/sign", bytes.NewReader(signPayload))
		signReq.Header.Set("Authorization", "Bearer "+token)
		signReq.Header.Set("Content-Type", "application/json")
		signRR := httptest.NewRecorder()
		router.ServeHTTP(signRR, signReq)
		if signRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", signRR.Code, signRR.Body.String())
		}

		var signOut struct {
			SignedTx []byte `json:"signedTx"`
		}
		if err := json.Unmarshal(signRR.Body.Bytes(), &signOut); err != nil {
			t.Fatalf("sign response decode failed: %v", err)
		}
		if len(signOut.SignedTx) == 0 {
			t.Fatal("expected non-empty signed transaction")
		}

		submitPayload, _ := json.Marshal(map[string]any{
			"unsignedTx": signOut.SignedTx,
		})
		submitReq := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/transactions/submit", bytes.NewReader(submitPayload))
		submitReq.Header.Set("Authorization", "Bearer "+token)
		submitReq.Header.Set("Content-Type", "application/json")
		submitRR := httptest.NewRecorder()
		router.ServeHTTP(submitRR, submitReq)
		if submitRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", submitRR.Code, submitRR.Body.String())
		}

		var submitOut struct {
			Tx struct {
				TxID string `json:"txId"`
			} `json:"tx"`
		}
		if err := json.Unmarshal(submitRR.Body.Bytes(), &submitOut); err != nil {
			t.Fatalf("submit response decode failed: %v", err)
		}
		if submitOut.Tx.TxID == "" {
			t.Fatal("expected non-empty tx id")
		}

		statusPayload, _ := json.Marshal(map[string]any{"txId": submitOut.Tx.TxID})
		statusReq := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/transactions/status", bytes.NewReader(statusPayload))
		statusReq.Header.Set("Authorization", "Bearer "+token)
		statusReq.Header.Set("Content-Type", "application/json")
		statusRR := httptest.NewRecorder()
		router.ServeHTTP(statusRR, statusReq)
		if statusRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", statusRR.Code, statusRR.Body.String())
		}

		var statusOut struct {
			Tx struct {
				Status string `json:"status"`
			} `json:"tx"`
		}
		if err := json.Unmarshal(statusRR.Body.Bytes(), &statusOut); err != nil {
			t.Fatalf("status response decode failed: %v", err)
		}
		if statusOut.Tx.Status != "processing" {
			t.Fatalf("expected processing status, got %q", statusOut.Tx.Status)
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

func TestO2ULWalletEndpoint_Contiguous20To21E2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-20to21-" + profile,
				Email:     "wallet-20to21-" + profile + "@example.com",
				Username:  "wallet-20to21-" + profile,
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
				"headerStart": 20,
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
			if rr.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
			}
		})
	}
}

func TestO2ULWalletEndpoint_SingleUnsupported22E2E(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			t.Setenv(application.WalletHeaderFixtureProfileEnv, profile)

			tokenSvc := NewJWTService("test-secret", time.Hour)
			users := newO2ULUserRepoStub()
			player := domain.Player{
				ID:        "player-wallet-single22-" + profile,
				Email:     "wallet-single22-" + profile + "@example.com",
				Username:  "wallet-single22-" + profile,
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
				"headerStart": 22,
				"headerEnd":   22,
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
