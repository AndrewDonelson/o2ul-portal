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

func TestDefaultWalletServiceProfileParity_ExtendedAndHTTP3Fixture(t *testing.T) {
	extendedSvc, err := NewDefaultO2ULWalletServiceWithProfile("ethapi-extended", "")
	if err != nil {
		t.Fatalf("extended service init failed: %v", err)
	}
	http3FixtureSvc, err := NewDefaultO2ULWalletServiceWithProfile("ethapi-http3-fixture", "")
	if err != nil {
		t.Fatalf("http3 fixture service init failed: %v", err)
	}

	extendedHeaders, err := extendedSvc.VerifyClientAgainstRange(t.Context(), 9, 10)
	if err != nil {
		t.Fatalf("extended VerifyClientAgainstRange failed: %v", err)
	}
	http3Headers, err := http3FixtureSvc.VerifyClientAgainstRange(t.Context(), 9, 10)
	if err != nil {
		t.Fatalf("http3 fixture VerifyClientAgainstRange failed: %v", err)
	}

	if len(extendedHeaders) != 2 || len(http3Headers) != 2 {
		t.Fatalf("expected two headers from both profiles, got extended=%d http3=%d", len(extendedHeaders), len(http3Headers))
	}
	if extendedHeaders[0].Number != 9 || extendedHeaders[1].Number != 10 {
		t.Fatalf("unexpected extended range ordering: %+v", extendedHeaders)
	}
	if http3Headers[0].Number != 9 || http3Headers[1].Number != 10 {
		t.Fatalf("unexpected http3 fixture range ordering: %+v", http3Headers)
	}
	if extendedHeaders[1].ParentHash != extendedHeaders[0].BlockHash {
		t.Fatalf("extended 10->9 linkage mismatch: parent=%s blockHash9=%s", extendedHeaders[1].ParentHash, extendedHeaders[0].BlockHash)
	}
	if http3Headers[1].ParentHash != http3Headers[0].BlockHash {
		t.Fatalf("http3 fixture 10->9 linkage mismatch: parent=%s blockHash9=%s", http3Headers[1].ParentHash, http3Headers[0].BlockHash)
	}
	if extendedHeaders[0] != http3Headers[0] || extendedHeaders[1] != http3Headers[1] {
		t.Fatalf("profile parity mismatch: extended=%+v http3=%+v", extendedHeaders, http3Headers)
	}
}

func TestDefaultWalletServiceProfileParity_UnsupportedHighRangeGap(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			svc, err := NewDefaultO2ULWalletServiceWithProfile(profile, "")
			if err != nil {
				t.Fatalf("service init failed: %v", err)
			}
			_, err = svc.VerifyClientAgainstRange(t.Context(), 10, 11)
			if err == nil {
				t.Fatal("expected unsupported range error")
			}
			if !strings.Contains(strings.ToLower(err.Error()), "parent hash mismatch") {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func TestDefaultWalletServiceProfileParity_SingleHeader11Success(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			svc, err := NewDefaultO2ULWalletServiceWithProfile(profile, "")
			if err != nil {
				t.Fatalf("service init failed: %v", err)
			}
			headers, err := svc.VerifyClientAgainstRange(t.Context(), 11, 11)
			if err != nil {
				t.Fatalf("VerifyClientAgainstRange failed: %v", err)
			}
			if len(headers) != 1 {
				t.Fatalf("expected 1 header, got %d", len(headers))
			}
			if headers[0].Number != 11 {
				t.Fatalf("expected header number 11, got %d", headers[0].Number)
			}
		})
	}
}

func TestDefaultWalletServiceProfileParity_Contiguous11To12Success(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			svc, err := NewDefaultO2ULWalletServiceWithProfile(profile, "")
			if err != nil {
				t.Fatalf("service init failed: %v", err)
			}
			headers, err := svc.VerifyClientAgainstRange(t.Context(), 11, 12)
			if err != nil {
				t.Fatalf("VerifyClientAgainstRange failed: %v", err)
			}
			if len(headers) != 2 {
				t.Fatalf("expected 2 headers, got %d", len(headers))
			}
			if headers[0].Number != 11 || headers[1].Number != 12 {
				t.Fatalf("unexpected range ordering: %+v", headers)
			}
			if headers[1].ParentHash != headers[0].BlockHash {
				t.Fatalf("expected 12->11 linkage, parent=%s blockHash11=%s", headers[1].ParentHash, headers[0].BlockHash)
			}
		})
	}
}

