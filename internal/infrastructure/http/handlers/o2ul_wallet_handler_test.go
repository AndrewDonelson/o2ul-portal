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

func TestO2ULWalletHandlerScanNotesSuccess(t *testing.T) {
	svc, err := application.NewO2ULWalletService(
		walletHandlerLightFixture{},
		walletHandlerProverFixture{proof: []byte("proof")},
		walletHandlerGuardFixture{},
	)
	if err != nil {
		t.Fatalf("NewO2ULWalletService failed: %v", err)
	}
	h := NewO2ULWalletHandler(svc)

	payload, _ := json.Marshal(map[string]any{
		"assetId":      "o2ul",
		"includeSpent": false,
		"limit":        2,
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/notes/scan", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	rr := httptest.NewRecorder()

	protected := mw.RequireAuth(walletHandlerTokenParser{})(http.HandlerFunc(h.ScanNotes))
	protected.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestO2ULWalletHandlerBuildSpendTransactionSuccess(t *testing.T) {
	svc, err := application.NewO2ULWalletService(
		walletHandlerLightFixture{},
		walletHandlerProverFixture{proof: []byte("proof")},
		walletHandlerGuardFixture{},
	)
	if err != nil {
		t.Fatalf("NewO2ULWalletService failed: %v", err)
	}
	h := NewO2ULWalletHandler(svc)

	payload, _ := json.Marshal(map[string]any{
		"assetId":    "o2ul",
		"recipient":  "wallet-recipient-1",
		"amount":     10,
		"fee":        2,
		"inputNotes": []string{"player-1-note-01"},
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/transactions/build", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	rr := httptest.NewRecorder()

	protected := mw.RequireAuth(walletHandlerTokenParser{})(http.HandlerFunc(h.BuildSpendTransaction))
	protected.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestO2ULWalletHandlerBuildSpendTransactionRejectsWalletMismatch(t *testing.T) {
	svc, err := application.NewO2ULWalletService(
		walletHandlerLightFixture{},
		walletHandlerProverFixture{proof: []byte("proof")},
		walletHandlerGuardFixture{},
	)
	if err != nil {
		t.Fatalf("NewO2ULWalletService failed: %v", err)
	}
	h := NewO2ULWalletHandler(svc)

	payload, _ := json.Marshal(map[string]any{
		"walletId":   "other-player",
		"assetId":    "o2ul",
		"recipient":  "wallet-recipient-1",
		"amount":     10,
		"fee":        2,
		"inputNotes": []string{"player-1-note-01"},
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/transactions/build", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer token")
	rr := httptest.NewRecorder()

	protected := mw.RequireAuth(walletHandlerTokenParser{})(http.HandlerFunc(h.BuildSpendTransaction))
	protected.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d body=%s", rr.Code, rr.Body.String())
	}
}

func TestO2ULWalletHandlerSubmitAndStatusSuccess(t *testing.T) {
	svc, err := application.NewO2ULWalletService(
		walletHandlerLightFixture{},
		walletHandlerProverFixture{proof: []byte("proof")},
		walletHandlerGuardFixture{},
	)
	if err != nil {
		t.Fatalf("NewO2ULWalletService failed: %v", err)
	}
	h := NewO2ULWalletHandler(svc)

	unsignedTx, _ := json.Marshal(map[string]any{
		"walletId":   "player-1",
		"assetId":    "o2ul",
		"recipient":  "recipient-1",
		"amount":     10,
		"fee":        2,
		"inputNotes": []string{"player-1-note-01"},
	})

	signPayload, _ := json.Marshal(map[string]any{
		"unsignedTx": unsignedTx,
		"assertions": []map[string]any{
			{"factor": "device", "payload": "ok"},
		},
	})
	signReq := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/wallet/transactions/sign", bytes.NewReader(signPayload))
	signReq.Header.Set("Content-Type", "application/json")
	signReq.Header.Set("Authorization", "Bearer token")
	signRR := httptest.NewRecorder()

	protectedSign := mw.RequireAuth(walletHandlerTokenParser{})(http.HandlerFunc(h.SignTransaction))
	protectedSign.ServeHTTP(signRR, signReq)

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
	submitReq.Header.Set("Content-Type", "application/json")
	submitReq.Header.Set("Authorization", "Bearer token")
	submitRR := httptest.NewRecorder()

	protected := mw.RequireAuth(walletHandlerTokenParser{})(http.HandlerFunc(h.SubmitTransaction))
	protected.ServeHTTP(submitRR, submitReq)

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
	statusReq.Header.Set("Content-Type", "application/json")
	statusReq.Header.Set("Authorization", "Bearer token")
	statusRR := httptest.NewRecorder()

	protectedStatus := mw.RequireAuth(walletHandlerTokenParser{})(http.HandlerFunc(h.TransactionStatus))
	protectedStatus.ServeHTTP(statusRR, statusReq)

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
}
