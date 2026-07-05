package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"com.nlaak.backend-template/internal/infrastructure/orchestrator"
)

type benchInstanceManager struct{}

func (benchInstanceManager) Spawn(_ context.Context, service, command string, args []string) (orchestrator.Instance, error) {
	return orchestrator.Instance{Service: service, Command: command, Args: args}, nil
}

func (benchInstanceManager) Despawn(_ context.Context, _ string) error {
	return nil
}

func (benchInstanceManager) List() []orchestrator.Instance {
	return []orchestrator.Instance{{ID: "1", Service: "api"}}
}

func (benchInstanceManager) ListWithContext(_ context.Context) []orchestrator.Instance {
	return []orchestrator.Instance{{ID: "1", Service: "api"}}
}

func BenchmarkOrchestratorListLogsLimit(b *testing.B) {
	h := NewOrchestratorHandler(benchInstanceManager{}, "token", nil)
	now := time.Now().UTC()
	for i := 0; i < 1000; i++ {
		entry, _ := json.Marshal(map[string]any{"timestamp": now.Add(time.Duration(i) * time.Second), "message": "log"})
		h.logs = append(h.logs, entry)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/logs?limit=100", nil)
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		rr := httptest.NewRecorder()
		h.ListLogs(rr, req)
		if rr.Code != http.StatusOK {
			b.Fatalf("expected 200, got %d", rr.Code)
		}
	}
}
