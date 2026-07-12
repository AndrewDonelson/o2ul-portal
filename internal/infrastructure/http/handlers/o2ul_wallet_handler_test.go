package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"com.nlaak.backend-template/internal/application"
	mw "com.nlaak.backend-template/internal/infrastructure/http/middleware"
	"com.nlaak.backend-template/pkg/lightclient"
	"com.nlaak.backend-template/pkg/proverclient"
	"com.nlaak.backend-template/pkg/walletguard"
)

type walletHandlerTokenParser struct{}

func (walletHandlerTokenParser) Parse(_ string) (application.TokenClaims, error) {
	return application.TokenClaims{PlayerID: "player-1"}, nil
}

type walletHandlerLightFixture struct{ err error }

func (f walletHandlerLightFixture) FetchRange(_ context.Context, _ uint64, _ uint64) ([]lightclient.Header, error) {
	if f.err != nil {
		return nil, f.err
	}
	return []lightclient.Header{{Number: 1}, {Number: 2}}, nil
}

type walletHandlerProverFixture struct {
	proof []byte
	err   error
}

func (f walletHandlerProverFixture) GenerateProof(_ context.Context, _ proverclient.Mode, _ proverclient.Request) ([]byte, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.proof, nil
}

type walletHandlerGuardFixture struct{ err error }

func (f walletHandlerGuardFixture) Authorize(_ walletguard.SpendIntent, _ []walletguard.Assertion) error {
	return f.err
}

type walletSpendRequestFixture struct {
	HeaderStart uint64 `json:"headerStart"`
	HeaderEnd   uint64 `json:"headerEnd"`
	WalletID    string `json:"walletId"`
	Amount      uint64 `json:"amount"`
	AssetID     string `json:"assetId"`
	Mode        string `json:"mode"`
	CircuitID   string `json:"circuitId"`
	Witness     []byte `json:"witness"`
	PairedID    string `json:"pairedDeviceId"`
	Assertions  []struct {
		Factor  string `json:"factor"`
		Payload string `json:"payload"`
	} `json:"assertions"`
}

func TestO2ULWalletHandlerVerifyAuthorizeAndProveSuccess(t *testing.T) {
	svc, err := application.NewO2ULWalletService(
		walletHandlerLightFixture{},
		walletHandlerProverFixture{proof: []byte("proof")},
		walletHandlerGuardFixture{},
	)
	if err != nil {
		t.Fatalf("NewO2ULWalletService failed: %v", err)
	}
	h := NewO2ULWalletHandler(svc)

	reqBody := walletSpendRequestFixture{
		HeaderStart: 1,
		HeaderEnd:   2,
		Amount:      9,
		AssetID:     "o2ul",
		Mode:        string(proverclient.ModeLocal),
		CircuitID:   "spend",
		Witness:     []byte("witness"),
		Assertions: []struct {
			Factor  string `json:"factor"`
			Payload string `json:"payload"`
		}{{Factor: string(walletguard.FactorDevice), Payload: "ok"}, {Factor: string(walletguard.FactorPasskey), Payload: "ok"}},
	}
	payload, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/spend/prove", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	rr := httptest.NewRecorder()

	protected := mw.RequireAuth(walletHandlerTokenParser{})(http.HandlerFunc(h.VerifyAuthorizeAndProve))
	protected.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestO2ULWalletHandlerRejectsWalletMismatch(t *testing.T) {
	svc, err := application.NewO2ULWalletService(
		walletHandlerLightFixture{},
		walletHandlerProverFixture{proof: []byte("proof")},
		walletHandlerGuardFixture{},
	)
	if err != nil {
		t.Fatalf("NewO2ULWalletService failed: %v", err)
	}
	h := NewO2ULWalletHandler(svc)

	reqBody := walletSpendRequestFixture{
		HeaderStart: 1,
		HeaderEnd:   2,
		WalletID:    "other-player",
		Amount:      9,
		AssetID:     "o2ul",
		Mode:        string(proverclient.ModeLocal),
		CircuitID:   "spend",
		Witness:     []byte("witness"),
		Assertions: []struct {
			Factor  string `json:"factor"`
			Payload string `json:"payload"`
		}{{Factor: string(walletguard.FactorDevice), Payload: "ok"}, {Factor: string(walletguard.FactorPasskey), Payload: "ok"}},
	}
	payload, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/spend/prove", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	rr := httptest.NewRecorder()

	protected := mw.RequireAuth(walletHandlerTokenParser{})(http.HandlerFunc(h.VerifyAuthorizeAndProve))
	protected.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestO2ULWalletHandlerMapsInsufficientFactorsToForbidden(t *testing.T) {
	svc, err := application.NewO2ULWalletService(
		walletHandlerLightFixture{},
		walletHandlerProverFixture{proof: []byte("proof")},
		walletHandlerGuardFixture{err: walletguard.ErrInsufficientFactors},
	)
	if err != nil {
		t.Fatalf("NewO2ULWalletService failed: %v", err)
	}
	h := NewO2ULWalletHandler(svc)

	reqBody := walletSpendRequestFixture{
		HeaderStart: 1,
		HeaderEnd:   2,
		Amount:      9,
		AssetID:     "o2ul",
		Mode:        string(proverclient.ModeLocal),
		CircuitID:   "spend",
		Witness:     []byte("witness"),
		Assertions: []struct {
			Factor  string `json:"factor"`
			Payload string `json:"payload"`
		}{{Factor: string(walletguard.FactorDevice), Payload: "ok"}},
	}
	payload, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/spend/prove", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	rr := httptest.NewRecorder()

	protected := mw.RequireAuth(walletHandlerTokenParser{})(http.HandlerFunc(h.VerifyAuthorizeAndProve))
	protected.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestO2ULWalletHandlerReturnsBadRequestOnLightClientError(t *testing.T) {
	svc, err := application.NewO2ULWalletService(
		walletHandlerLightFixture{err: errors.New("light unavailable")},
		walletHandlerProverFixture{proof: []byte("proof")},
		walletHandlerGuardFixture{},
	)
	if err != nil {
		t.Fatalf("NewO2ULWalletService failed: %v", err)
	}
	h := NewO2ULWalletHandler(svc)

	reqBody := walletSpendRequestFixture{
		HeaderStart: 1,
		HeaderEnd:   2,
		Amount:      9,
		AssetID:     "o2ul",
		Mode:        string(proverclient.ModeLocal),
		CircuitID:   "spend",
		Witness:     []byte("witness"),
		Assertions: []struct {
			Factor  string `json:"factor"`
			Payload string `json:"payload"`
		}{{Factor: string(walletguard.FactorDevice), Payload: "ok"}, {Factor: string(walletguard.FactorPasskey), Payload: "ok"}},
	}
	payload, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/spend/prove", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	rr := httptest.NewRecorder()

	protected := mw.RequireAuth(walletHandlerTokenParser{})(http.HandlerFunc(h.VerifyAuthorizeAndProve))
	protected.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d body=%s", rr.Code, rr.Body.String())
	}
}