func TestDefaultWalletServiceProfileParity_Contiguous12To13Success(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			svc, err := NewDefaultO2ULWalletServiceWithProfile(profile, "")
			if err != nil {
				t.Fatalf("service init failed: %v", err)
			}
			headers, err := svc.VerifyClientAgainstRange(t.Context(), 12, 13)
			if err != nil {
				t.Fatalf("VerifyClientAgainstRange failed: %v", err)
			}
			if len(headers) != 2 {
				t.Fatalf("expected 2 headers, got %d", len(headers))
			}
			if headers[0].Number != 12 || headers[1].Number != 13 {
				t.Fatalf("unexpected range ordering: %+v", headers)
			}
			if headers[1].ParentHash != headers[0].BlockHash {
				t.Fatalf("expected 13->12 linkage, parent=%s blockHash12=%s", headers[1].ParentHash, headers[0].BlockHash)
			}
		})
	}
}

func TestDefaultWalletServiceProfileParity_Contiguous13To14Success(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			svc, err := NewDefaultO2ULWalletServiceWithProfile(profile, "")
			if err != nil {
				t.Fatalf("service init failed: %v", err)
			}
			headers, err := svc.VerifyClientAgainstRange(t.Context(), 13, 14)
			if err != nil {
				t.Fatalf("VerifyClientAgainstRange failed: %v", err)
			}
			if len(headers) != 2 {
				t.Fatalf("expected 2 headers, got %d", len(headers))
			}
			if headers[0].Number != 13 || headers[1].Number != 14 {
				t.Fatalf("unexpected range ordering: %+v", headers)
			}
			if headers[1].ParentHash != headers[0].BlockHash {
				t.Fatalf("expected 14->13 linkage, parent=%s blockHash13=%s", headers[1].ParentHash, headers[0].BlockHash)
			}
		})
	}
}

func TestDefaultWalletServiceProfileParity_Contiguous14To15Success(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			svc, err := NewDefaultO2ULWalletServiceWithProfile(profile, "")
			if err != nil {
				t.Fatalf("service init failed: %v", err)
			}
			headers, err := svc.VerifyClientAgainstRange(t.Context(), 14, 15)
			if err != nil {
				t.Fatalf("VerifyClientAgainstRange failed: %v", err)
			}
			if len(headers) != 2 {
				t.Fatalf("expected 2 headers, got %d", len(headers))
			}
			if headers[0].Number != 14 || headers[1].Number != 15 {
				t.Fatalf("unexpected range ordering: %+v", headers)
			}
			if headers[1].ParentHash != headers[0].BlockHash {
				t.Fatalf("expected 15->14 linkage, parent=%s blockHash14=%s", headers[1].ParentHash, headers[0].BlockHash)
			}
		})
	}
}

func TestDefaultWalletServiceProfileParity_Contiguous15To16Success(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			svc, err := NewDefaultO2ULWalletServiceWithProfile(profile, "")
			if err != nil {
				t.Fatalf("service init failed: %v", err)
			}
			headers, err := svc.VerifyClientAgainstRange(t.Context(), 15, 16)
			if err != nil {
				t.Fatalf("VerifyClientAgainstRange failed: %v", err)
			}
			if len(headers) != 2 {
				t.Fatalf("expected 2 headers, got %d", len(headers))
			}
			if headers[0].Number != 15 || headers[1].Number != 16 {
				t.Fatalf("unexpected range ordering: %+v", headers)
			}
			if headers[1].ParentHash != headers[0].BlockHash {
				t.Fatalf("expected 16->15 linkage, parent=%s blockHash15=%s", headers[1].ParentHash, headers[0].BlockHash)
			}
		})
	}
}

