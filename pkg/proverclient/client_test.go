package proverclient

import (
	"context"
	"errors"
	"testing"
)

type localFixture struct {
	proof []byte
	err   error
}

func (l localFixture) Prove(_ context.Context, _ string, _ []byte) ([]byte, error) {
	if l.err != nil {
		return nil, l.err
	}
	return l.proof, nil
}

type delegatedFixture struct {
	proof []byte
	err   error
}

func (d delegatedFixture) RequestProof(_ context.Context, _ string, _ string, _ []byte) ([]byte, error) {
	if d.err != nil {
		return nil, d.err
	}
	return d.proof, nil
}

type pairingFixture map[string]bool

func (p pairingFixture) IsPaired(deviceID string) bool { return p[deviceID] }

func TestGenerateProofLocal(t *testing.T) {
	c := NewClient(localFixture{proof: []byte("local-proof")}, nil, nil)
	proof, err := c.GenerateProof(context.Background(), ModeLocal, Request{CircuitID: "c1", Witness: []byte("w")})
	if err != nil {
		t.Fatalf("GenerateProof local failed: %v", err)
	}
	if string(proof) != "local-proof" {
		t.Fatalf("unexpected proof %q", string(proof))
	}
}

func TestGenerateProofDelegatedRequiresPairedDevice(t *testing.T) {
	c := NewClient(nil, delegatedFixture{proof: []byte("delegated")}, pairingFixture{"device-1": false})
	_, err := c.GenerateProof(context.Background(), ModeDelegated, Request{CircuitID: "c1", Witness: []byte("w"), PairedDeviceID: "device-1"})
	if !errors.Is(err, ErrUnpairedDevice) {
		t.Fatalf("expected ErrUnpairedDevice, got %v", err)
	}
}

func TestGenerateProofAutoFallsBackToDelegated(t *testing.T) {
	c := NewClient(localFixture{err: errors.New("local unavailable")}, delegatedFixture{proof: []byte("delegated")}, pairingFixture{"device-1": true})
	proof, err := c.GenerateProof(context.Background(), ModeAuto, Request{CircuitID: "c1", Witness: []byte("w"), PairedDeviceID: "device-1"})
	if err != nil {
		t.Fatalf("GenerateProof auto failed: %v", err)
	}
	if string(proof) != "delegated" {
		t.Fatalf("unexpected proof %q", string(proof))
	}
}
