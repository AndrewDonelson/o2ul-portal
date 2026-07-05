package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/infrastructure/orchestrator"
	"github.com/go-chi/chi/v5"
)

type OrchestratorHandler struct {
	manager      application.InstanceOrchestrator
	logsMu       sync.RWMutex
	logs         []json.RawMessage
	logTimes     []time.Time
	controlToken string
	shutdownFn   func(reason string)
}

func NewOrchestratorHandler(manager application.InstanceOrchestrator, controlToken string, shutdownFn func(reason string)) *OrchestratorHandler {
	return &OrchestratorHandler{
		manager:      manager,
		logs:         make([]json.RawMessage, 0, 1000),
		logTimes:     make([]time.Time, 0, 1000),
		controlToken: controlToken,
		shutdownFn:   shutdownFn,
	}
}

type contextInstanceLister interface {
	ListWithContext(ctx context.Context) []orchestrator.Instance
}

func (h *OrchestratorHandler) Spawn(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Service string   `json:"service"`
		Command string   `json:"command"`
		Args    []string `json:"args"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	instance, err := h.manager.Spawn(r.Context(), req.Service, req.Command, req.Args)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, http.StatusCreated, instance)
}

func (h *OrchestratorHandler) Despawn(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.manager.Despawn(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *OrchestratorHandler) List(w http.ResponseWriter, r *http.Request) {
	instances := h.manager.List()
	if lister, ok := h.manager.(contextInstanceLister); ok {
		listCtx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		instances = lister.ListWithContext(listCtx)
	}
	respondJSON(w, http.StatusOK, map[string]any{"instances": instances})
}

func (h *OrchestratorHandler) IngestLog(w http.ResponseWriter, r *http.Request) {
	var raw json.RawMessage
	if err := decodeJSONWithLimit(w, r, &raw, maxWebhookBodyBytes); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	h.logsMu.Lock()
	h.logs = append(h.logs, raw)
	ts, _ := extractLogTimestamp(raw)
	h.logTimes = append(h.logTimes, ts)
	if len(h.logs) > 1000 {
		h.logs = h.logs[len(h.logs)-1000:]
		h.logTimes = h.logTimes[len(h.logTimes)-1000:]
	}
	h.logsMu.Unlock()
	respondJSON(w, http.StatusAccepted, map[string]any{"ok": true})
}

func (h *OrchestratorHandler) ListLogs(w http.ResponseWriter, r *http.Request) {
	var (
		since    time.Time
		useSince bool
	)
	if rawSince := strings.TrimSpace(r.URL.Query().Get("since")); rawSince != "" {
		parsed, err := time.Parse(time.RFC3339, rawSince)
		if err != nil {
			http.Error(w, "invalid since; expected RFC3339", http.StatusBadRequest)
			return
		}
		since = parsed
		useSince = true
	}

	limit := 0
	if rawLimit := strings.TrimSpace(r.URL.Query().Get("limit")); rawLimit != "" {
		parsed, err := strconv.Atoi(rawLimit)
		if err != nil || parsed <= 0 {
			http.Error(w, "invalid limit; expected positive integer", http.StatusBadRequest)
			return
		}
		if parsed > 1000 {
			parsed = 1000
		}
		limit = parsed
	}

	h.logsMu.RLock()
	var logs []json.RawMessage
	if !useSince {
		start := 0
		if limit > 0 && len(h.logs) > limit {
			start = len(h.logs) - limit
		}
		logs = append([]json.RawMessage(nil), h.logs[start:]...)
		h.logsMu.RUnlock()
		respondJSON(w, http.StatusOK, map[string]any{"logs": logs})
		return
	}

	if limit > 0 {
		logs = make([]json.RawMessage, 0, limit)
		for i := len(h.logs) - 1; i >= 0 && len(logs) < limit; i-- {
			ts := h.logTimes[i]
			if !ts.IsZero() && ts.Before(since) {
				continue
			}
			logs = append(logs, h.logs[i])
		}
		reverseRawMessages(logs)
	} else {
		logs = make([]json.RawMessage, 0, len(h.logs))
		for i := 0; i < len(h.logs); i++ {
			ts := h.logTimes[i]
			if !ts.IsZero() && ts.Before(since) {
				continue
			}
			logs = append(logs, h.logs[i])
		}
	}
	h.logsMu.RUnlock()
	respondJSON(w, http.StatusOK, map[string]any{"logs": logs})
}

func reverseRawMessages(values []json.RawMessage) {
	for i, j := 0, len(values)-1; i < j; i, j = i+1, j-1 {
		values[i], values[j] = values[j], values[i]
	}
}

func extractLogTimestamp(entry json.RawMessage) (time.Time, bool) {
	var payload struct {
		Timestamp time.Time `json:"timestamp"`
	}
	if err := json.Unmarshal(entry, &payload); err != nil {
		return time.Time{}, false
	}
	if payload.Timestamp.IsZero() {
		return time.Time{}, false
	}
	return payload.Timestamp, true
}

func (h *OrchestratorHandler) Shutdown(w http.ResponseWriter, r *http.Request) {
	if strings.TrimSpace(h.controlToken) == "" {
		http.Error(w, "control token is not configured", http.StatusServiceUnavailable)
		return
	}
	provided := strings.TrimSpace(r.Header.Get("X-Orchestrator-Token"))
	if provided == "" {
		auth := strings.TrimSpace(r.Header.Get("Authorization"))
		if strings.HasPrefix(auth, "Bearer ") {
			provided = strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
		}
	}
	if provided == "" || provided != h.controlToken {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	respondJSON(w, http.StatusAccepted, map[string]any{"ok": true, "status": "shutdown_requested"})
	if h.shutdownFn != nil {
		h.shutdownFn("control_api")
	}
}
