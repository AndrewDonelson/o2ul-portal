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
	h9, err := rpc.HeaderByNumber(context.Background(), 9)
	if err != nil {
		t.Fatalf("HeaderByNumber(9) failed: %v", err)
	}
	if h9.Number != 9 {
		t.Fatalf("expected header number 9, got %d", h9.Number)
	}
	h10, err := rpc.HeaderByNumber(context.Background(), 10)
	if err != nil {
		t.Fatalf("HeaderByNumber(10) failed: %v", err)
	}
	if h10.ParentHash != h9.BlockHash {
		t.Fatalf("expected 10->9 parent linkage, parent=%s blockHash9=%s", h10.ParentHash, h9.BlockHash)
	}
	h11, err := rpc.HeaderByNumber(context.Background(), 11)
	if err != nil {
		t.Fatalf("HeaderByNumber(11) failed: %v", err)
	}
	h12, err := rpc.HeaderByNumber(context.Background(), 12)
	if err != nil {
		t.Fatalf("HeaderByNumber(12) failed: %v", err)
	}
	if h12.ParentHash != h11.BlockHash {
		t.Fatalf("expected 12->11 parent linkage, parent=%s blockHash11=%s", h12.ParentHash, h11.BlockHash)
	}
	h13, err := rpc.HeaderByNumber(context.Background(), 13)
	if err != nil {
		t.Fatalf("HeaderByNumber(13) failed: %v", err)
	}
	if h13.ParentHash != h12.BlockHash {
		t.Fatalf("expected 13->12 parent linkage, parent=%s blockHash12=%s", h13.ParentHash, h12.BlockHash)
	}
	h14, err := rpc.HeaderByNumber(context.Background(), 14)
	if err != nil {
		t.Fatalf("HeaderByNumber(14) failed: %v", err)
	}
	if h14.ParentHash != h13.BlockHash {
		t.Fatalf("expected 14->13 parent linkage, parent=%s blockHash13=%s", h14.ParentHash, h13.BlockHash)
	}
	h15, err := rpc.HeaderByNumber(context.Background(), 15)
	if err != nil {
		t.Fatalf("HeaderByNumber(15) failed: %v", err)
	}
	if h15.ParentHash != h14.BlockHash {
		t.Fatalf("expected 15->14 parent linkage, parent=%s blockHash14=%s", h15.ParentHash, h14.BlockHash)
	}
	h16, err := rpc.HeaderByNumber(context.Background(), 16)
	if err != nil {
		t.Fatalf("HeaderByNumber(16) failed: %v", err)
	}
	if h16.ParentHash != h15.BlockHash {
		t.Fatalf("expected 16->15 parent linkage, parent=%s blockHash15=%s", h16.ParentHash, h15.BlockHash)
	}
	h17, err := rpc.HeaderByNumber(context.Background(), 17)
	if err != nil {
		t.Fatalf("HeaderByNumber(17) failed: %v", err)
	}
	if h17.ParentHash != h16.BlockHash {
		t.Fatalf("expected 17->16 parent linkage, parent=%s blockHash16=%s", h17.ParentHash, h16.BlockHash)
	}
	h18, err := rpc.HeaderByNumber(context.Background(), 18)
	if err != nil {
		t.Fatalf("HeaderByNumber(18) failed: %v", err)
	}
	if h18.ParentHash != h17.BlockHash {
		t.Fatalf("expected 18->17 parent linkage, parent=%s blockHash17=%s", h18.ParentHash, h17.BlockHash)
	}
	h19, err := rpc.HeaderByNumber(context.Background(), 19)
	if err != nil {
		t.Fatalf("HeaderByNumber(19) failed: %v", err)
	}
	if h19.ParentHash != h18.BlockHash {
		t.Fatalf("expected 19->18 parent linkage, parent=%s blockHash18=%s", h19.ParentHash, h18.BlockHash)
	}
	h20, err := rpc.HeaderByNumber(context.Background(), 20)
	if err != nil {
		t.Fatalf("HeaderByNumber(20) failed: %v", err)
	}
	if h20.ParentHash != h19.BlockHash {
		t.Fatalf("expected 20->19 parent linkage, parent=%s blockHash19=%s", h20.ParentHash, h19.BlockHash)
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
	_, err = rpc.HeaderByNumber(context.Background(), 21)
	if err == nil {
		t.Fatal("expected unknown header 21 error")
	}
}
