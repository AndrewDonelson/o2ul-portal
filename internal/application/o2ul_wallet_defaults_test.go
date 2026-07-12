package application

import (
	"strings"
	"testing"
)

func TestNewDefaultO2ULWalletServiceUsesBlockchainHeaderVectors(t *testing.T) {
	svc, err := NewDefaultO2ULWalletService()
	if err != nil {
		t.Fatalf("NewDefaultO2ULWalletService failed: %v", err)
	}

	headers, err := svc.VerifyClientAgainstRange(t.Context(), 0, 1)
	if err != nil {
		t.Fatalf("VerifyClientAgainstRange failed: %v", err)
	}
	if len(headers) != 2 {
		t.Fatalf("expected 2 headers, got %d", len(headers))
	}
	if headers[1].ParentHash != headers[0].BlockHash {
		t.Fatalf("expected fixture parent hash linkage, got parent=%s blockHash=%s", headers[1].ParentHash, headers[0].BlockHash)
	}
}

func TestDefaultWalletServiceRejectsMissingFixtureRange(t *testing.T) {
	svc, err := NewDefaultO2ULWalletService()
	if err != nil {
		t.Fatalf("NewDefaultO2ULWalletService failed: %v", err)
	}

	_, err = svc.VerifyClientAgainstRange(t.Context(), 1, 2)
	if err == nil {
		t.Fatal("expected missing fixture error")
	}
}

func TestDefaultWalletServiceSupportsExtendedProfile(t *testing.T) {
	t.Setenv(WalletHeaderFixtureProfileEnv, "ethapi-extended")

	svc, err := NewDefaultO2ULWalletService()
	if err != nil {
		t.Fatalf("NewDefaultO2ULWalletService failed: %v", err)
	}

	headers, err := svc.VerifyClientAgainstRange(t.Context(), 9, 9)
	if err != nil {
		t.Fatalf("VerifyClientAgainstRange failed: %v", err)
	}
	if len(headers) != 1 {
		t.Fatalf("expected 1 header, got %d", len(headers))
	}
	if headers[0].Number != 9 {
		t.Fatalf("expected header number 9, got %d", headers[0].Number)
	}
}

func TestDefaultWalletServiceRejectsUnknownProfile(t *testing.T) {
	t.Setenv(WalletHeaderFixtureProfileEnv, "unknown-profile")

	_, err := NewDefaultO2ULWalletService()
	if err == nil {
		t.Fatal("expected profile selection error")
	}
	if !strings.Contains(err.Error(), "unsupported wallet header fixture profile") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDefaultWalletServiceSupportsHTTP3FixtureProfile(t *testing.T) {
	t.Setenv(WalletHeaderFixtureProfileEnv, "ethapi-http3-fixture")

	svc, err := NewDefaultO2ULWalletService()
	if err != nil {
		t.Fatalf("NewDefaultO2ULWalletService failed: %v", err)
	}
	headers, err := svc.VerifyClientAgainstRange(t.Context(), 0, 1)
	if err != nil {
		t.Fatalf("VerifyClientAgainstRange failed: %v", err)
	}
	if len(headers) != 2 {
		t.Fatalf("expected 2 headers, got %d", len(headers))
	}
	if headers[1].ParentHash != headers[0].BlockHash {
		t.Fatalf("expected parent linkage, parent=%s blockHash=%s", headers[1].ParentHash, headers[0].BlockHash)
	}
}

func TestDefaultWalletServiceRejectsHTTP3RPCProfileWithoutEndpoint(t *testing.T) {
	t.Setenv(WalletHeaderFixtureProfileEnv, "ethapi-http3-rpc")
	t.Setenv(WalletHeaderRPCURLEnv, "")

	_, err := NewDefaultO2ULWalletService()
	if err == nil {
		t.Fatal("expected missing rpc endpoint error")
	}
	if !strings.Contains(err.Error(), WalletHeaderRPCURLEnv) {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDefaultWalletServiceWithProfileRejectsHTTP3RPCProfileNonHTTPS(t *testing.T) {
	_, err := NewDefaultO2ULWalletServiceWithProfile("ethapi-http3-rpc", "http://rpc.invalid")
	if err == nil {
		t.Fatal("expected non-https endpoint rejection")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "https") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDefaultWalletServiceWithProfileUsesHTTP3FixtureProfile(t *testing.T) {
	svc, err := NewDefaultO2ULWalletServiceWithProfile("ethapi-http3-fixture", "")
	if err != nil {
		t.Fatalf("NewDefaultO2ULWalletServiceWithProfile failed: %v", err)
	}
	headers, err := svc.VerifyClientAgainstRange(t.Context(), 0, 1)
	if err != nil {
		t.Fatalf("VerifyClientAgainstRange failed: %v", err)
	}
	if len(headers) != 2 {
		t.Fatalf("expected 2 headers, got %d", len(headers))
	}
}
