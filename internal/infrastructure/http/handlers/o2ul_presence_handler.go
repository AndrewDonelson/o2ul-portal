package handlers

import (
	"net/http"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
	mw "com.nlaak.backend-template/internal/infrastructure/http/middleware"
)

type O2ULPresenceHandler struct {
	svc *application.O2ULPresenceService
}

func NewO2ULPresenceHandler(svc *application.O2ULPresenceService) *O2ULPresenceHandler {
	return &O2ULPresenceHandler{svc: svc}
}

func (h *O2ULPresenceHandler) GetPresence(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	presence, err := h.svc.GetPresence(r.Context(), claims.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, presence)
}

func (h *O2ULPresenceHandler) UpdatePresence(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	var payload struct {
		Status string `json:"status"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	presence, err := h.svc.UpdatePresence(r.Context(), claims.PlayerID, payload.Status)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, presence)
}

func (h *O2ULPresenceHandler) SetOffline(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	presence, err := h.svc.SetOffline(r.Context(), claims.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, presence)
}

func (h *O2ULPresenceHandler) GetCCUMetrics(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	if !domain.CanActAs(claims.Role, domain.RoleAdmin) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	metrics, err := h.svc.GetCCUMetrics(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, metrics)
}
