package startup

import (
	"bytes"
	"context"
	"errors"
	"log"
	"regexp"
	"strings"
	"testing"
	"time"
)

func withCapturedLogs(t *testing.T, fn func()) string {
	t.Helper()

	var buf bytes.Buffer
	origWriter := log.Writer()
	origFlags := log.Flags()
	origPrefix := log.Prefix()

	log.SetOutput(&buf)
	log.SetFlags(0)
	log.SetPrefix("")
	defer func() {
		log.SetOutput(origWriter)
		log.SetFlags(origFlags)
		log.SetPrefix(origPrefix)
	}()

	fn()
	return buf.String()
}

func assertInOrder(t *testing.T, s string, parts []string) {
	t.Helper()
	prev := -1
	for _, p := range parts {
		idx := strings.Index(s, p)
		if idx < 0 {
			t.Fatalf("missing log segment %q in logs:\n%s", p, s)
		}
		if idx < prev {
			t.Fatalf("log segment %q appears out of order in logs:\n%s", p, s)
		}
		prev = idx
	}
}

func assertDurationField(t *testing.T, s, phase string) {
	t.Helper()
	re := regexp.MustCompile(`shutdown phase: component=[A-Z]+ phase=` + regexp.QuoteMeta(phase) + ` status=[a-z]+ duration_ms=[0-9]+`)
	if !re.MatchString(s) {
		t.Fatalf("missing duration_ms field for phase %q in logs:\n%s", phase, s)
	}
}

func TestShutdownPhases_APIIntegration(t *testing.T) {
	logs := withCapturedLogs(t, func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		err := RunShutdownPhases(ctx, "API", "integration_test", []ShutdownPhase{
			{
				Name:    "drain_http_inflight",
				Timeout: 200 * time.Millisecond,
				Run: func(context.Context) error {
					time.Sleep(5 * time.Millisecond)
					return nil
				},
			},
			{
				Name:    "snapshot_runtime_state",
				Timeout: 200 * time.Millisecond,
				Run: func(context.Context) error {
					time.Sleep(5 * time.Millisecond)
					return nil
				},
			},
			{
				Name:    "close_datastore",
				Timeout: 200 * time.Millisecond,
				Run: func(context.Context) error {
					time.Sleep(5 * time.Millisecond)
					return nil
				},
			},
		})
		if err != nil {
			t.Fatalf("RunShutdownPhases returned error: %v", err)
		}
	})

	assertInOrder(t, logs, []string{
		"shutdown begin: component=API reason=integration_test phases=3",
		"shutdown phase: component=API phase=drain_http_inflight status=ok",
		"shutdown phase: component=API phase=snapshot_runtime_state status=ok",
		"shutdown phase: component=API phase=close_datastore status=ok",
		"shutdown complete: component=API reason=integration_test ok=3 failed=0",
	})

	assertDurationField(t, logs, "drain_http_inflight")
	assertDurationField(t, logs, "snapshot_runtime_state")
	assertDurationField(t, logs, "close_datastore")
}

func TestShutdownPhases_OrchestratorIntegration(t *testing.T) {
	logs := withCapturedLogs(t, func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		err := RunShutdownPhases(ctx, "ORCHESTRATOR", "integration_test", []ShutdownPhase{
			{
				Name:    "despawn_managed_instances",
				Timeout: 200 * time.Millisecond,
				Run: func(context.Context) error {
					time.Sleep(5 * time.Millisecond)
					return nil
				},
			},
			{
				Name:    "request_managed_shutdown_1",
				Timeout: 200 * time.Millisecond,
				Run: func(context.Context) error {
					time.Sleep(5 * time.Millisecond)
					return nil
				},
			},
			{
				Name:    "drain_orchestrator_http",
				Timeout: 200 * time.Millisecond,
				Run: func(context.Context) error {
					time.Sleep(5 * time.Millisecond)
					return nil
				},
			},
		})
		if err != nil {
			t.Fatalf("RunShutdownPhases returned error: %v", err)
		}
	})

	assertInOrder(t, logs, []string{
		"shutdown begin: component=ORCHESTRATOR reason=integration_test phases=3",
		"shutdown phase: component=ORCHESTRATOR phase=despawn_managed_instances status=ok",
		"shutdown phase: component=ORCHESTRATOR phase=request_managed_shutdown_1 status=ok",
		"shutdown phase: component=ORCHESTRATOR phase=drain_orchestrator_http status=ok",
		"shutdown complete: component=ORCHESTRATOR reason=integration_test ok=3 failed=0",
	})

	assertDurationField(t, logs, "despawn_managed_instances")
	assertDurationField(t, logs, "request_managed_shutdown_1")
	assertDurationField(t, logs, "drain_orchestrator_http")
}

func TestShutdownPhases_FailurePathIntegration(t *testing.T) {
	phaseErr := errors.New("forced phase failure")

	logs := withCapturedLogs(t, func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		err := RunShutdownPhases(ctx, "API", "integration_failure_test", []ShutdownPhase{
			{
				Name:    "phase_ok",
				Timeout: 100 * time.Millisecond,
				Run: func(context.Context) error {
					return nil
				},
			},
			{
				Name:    "phase_failed",
				Timeout: 100 * time.Millisecond,
				Run: func(context.Context) error {
					return phaseErr
				},
			},
			{
				Name:    "phase_timeout",
				Timeout: 10 * time.Millisecond,
				Run: func(ctx context.Context) error {
					<-ctx.Done()
					return ctx.Err()
				},
			},
		})
		if err == nil {
			t.Fatalf("expected aggregated error, got nil")
		}
		if !strings.Contains(err.Error(), "phase_failed: forced phase failure") {
			t.Fatalf("expected phase failure in aggregated error, got: %v", err)
		}
		if !strings.Contains(err.Error(), "phase_timeout: context deadline exceeded") {
			t.Fatalf("expected timeout failure in aggregated error, got: %v", err)
		}
	})

	assertInOrder(t, logs, []string{
		"shutdown begin: component=API reason=integration_failure_test phases=3",
		"shutdown phase: component=API phase=phase_ok status=ok",
		"shutdown phase: component=API phase=phase_failed status=failed",
		"shutdown phase: component=API phase=phase_timeout status=failed",
		"shutdown complete: component=API reason=integration_failure_test ok=1 failed=2",
	})

	assertDurationField(t, logs, "phase_ok")
	assertDurationField(t, logs, "phase_failed")
	assertDurationField(t, logs, "phase_timeout")
}
