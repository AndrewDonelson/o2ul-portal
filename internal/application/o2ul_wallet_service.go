package application

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"com.nlaak.backend-template/pkg/lightclient"
	"com.nlaak.backend-template/pkg/proverclient"
	"com.nlaak.backend-template/pkg/walletguard"
)

type O2ULLightClient interface {
	FetchRange(ctx context.Context, start uint64, end uint64) ([]lightclient.Header, error)
}

type O2ULProverClient interface {
	GenerateProof(ctx context.Context, mode proverclient.Mode, req proverclient.Request) ([]byte, error)
}

type O2ULWalletGuard interface {
	Authorize(intent walletguard.SpendIntent, assertions []walletguard.Assertion) error
}

type O2ULWalletService struct {
	lightClient O2ULLightClient
	prover      O2ULProverClient
	guard       O2ULWalletGuard

	mu           sync.Mutex
	transactions map[string]WalletTransaction
	spentNotes   map[string]map[string]bool
}

type WalletNote struct {
	NoteID  string `json:"noteId"`
	AssetID string `json:"assetId"`
	Amount  uint64 `json:"amount"`
	Status  string `json:"status"`
}

type WalletSpendBuild struct {
	WalletID   string   `json:"walletId"`
	Recipient  string   `json:"recipient"`
	AssetID    string   `json:"assetId"`
	Amount     uint64   `json:"amount"`
	Fee        uint64   `json:"fee"`
	InputNotes []string `json:"inputNotes"`
}

type WalletTransaction struct {
	TxID         string   `json:"txId"`
	WalletID     string   `json:"walletId"`
	AssetID      string   `json:"assetId"`
	Amount       uint64   `json:"amount"`
	Fee          uint64   `json:"fee"`
	InputNotes   []string `json:"inputNotes"`
	Status       string   `json:"status"`
	SubmittedAt  string   `json:"submittedAt"`
	TotalOutflow uint64   `json:"totalOutflow"`
}

func NewO2ULWalletService(lightClient O2ULLightClient, prover O2ULProverClient, guard O2ULWalletGuard) (*O2ULWalletService, error) {
	if lightClient == nil {
		return nil, fmt.Errorf("light client is required")
	}
	if prover == nil {
		return nil, fmt.Errorf("prover client is required")
	}
	if guard == nil {
		return nil, fmt.Errorf("wallet guard is required")
	}
	return &O2ULWalletService{
		lightClient:  lightClient,
		prover:       prover,
		guard:        guard,
		transactions: map[string]WalletTransaction{},
		spentNotes:   map[string]map[string]bool{},
	}, nil
}

func (s *O2ULWalletService) VerifyClientAgainstRange(ctx context.Context, start uint64, end uint64) ([]lightclient.Header, error) {
	return s.lightClient.FetchRange(ctx, start, end)
}

func (s *O2ULWalletService) AuthorizeSpend(intent walletguard.SpendIntent, assertions []walletguard.Assertion) error {
	return s.guard.Authorize(intent, assertions)
}

func (s *O2ULWalletService) GenerateSpendProof(ctx context.Context, mode proverclient.Mode, req proverclient.Request) ([]byte, error) {
	return s.prover.GenerateProof(ctx, mode, req)
}

func (s *O2ULWalletService) VerifyAuthorizeAndProve(
	ctx context.Context,
	headerStart uint64,
	headerEnd uint64,
	intent walletguard.SpendIntent,
	assertions []walletguard.Assertion,
	mode proverclient.Mode,
	proofReq proverclient.Request,
) ([]byte, error) {
	if _, err := s.lightClient.FetchRange(ctx, headerStart, headerEnd); err != nil {
		return nil, err
	}
	if err := s.guard.Authorize(intent, assertions); err != nil {
		return nil, err
	}
	proof, err := s.prover.GenerateProof(ctx, mode, proofReq)
	if err != nil {
		return nil, err
	}
	return proof, nil
}

