package config

import (
	"os"
	"reflect"
	"testing"
)

func TestEnvHelpers(t *testing.T) {
	t.Run("env uses fallback", func(t *testing.T) {
		t.Setenv("CFG_EMPTY", "")
		if got := env("CFG_EMPTY", "fallback"); got != "fallback" {
			t.Fatalf("env fallback mismatch: got=%q", got)
		}
	})

	t.Run("env reads value", func(t *testing.T) {
		t.Setenv("CFG_VALUE", "value")
		if got := env("CFG_VALUE", "fallback"); got != "value" {
			t.Fatalf("env value mismatch: got=%q", got)
		}
	})

	t.Run("envInt parses and falls back", func(t *testing.T) {
		t.Setenv("CFG_INT", "12")
		if got := envInt("CFG_INT", 3); got != 12 {
			t.Fatalf("envInt parse mismatch: got=%d", got)
		}
		t.Setenv("CFG_INT", "bad")
		if got := envInt("CFG_INT", 3); got != 3 {
			t.Fatalf("envInt fallback mismatch: got=%d", got)
		}
	})

	t.Run("envBool parses variants and fallback", func(t *testing.T) {
		cases := map[string]bool{"1": true, "true": true, "yes": true, "on": true, "0": false, "false": false, "no": false, "off": false}
		for raw, want := range cases {
			t.Setenv("CFG_BOOL", raw)
			if got := envBool("CFG_BOOL", !want); got != want {
				t.Fatalf("envBool(%q)=%v want=%v", raw, got, want)
			}
		}
		t.Setenv("CFG_BOOL", "maybe")
		if got := envBool("CFG_BOOL", true); got != true {
			t.Fatalf("envBool fallback mismatch: got=%v", got)
		}
	})

	t.Run("envList splits fields and falls back", func(t *testing.T) {
		fallback := []string{"a", "b"}
		t.Setenv("CFG_LIST", "one two   three")
		if got := envList("CFG_LIST", fallback); !reflect.DeepEqual(got, []string{"one", "two", "three"}) {
			t.Fatalf("envList mismatch: got=%v", got)
		}
		t.Setenv("CFG_LIST", "")
		if got := envList("CFG_LIST", fallback); !reflect.DeepEqual(got, fallback) {
			t.Fatalf("envList fallback mismatch: got=%v", got)
		}
	})
}

func TestIsDevelopmentEnv(t *testing.T) {
	for _, value := range []string{"dev", "development", "local", " DEVELOPMENT "} {
		if !isDevelopmentEnv(value) {
			t.Fatalf("expected development env for %q", value)
		}
	}
	if isDevelopmentEnv("production") {
		t.Fatalf("production should not be treated as development")
	}
}

func TestFileHelpers(t *testing.T) {
	tempDir := t.TempDir()
	envFile := tempDir + "/.env"
	if err := os.WriteFile(envFile, []byte("APP_ENV=test\n"), 0o600); err != nil {
		t.Fatalf("write env file failed: %v", err)
	}
	if found := pickEnvFileInDir(tempDir); found != envFile {
		t.Fatalf("pickEnvFileInDir mismatch: got=%q want=%q", found, envFile)
	}
	if !fileExists(envFile) {
		t.Fatalf("fileExists should report env file")
	}
	if fileExists(tempDir + "/missing.env") {
		t.Fatalf("fileExists should be false for missing file")
	}
}

func TestLoadForReadsWalletLightClientEnv(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	t.Setenv("JWT_SECRET", "test-secret")
	t.Setenv("O2UL_WALLET_HEADER_FIXTURE_PROFILE", "ethapi-http3-rpc")
	t.Setenv("O2UL_WALLET_LIGHTCLIENT_RPC_URL", "https://rpc.example.invalid")

	cfg := LoadFor("API")
	if cfg.O2ULWalletHeaderProfile != "ethapi-http3-rpc" {
		t.Fatalf("unexpected wallet profile: %q", cfg.O2ULWalletHeaderProfile)
	}
	if cfg.O2ULWalletRPCURL != "https://rpc.example.invalid" {
		t.Fatalf("unexpected wallet rpc url: %q", cfg.O2ULWalletRPCURL)
	}
}
