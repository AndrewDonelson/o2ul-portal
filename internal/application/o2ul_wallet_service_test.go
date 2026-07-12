package application

import (
	"context"
	"errors"
	"testing"

	"com.nlaak.backend-template/pkg/lightclient"
	"com.nlaak.backend-template/pkg/proverclient"
	"com.nlaak.backend-template/pkg/walletguard"
)

type walletLightClientFixture struct {
	headers []lightclient.Header
	err     error
	calls   int
}

func (f *walletLightClientFixture) FetchRange(_ context.Context, _ uint64, _ uint64) ([]lightclient.Header, error) {
	f.calls++
	if f.err != nil {
		return nil, f.err
	}
	return f.headers, nil
}

type walletProverFixture struct {
	proof []byte
	err   error
	calls int
}

func (f *walletProverFixture) GenerateProof(_ context.Context, _ proverclient.Mode, _ proverclient.Request) ([]byte, error) {
	f.calls++
	if f.err != nil {
		return nil, f.err
	}
	return f.proof, nil
}

type walletGuardFixture struct {
	err   error
	calls int
}

func (f *walletGuardFixture) Authorize(_ walletguard.SpendIntent, _ []walletguard.Assertion) error {
	f.calls++
	return f.err
}

func TestVerifyAuthorizeAndProveSuccess(t *testing.T) {
	light := &walletLightClientFixture{headers: []lightclient.Header{{Number: 1}, {Number: 2}}}
	prover := &walletProverFixture{proof: []byte("proof")}
	guard := &walletGuardFixture{}
	svc, err := NewO2ULWalletService(light, prover, guard)
	if err != nil {
		t.Fatalf("NewO2ULWalletService failed: %v", err)
	}

	proof, err := svc.VerifyAuthorizeAndProve(
		context.Background(),
		1,
		2,
		walletguard.SpendIntent{WalletID: "w1", Amount: 9, AssetID: "o2ul"},
		[]walletguard.Assertion{{Factor: walletguard.FactorDevice, Payload: "ok"}},
		proverclient.ModeAuto,
		proverclient.Request{CircuitID: "spend", Witness: []byte("w")},
	)
	if err != nil {
		t.Fatalf("VerifyAuthorizeAndProve failed: %v", err)
	}
	if string(proof) != "proof" {
		t.Fatalf("unexpected proof %q", string(proof))
	}
	if light.calls != 1 || guard.calls != 1 || prover.calls != 1 {
		t.Fatalf("unexpected call counts light=%d guard=%d prover=%d", light.calls, guard.calls, prover.calls)
	}
}

func TestVerifyAuthorizeAndProveStopsOnLightClientFailure(t *testing.T) {
	light := &walletLightClientFixture{err: errors.New("light unavailable")}
	prover := &walletProverFixture{proof: []byte("proof")}
	guard := &walletGuardFixture{}
	svc, err := NewO2ULWalletService(light, prover, guard)
	if err != nil {
		t.Fatalf("NewO2ULWalletService failed: %v", err)
	}

	_, err = svc.VerifyAuthorizeAndProve(
		context.Background(),
		1,
		2,
		walletguard.SpendIntent{WalletID: "w1", Amount: 9, AssetID: "o2ul"},
		nil,
		proverclient.ModeAuto,
		proverclient.Request{CircuitID: "spend", Witness: []byte("w")},
	)
	if err == nil {
		t.Fatal("expected light client error")
	}
	if guard.calls != 0 || prover.calls != 0 {
		t.Fatalf("expected no downstream calls on light client failure, got guard=%d prover=%d", guard.calls, prover.calls)
	}
}

func TestVerifyAuthorizeAndProveStopsOnGuardFailure(t *testing.T) {
	light := &walletLightClientFixture{headers: []lightclient.Header{{Number: 1}, {Number: 2}}}
	prover := &walletProverFixture{proof: []byte("proof")}
	guard := &walletGuardFixture{err: walletguard.ErrInsufficientFactors}
	svc, err := NewO2ULWalletService(light, prover, guard)
	if err != nil {
		t.Fatalf("NewO2ULWalletService failed: %v", err)
	}

	_, err = svc.VerifyAuthorizeAndProve(
		context.Background(),
		1,
		2,
		walletguard.SpendIntent{WalletID: "w1", Amount: 9, AssetID: "o2ul"},
		nil,
		proverclient.ModeAuto,
		proverclient.Request{CircuitID: "spend", Witness: []byte("w")},
	)
	if !errors.Is(err, walletguard.ErrInsufficientFactors) {
		t.Fatalf("expected ErrInsufficientFactors, got %v", err)
	}
	if prover.calls != 0 {
		t.Fatalf("expected prover not called after guard failure, got %d", prover.calls)
	}
}
