package lightclient

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
)

var ErrHeaderChainBroken = errors.New("light client header chain is broken")

type Header struct {
	Number     uint64
	ParentHash string
	StateRoot  string
	BlockHash  string
}

type HeaderRPC interface {
	HeaderByNumber(ctx context.Context, number uint64) (Header, error)
}

type Client struct {
	rpc HeaderRPC
}

func NewClient(rpc HeaderRPC) *Client {
	return &Client{rpc: rpc}
}

func (c *Client) FetchRange(ctx context.Context, start uint64, end uint64) ([]Header, error) {
	if end < start {
		return nil, fmt.Errorf("invalid range start=%d end=%d", start, end)
	}
	out := make([]Header, 0, end-start+1)
	for n := start; n <= end; n++ {
		h, err := c.rpc.HeaderByNumber(ctx, n)
		if err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	if err := VerifyHeaderChain(out); err != nil {
		return nil, err
	}
	return out, nil
}

func VerifyHeaderChain(headers []Header) error {
	if len(headers) <= 1 {
		return nil
	}
	for i := 1; i < len(headers); i++ {
		prev := headers[i-1]
		curr := headers[i]
		if curr.Number != prev.Number+1 {
			return fmt.Errorf("%w: non-sequential headers at index=%d", ErrHeaderChainBroken, i)
		}
		expectedParent := HashHeader(prev)
		if curr.ParentHash != expectedParent {
			return fmt.Errorf("%w: parent hash mismatch at number=%d", ErrHeaderChainBroken, curr.Number)
		}
	}
	return nil
}

func HashHeader(h Header) string {
	if h.BlockHash != "" {
		return h.BlockHash
	}
	payload := fmt.Sprintf("%d|%s|%s", h.Number, h.ParentHash, h.StateRoot)
	sum := sha256.Sum256([]byte(payload))
	return "0x" + hex.EncodeToString(sum[:])
}

type InclusionProof struct {
	LeafHash      string
	SiblingHashes []string
	LeafIndex     uint64
	RootHash      string
}

func VerifyInclusionProof(proof InclusionProof) bool {
	if proof.LeafHash == "" || proof.RootHash == "" {
		return false
	}
	current := proof.LeafHash
	idx := proof.LeafIndex
	for _, sibling := range proof.SiblingHashes {
		if sibling == "" {
			return false
		}
		if idx%2 == 0 {
			current = hashPair(current, sibling)
		} else {
			current = hashPair(sibling, current)
		}
		idx = idx / 2
	}
	return current == proof.RootHash
}

func hashPair(left string, right string) string {
	sum := sha256.Sum256([]byte(left + "|" + right))
	return "0x" + hex.EncodeToString(sum[:])
}
