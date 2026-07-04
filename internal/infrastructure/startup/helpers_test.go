package startup

import (
	"bytes"
	"errors"
	"log"
	"strings"
	"testing"
)

func TestEnvSourceForLog(t *testing.T) {
	if got := EnvSourceForLog(""); got != "defaults (no .env/.env.local found)" {
		t.Fatalf("unexpected empty env source: %q", got)
	}
	if got := EnvSourceForLog(" /tmp/.env "); got != "/tmp/.env" {
		t.Fatalf("unexpected trimmed env source: %q", got)
	}
}

func TestLayerStatusLabel(t *testing.T) {
	if got := LayerStatusLabel(nil); got != "active" {
		t.Fatalf("nil error should be active, got %q", got)
	}
	if got := LayerStatusLabel(errors.New("down")); !strings.Contains(got, "unavailable (down)") {
		t.Fatalf("unexpected status label: %q", got)
	}
}

func TestConfigureProcessLogger(t *testing.T) {
	var buf bytes.Buffer
	log.SetOutput(&buf)
	ConfigureProcessLogger("api")
	log.Print("hello")
	output := buf.String()
	if !strings.Contains(output, "[API] hello") {
		t.Fatalf("logger prefix missing: %q", output)
	}
	if !strings.Contains(output, "/") {
		t.Fatalf("expected dated log output, got %q", output)
	}
}
