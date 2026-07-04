package handlers

import (
	"net/http"

	"com.nlaak.backend-template/internal/application"
	mw "com.nlaak.backend-template/internal/infrastructure/http/middleware"
)

type O2ULAuthSyncHandler struct {
	svc *application.O2ULAuthSyncService
}

func NewO2ULAuthSyncHandler(svc *application.O2ULAuthSyncService) *O2ULAuthSyncHandler {
	return &O2ULAuthSyncHandler{svc: svc}
}

func (h *O2ULAuthSyncHandler) SyncProfile(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	var payload struct {
		Action application.O2ULAuthSyncAction `json:"action"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	id, err := h.svc.SyncProfile(r.Context(), claims.PlayerID, payload.Action)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"userId": id})
}
