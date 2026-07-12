package handlers

import (
	"errors"
	"net/http"
	"strings"

	"com.nlaak.backend-template/internal/application"
	mw "com.nlaak.backend-template/internal/infrastructure/http/middleware"
	"com.nlaak.backend-template/pkg/proverclient"
	"com.nlaak.backend-template/pkg/walletguard"
)

type O2ULWalletHandler struct {
	svc *application.O2ULWalletService
}

func NewO2ULWalletHandler(svc *application.O2ULWalletService) *O2ULWalletHandler {
	return &O2ULWalletHandler{svc: svc}
}

type walletSpendProveReq struct {
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

func (h *O2ULWalletHandler) VerifyAuthorizeAndProve(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}

	var req walletSpendProveReq
	if err := decodeJSON(w, r, &req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	walletID := strings.TrimSpace(req.WalletID)
	if walletID == "" {
		walletID = claims.PlayerID
	}
	if walletID != claims.PlayerID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	assertions := make([]walletguard.Assertion, 0, len(req.Assertions))
	for _, input := range req.Assertions {
		assertions = append(assertions, walletguard.Assertion{Factor: walletguard.Factor(input.Factor), Payload: input.Payload})
	}

	proof, err := h.svc.VerifyAuthorizeAndProve(
		r.Context(),
		req.HeaderStart,
		req.HeaderEnd,
		walletguard.SpendIntent{WalletID: walletID, Amount: req.Amount, AssetID: req.AssetID},
		assertions,
		proverclient.Mode(req.Mode),
		proverclient.Request{CircuitID: req.CircuitID, Witness: req.Witness, PairedDeviceID: req.PairedID},
	)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, walletguard.ErrInsufficientFactors) {
			status = http.StatusForbidden
		}
		http.Error(w, err.Error(), status)
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"walletId": walletID,
		"proof":    proof,
	})
}
