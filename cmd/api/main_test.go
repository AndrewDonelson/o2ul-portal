package main

import (
	"strings"
	"testing"

	"com.nlaak.backend-template/internal/infrastructure/config"
)

func TestExtractPort(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "empty", in: "", want: ""},
		{name: "colon only", in: ":8080", want: "8080"},
		{name: "host port", in: "127.0.0.1:8081", want: "8081"},
		{name: "trimmed", in: " localhost:9000 ", want: "9000"},
		{name: "raw suffix", in: "service:7000", want: "7000"},
	}
	for _, tc := range tests {
		if got := extractPort(tc.in); got != tc.want {
			t.Fatalf("%s: extractPort(%q)=%q want=%q", tc.name, tc.in, got, tc.want)
		}
	}
}

func TestAPIOriginTag(t *testing.T) {
	if got := apiOriginTag(":8080"); got != "API-8080" {
		t.Fatalf("unexpected tag: %q", got)
	}
	if got := apiOriginTag(""); got != "API" {
		t.Fatalf("unexpected fallback tag: %q", got)
	}
}

func TestNewConfiguredO2ULWalletService_DefaultProfile(t *testing.T) {
	_, err := newConfiguredO2ULWalletService(config.Config{})
	if err != nil {
		t.Fatalf("newConfiguredO2ULWalletService failed: %v", err)
	}
}

func TestNewConfiguredO2ULWalletService_RejectsNonHTTPSRPCProfile(t *testing.T) {
	_, err := newConfiguredO2ULWalletService(config.Config{
		O2ULWalletHeaderProfile: "ethapi-http3-rpc",
		O2ULWalletRPCURL:        "http://rpc.invalid",
	})
	if err == nil {
		t.Fatal("expected non-https endpoint rejection")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "https") {
		t.Fatalf("unexpected error: %v", err)
	}
}