func TestDefaultWalletServiceProfileParity_Contiguous16To17Success(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			svc, err := NewDefaultO2ULWalletServiceWithProfile(profile, "")
			if err != nil {
				t.Fatalf("service init failed: %v", err)
			}
			headers, err := svc.VerifyClientAgainstRange(t.Context(), 16, 17)
			if err != nil {
				t.Fatalf("VerifyClientAgainstRange failed: %v", err)
			}
			if len(headers) != 2 {
				t.Fatalf("expected 2 headers, got %d", len(headers))
			}
			if headers[0].Number != 16 || headers[1].Number != 17 {
				t.Fatalf("unexpected range ordering: %+v", headers)
			}
			if headers[1].ParentHash != headers[0].BlockHash {
				t.Fatalf("expected 17->16 linkage, parent=%s blockHash16=%s", headers[1].ParentHash, headers[0].BlockHash)
			}
		})
	}
}

func TestDefaultWalletServiceProfileParity_Contiguous17To18Success(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			svc, err := NewDefaultO2ULWalletServiceWithProfile(profile, "")
			if err != nil {
				t.Fatalf("service init failed: %v", err)
			}
			headers, err := svc.VerifyClientAgainstRange(t.Context(), 17, 18)
			if err != nil {
				t.Fatalf("VerifyClientAgainstRange failed: %v", err)
			}
			if len(headers) != 2 {
				t.Fatalf("expected 2 headers, got %d", len(headers))
			}
			if headers[0].Number != 17 || headers[1].Number != 18 {
				t.Fatalf("unexpected range ordering: %+v", headers)
			}
			if headers[1].ParentHash != headers[0].BlockHash {
				t.Fatalf("expected 18->17 linkage, parent=%s blockHash17=%s", headers[1].ParentHash, headers[0].BlockHash)
			}
		})
	}
}

func TestDefaultWalletServiceProfileParity_Contiguous19To20Success(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			svc, err := NewDefaultO2ULWalletServiceWithProfile(profile, "")
			if err != nil {
				t.Fatalf("service init failed: %v", err)
			}
			headers, err := svc.VerifyClientAgainstRange(t.Context(), 19, 20)
			if err != nil {
				t.Fatalf("VerifyClientAgainstRange failed: %v", err)
			}
			if len(headers) != 2 {
				t.Fatalf("expected 2 headers, got %d", len(headers))
			}
			if headers[0].Number != 19 || headers[1].Number != 20 {
				t.Fatalf("unexpected range ordering: %+v", headers)
			}
			if headers[1].ParentHash != headers[0].BlockHash {
				t.Fatalf("expected 20->19 linkage, parent=%s blockHash19=%s", headers[1].ParentHash, headers[0].BlockHash)
			}
		})
	}
}

func TestDefaultWalletServiceProfileParity_Contiguous20To21Success(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			svc, err := NewDefaultO2ULWalletServiceWithProfile(profile, "")
			if err != nil {
				t.Fatalf("service init failed: %v", err)
			}
			headers, err := svc.VerifyClientAgainstRange(t.Context(), 20, 21)
			if err != nil {
				t.Fatalf("VerifyClientAgainstRange failed: %v", err)
			}
			if len(headers) != 2 {
				t.Fatalf("expected 2 headers, got %d", len(headers))
			}
			if headers[0].Number != 20 || headers[1].Number != 21 {
				t.Fatalf("unexpected range ordering: %+v", headers)
			}
			if headers[1].ParentHash != headers[0].BlockHash {
				t.Fatalf("expected 21->20 linkage, parent=%s blockHash20=%s", headers[1].ParentHash, headers[0].BlockHash)
			}
		})
	}
}

func TestDefaultWalletServiceProfileParity_SingleUnsupported22(t *testing.T) {
	profiles := []string{"ethapi-extended", "ethapi-http3-fixture"}
	for _, profile := range profiles {
		t.Run(profile, func(t *testing.T) {
			svc, err := NewDefaultO2ULWalletServiceWithProfile(profile, "")
			if err != nil {
				t.Fatalf("service init failed: %v", err)
			}
			_, err = svc.VerifyClientAgainstRange(t.Context(), 22, 22)
			if err == nil {
				t.Fatal("expected unsupported single-header error")
			}
			if !strings.Contains(strings.ToLower(err.Error()), "not found") {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}
