package lightclient

import (
	"context"
	"errors"
	"testing"
)

type fixtureRPC struct {
	headers map[uint64]Header
	errAt   uint64
}

func (f fixtureRPC) HeaderByNumber(_ context.Context, number uint64) (Header, error) {
	if f.errAt == number {
		return Header{}, errors.New("fixture error")
	}
	h, ok := f.headers[number]
	if !ok {
		return Header{}, errors.New("not found")
	}
	return h, nil
}

func TestFetchRangeAndVerifyChain(t *testing.T) {
	h0 := Header{Number: 10, ParentHash: "0xgenesis", StateRoot: "0xaaa"}
	h1 := Header{Number: 11, ParentHash: HashHeader(h0), StateRoot: "0xbbb"}
	h2 := Header{Number: 12, ParentHash: HashHeader(h1), StateRoot: "0xccc"}
	c := NewClient(fixtureRPC{headers: map[uint64]Header{10: h0, 11: h1, 12: h2}})

	headers, err := c.FetchRange(context.Background(), 10, 12)
	if err != nil {
		t.Fatalf("FetchRange failed: %v", err)
	}
	if len(headers) != 3 {
		t.Fatalf("expected 3 headers, got %d", len(headers))
	}
}

func TestFetchRangeRejectsBrokenChain(t *testing.T) {
	h0 := Header{Number: 1, ParentHash: "0xgenesis", StateRoot: "0xaaa"}
	h1 := Header{Number: 2, ParentHash: "0xwrong", StateRoot: "0xbbb"}
	c := NewClient(fixtureRPC{headers: map[uint64]Header{1: h0, 2: h1}})

	_, err := c.FetchRange(context.Background(), 1, 2)
	if err == nil {
		t.Fatal("expected chain verification error")
	}
}

func TestVerifyInclusionProof(t *testing.T) {
	leaf := "0xleaf"
	sibling := "0xsibling"
	root := hashPair(leaf, sibling)
	proof := InclusionProof{LeafHash: leaf, SiblingHashes: []string{sibling}, LeafIndex: 0, RootHash: root}
	if !VerifyInclusionProof(proof) {
		t.Fatal("expected inclusion proof to verify")
	}
	proof.RootHash = "0xdead"
	if VerifyInclusionProof(proof) {
		t.Fatal("expected tampered root proof to fail")
	}
}

func TestVerifyHeaderChainSupportsBlockchainHashes(t *testing.T) {
	headers := []Header{
		{
			Number:     0,
			ParentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
			StateRoot:  "0xd883f48b83cc9c1e8389453beb4ad4e572462eec049ca4fffbe16ecefb3fe937",
			BlockHash:  "0x98e056de84de969782b238b4509b32814627ba443ea622054a79c2bc7e4d92c7",
		},
		{
			Number:     1,
			ParentHash: "0x98e056de84de969782b238b4509b32814627ba443ea622054a79c2bc7e4d92c7",
			StateRoot:  "0x4acfcd1a6ab9f5e62411021ecd8a749976ae50b0590e967471264b372d7ac55b",
			BlockHash:  "0xeeb5c1852740ca4bbe65b0f57baf80634ed12a2b44affe30eec3fb54437c3926",
		},
	}

	if err := VerifyHeaderChain(headers); err != nil {
		t.Fatalf("expected blockchain-shaped chain to verify, got %v", err)
	}
}