func (s *O2ULWalletService) ScanNotes(walletID string, assetID string, includeSpent bool, limit int) ([]WalletNote, error) {
	walletID = strings.TrimSpace(walletID)
	assetID = strings.TrimSpace(assetID)
	if walletID == "" {
		return nil, fmt.Errorf("wallet id is required")
	}
	if assetID == "" {
		return nil, fmt.Errorf("asset id is required")
	}
	if limit <= 0 {
		limit = 25
	}

	notes := []WalletNote{
		{NoteID: walletID + "-note-01", AssetID: assetID, Amount: 14, Status: "unspent"},
		{NoteID: walletID + "-note-02", AssetID: assetID, Amount: 9, Status: "pending"},
		{NoteID: walletID + "-note-03", AssetID: assetID, Amount: 6, Status: "spent"},
	}

	s.mu.Lock()
	spentByWallet := map[string]bool{}
	for noteID, spent := range s.spentNotes[walletID] {
		spentByWallet[noteID] = spent
	}
	s.mu.Unlock()
	if spentByWallet != nil {
		for i := range notes {
			if spentByWallet[notes[i].NoteID] {
				notes[i].Status = "spent"
			}
		}
	}

	filtered := make([]WalletNote, 0, len(notes))
	for _, note := range notes {
		if !includeSpent && note.Status == "spent" {
			continue
		}
		filtered = append(filtered, note)
		if len(filtered) >= limit {
			break
		}
	}
	return filtered, nil
}

func (s *O2ULWalletService) BuildSpendTransaction(req WalletSpendBuild) ([]byte, error) {
	req.WalletID = strings.TrimSpace(req.WalletID)
	req.Recipient = strings.TrimSpace(req.Recipient)
	req.AssetID = strings.TrimSpace(req.AssetID)
	if req.WalletID == "" {
		return nil, fmt.Errorf("wallet id is required")
	}
	if req.Recipient == "" {
		return nil, fmt.Errorf("recipient is required")
	}
	if req.AssetID == "" {
		return nil, fmt.Errorf("asset id is required")
	}
	if req.Amount == 0 {
		return nil, fmt.Errorf("amount must be greater than zero")
	}
	if len(req.InputNotes) == 0 {
		return nil, fmt.Errorf("at least one input note is required")
	}

	inputBudget := uint64(len(req.InputNotes)) * 16
	if inputBudget < req.Amount+req.Fee {
		return nil, fmt.Errorf("insufficient note input budget for amount+fee")
	}

	payload, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}
	return payload, nil
}

func (s *O2ULWalletService) SubmitTransaction(walletID string, unsignedTx []byte) (WalletTransaction, error) {
	walletID = strings.TrimSpace(walletID)
	if walletID == "" {
		return WalletTransaction{}, fmt.Errorf("wallet id is required")
	}
	if len(unsignedTx) == 0 {
		return WalletTransaction{}, fmt.Errorf("unsigned transaction is required")
	}

	var spend WalletSpendBuild
	if err := json.Unmarshal(unsignedTx, &spend); err != nil {
		return WalletTransaction{}, fmt.Errorf("invalid unsigned transaction payload")
	}
	if strings.TrimSpace(spend.WalletID) != walletID {
		return WalletTransaction{}, fmt.Errorf("wallet id mismatch in unsigned transaction")
	}

	txSum := sha256.Sum256(unsignedTx)
	txID := "tx-" + hex.EncodeToString(txSum[:12])
	now := time.Now().UTC().Format(time.RFC3339)
	tx := WalletTransaction{
		TxID:         txID,
		WalletID:     walletID,
		AssetID:      spend.AssetID,
		Amount:       spend.Amount,
		Fee:          spend.Fee,
		InputNotes:   append([]string(nil), spend.InputNotes...),
		Status:       "submitted",
		SubmittedAt:  now,
		TotalOutflow: spend.Amount + spend.Fee,
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.transactions[txID] = tx
	if s.spentNotes[walletID] == nil {
		s.spentNotes[walletID] = map[string]bool{}
	}
	for _, noteID := range spend.InputNotes {
		s.spentNotes[walletID][noteID] = true
	}

	return tx, nil
}

func (s *O2ULWalletService) GetTransactionStatus(walletID string, txID string) (WalletTransaction, error) {
	walletID = strings.TrimSpace(walletID)
	txID = strings.TrimSpace(txID)
	if walletID == "" {
		return WalletTransaction{}, fmt.Errorf("wallet id is required")
	}
	if txID == "" {
		return WalletTransaction{}, fmt.Errorf("transaction id is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	tx, ok := s.transactions[txID]
	if !ok {
		return WalletTransaction{}, fmt.Errorf("transaction not found")
	}
	if tx.WalletID != walletID {
		return WalletTransaction{}, fmt.Errorf("transaction does not belong to wallet")
	}
	return tx, nil
}
