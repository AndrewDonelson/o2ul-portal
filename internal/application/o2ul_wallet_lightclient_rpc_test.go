package application

import (
	"context"
	"testing"
)

func TestHTTP3FixtureHeaderRPCReturnsBlockchainHeaders(t *testing.T) {
	rpc, err := newHTTP3HeaderRPC("https://fixtures.invalid", fixtureJSONRPCDoer{})
	if err != nil {
		t.Fatalf("newHTTP3HeaderRPC failed: %v", err)
	}

	h0, err := rpc.HeaderByNumber(context.Background(), 0)
	if err != nil {
		t.Fatalf("HeaderByNumber(0) failed: %v", err)
	}
	h1, err := rpc.HeaderByNumber(context.Background(), 1)
	if err != nil {
		t.Fatalf("HeaderByNumber(1) failed: %v", err)
	}
	if h1.ParentHash != h0.BlockHash {
		t.Fatalf("expected parent linkage, parent=%s blockHash=%s", h1.ParentHash, h0.BlockHash)
	}
}

func TestHTTP3HeaderRPCRejectsNonHTTPS(t *testing.T) {
	_, err := newHTTP3HeaderRPC("http://not-allowed", fixtureJSONRPCDoer{})
	if err == nil {
		t.Fatal("expected non-https endpoint rejection")
	}
}

func TestHTTP3FixtureHeaderRPCRejectsUnknownHeight(t *testing.T) {
	rpc, err := newHTTP3HeaderRPC("https://fixtures.invalid", fixtureJSONRPCDoer{})
	if err != nil {
		t.Fatalf("newHTTP3HeaderRPC failed: %v", err)
	}
	_, err = rpc.HeaderByNumber(context.Background(), 2)
	if err == nil {
		t.Fatal("expected unknown header error")
	}
}
