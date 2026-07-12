package proverclient

import (
	"context"
	"errors"
	"fmt"
)

var ErrNoProofBackend = errors.New("no proof backend is available")
var ErrUnpairedDevice = errors.New("delegated proving requires a paired device")

type Request struct {
	CircuitID      string
	Witness        []byte
	PairedDeviceID string
}

type LocalProver interface {
	Prove(ctx context.Context, circuitID string, witness []byte) ([]byte, error)
}

type DelegatedProver interface {
	RequestProof(ctx context.Context, pairedDeviceID string, circuitID string, witness []byte) ([]byte, error)
}

type PairingRegistry interface {
	IsPaired(deviceID string) bool
}

type Mode string

const (
	ModeLocal     Mode = "local"
	ModeDelegated Mode = "delegated"
	ModeAuto      Mode = "auto"
)

type Client struct {
	local    LocalProver
	delegate DelegatedProver
	pairs    PairingRegistry
}

func NewClient(local LocalProver, delegate DelegatedProver, pairs PairingRegistry) *Client {
	return &Client{local: local, delegate: delegate, pairs: pairs}
}

func (c *Client) GenerateProof(ctx context.Context, mode Mode, req Request) ([]byte, error) {
	if req.CircuitID == "" {
		return nil, fmt.Errorf("circuit id is required")
	}
	if len(req.Witness) == 0 {
		return nil, fmt.Errorf("witness is required")
	}
	switch mode {
	case ModeLocal:
		if c.local == nil {
			return nil, ErrNoProofBackend
		}
		return c.local.Prove(ctx, req.CircuitID, req.Witness)
	case ModeDelegated:
		return c.generateDelegated(ctx, req)
	case ModeAuto:
		if c.local != nil {
			proof, err := c.local.Prove(ctx, req.CircuitID, req.Witness)
			if err == nil {
				return proof, nil
			}
		}
		return c.generateDelegated(ctx, req)
	default:
		return nil, fmt.Errorf("invalid mode %q", mode)
	}
}

func (c *Client) generateDelegated(ctx context.Context, req Request) ([]byte, error) {
	if c.delegate == nil {
		return nil, ErrNoProofBackend
	}
	if req.PairedDeviceID == "" || c.pairs == nil || !c.pairs.IsPaired(req.PairedDeviceID) {
		return nil, ErrUnpairedDevice
	}
	return c.delegate.RequestProof(ctx, req.PairedDeviceID, req.CircuitID, req.Witness)
}
