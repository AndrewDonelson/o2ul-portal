package walletguard

import (
	"errors"
	"testing"
)

type fixtureVerifier struct{ validPayload string }

func (f fixtureVerifier) Verify(_ SpendIntent, assertion Assertion) bool {
	return assertion.Payload == f.validPayload
}

func TestAuthorizeTwoOfThreeSuccess(t *testing.T) {
	guard, err := NewGuard(2, map[Factor]Verifier{
		FactorDevice:   fixtureVerifier{validPayload: "ok-device"},
		FactorPasskey:  fixtureVerifier{validPayload: "ok-passkey"},
		FactorGuardian: fixtureVerifier{validPayload: "ok-guardian"},
	})
	if err != nil {
		t.Fatalf("NewGuard failed: %v", err)
	}
	intent := SpendIntent{WalletID: "w1", Amount: 10, AssetID: "o2ul"}
	err = guard.Authorize(intent, []Assertion{
		{Factor: FactorDevice, Payload: "ok-device"},
		{Factor: FactorPasskey, Payload: "ok-passkey"},
	})
	if err != nil {
		t.Fatalf("Authorize should succeed, got %v", err)
	}
}

func TestAuthorizeRejectsSingleFactorCompromise(t *testing.T) {
	guard, err := NewGuard(2, map[Factor]Verifier{
		FactorDevice:   fixtureVerifier{validPayload: "ok-device"},
		FactorPasskey:  fixtureVerifier{validPayload: "ok-passkey"},
		FactorGuardian: fixtureVerifier{validPayload: "ok-guardian"},
	})
	if err != nil {
		t.Fatalf("NewGuard failed: %v", err)
	}
	intent := SpendIntent{WalletID: "w1", Amount: 10, AssetID: "o2ul"}
	err = guard.Authorize(intent, []Assertion{{Factor: FactorDevice, Payload: "ok-device"}})
	if !errors.Is(err, ErrInsufficientFactors) {
		t.Fatalf("expected ErrInsufficientFactors, got %v", err)
	}
}

func TestAuthorizeDedupesDuplicateFactor(t *testing.T) {
	guard, err := NewGuard(2, map[Factor]Verifier{
		FactorDevice:  fixtureVerifier{validPayload: "ok-device"},
		FactorPasskey: fixtureVerifier{validPayload: "ok-passkey"},
	})
	if err != nil {
		t.Fatalf("NewGuard failed: %v", err)
	}
	intent := SpendIntent{WalletID: "w1", Amount: 10, AssetID: "o2ul"}
	err = guard.Authorize(intent, []Assertion{
		{Factor: FactorDevice, Payload: "ok-device"},
		{Factor: FactorDevice, Payload: "ok-device"},
	})
	if !errors.Is(err, ErrInsufficientFactors) {
		t.Fatalf("expected duplicate factors not to count twice, got %v", err)
	}
}

func TestAuthorizeRecoveryAndRotationSuccess(t *testing.T) {
	guard, err := NewGuard(2, map[Factor]Verifier{
		FactorDevice:   fixtureVerifier{validPayload: "ok-device"},
		FactorPasskey:  fixtureVerifier{validPayload: "ok-passkey"},
		FactorGuardian: fixtureVerifier{validPayload: "ok-guardian"},
	})
	if err != nil {
		t.Fatalf("NewGuard failed: %v", err)
	}
	intent := SpendIntent{WalletID: "w1", Amount: 10, AssetID: "o2ul"}
	err = guard.AuthorizeRecovery(
		intent,
		[]Assertion{{Factor: FactorDevice, Payload: "ok-device"}, {Factor: FactorPasskey, Payload: "ok-passkey"}},
		[]Assertion{{Factor: FactorPasskey, Payload: "ok-passkey"}, {Factor: FactorGuardian, Payload: "ok-guardian"}},
	)
	if err != nil {
		t.Fatalf("AuthorizeRecovery should succeed, got %v", err)
	}
}

func TestAuthorizeRecoveryRejectsSingleFactorCompromise(t *testing.T) {
	guard, err := NewGuard(2, map[Factor]Verifier{
		FactorDevice:   fixtureVerifier{validPayload: "ok-device"},
		FactorPasskey:  fixtureVerifier{validPayload: "ok-passkey"},
		FactorGuardian: fixtureVerifier{validPayload: "ok-guardian"},
	})
	if err != nil {
		t.Fatalf("NewGuard failed: %v", err)
	}
	intent := SpendIntent{WalletID: "w1", Amount: 10, AssetID: "o2ul"}
	err = guard.AuthorizeRecovery(
		intent,
		[]Assertion{{Factor: FactorDevice, Payload: "ok-device"}},
		[]Assertion{{Factor: FactorPasskey, Payload: "ok-passkey"}, {Factor: FactorGuardian, Payload: "ok-guardian"}},
	)
	if !errors.Is(err, ErrInsufficientFactors) {
		t.Fatalf("expected ErrInsufficientFactors for compromised recovery factors, got %v", err)
	}
}

func TestAuthorizeRecoveryRejectsWeakReplacementSet(t *testing.T) {
	guard, err := NewGuard(2, map[Factor]Verifier{
		FactorDevice:   fixtureVerifier{validPayload: "ok-device"},
		FactorPasskey:  fixtureVerifier{validPayload: "ok-passkey"},
		FactorGuardian: fixtureVerifier{validPayload: "ok-guardian"},
	})
	if err != nil {
		t.Fatalf("NewGuard failed: %v", err)
	}
	intent := SpendIntent{WalletID: "w1", Amount: 10, AssetID: "o2ul"}
	err = guard.AuthorizeRecovery(
		intent,
		[]Assertion{{Factor: FactorDevice, Payload: "ok-device"}, {Factor: FactorPasskey, Payload: "ok-passkey"}},
		[]Assertion{{Factor: FactorGuardian, Payload: "ok-guardian"}},
	)
	if !errors.Is(err, ErrInsufficientFactors) {
		t.Fatalf("expected ErrInsufficientFactors for weak replacement factors, got %v", err)
	}
}
