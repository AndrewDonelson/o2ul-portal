package walletguard

import (
	"errors"
	"fmt"
)

var ErrInsufficientFactors = errors.New("insufficient valid factors for spend authorization")

type Factor string

const (
	FactorDevice   Factor = "device"
	FactorPasskey  Factor = "passkey"
	FactorGuardian Factor = "guardian"
)

type Assertion struct {
	Factor  Factor
	Payload string
}

type SpendIntent struct {
	WalletID string
	Amount   uint64
	AssetID  string
}

type Verifier interface {
	Verify(intent SpendIntent, assertion Assertion) bool
}

type Guard struct {
	threshold int
	verifiers map[Factor]Verifier
}

func NewGuard(threshold int, verifiers map[Factor]Verifier) (*Guard, error) {
	if threshold < 1 {
		return nil, fmt.Errorf("threshold must be >= 1")
	}
	return &Guard{threshold: threshold, verifiers: verifiers}, nil
}

func (g *Guard) Authorize(intent SpendIntent, assertions []Assertion) error {
	if intent.WalletID == "" || intent.AssetID == "" || intent.Amount == 0 {
		return fmt.Errorf("invalid spend intent")
	}
	return g.approval(intent, assertions)
}

func (g *Guard) AuthorizeRecovery(intent SpendIntent, recoveryAssertions []Assertion, replacementAssertions []Assertion) error {
	if intent.WalletID == "" || intent.AssetID == "" || intent.Amount == 0 {
		return fmt.Errorf("invalid spend intent")
	}
	if err := g.approval(intent, recoveryAssertions); err != nil {
		return err
	}
	if err := g.approval(intent, replacementAssertions); err != nil {
		return err
	}
	return nil
}

func (g *Guard) approval(intent SpendIntent, assertions []Assertion) error {
	approved := 0
	seen := map[Factor]struct{}{}
	for _, assertion := range assertions {
		if _, dup := seen[assertion.Factor]; dup {
			continue
		}
		seen[assertion.Factor] = struct{}{}
		verifier, ok := g.verifiers[assertion.Factor]
		if !ok {
			continue
		}
		if verifier.Verify(intent, assertion) {
			approved++
		}
	}
	if approved < g.threshold {
		return ErrInsufficientFactors
	}
	return nil
}
