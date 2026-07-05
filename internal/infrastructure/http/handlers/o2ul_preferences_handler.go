package handlers

import (
	"net/http"

	"com.nlaak.backend-template/internal/application"
	mw "com.nlaak.backend-template/internal/infrastructure/http/middleware"
	"github.com/go-chi/chi/v5"
)

type O2ULPreferencesHandler struct {
	svc *application.O2ULPreferencesService
}

func NewO2ULPreferencesHandler(svc *application.O2ULPreferencesService) *O2ULPreferencesHandler {
	return &O2ULPreferencesHandler{svc: svc}
}

func (h *O2ULPreferencesHandler) Get(w http.ResponseWriter, r *http.Request) {
	prefs, err := h.svc.Get(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, prefs)
}

func (h *O2ULPreferencesHandler) UpdateMode(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	var payload struct {
		Mode string `json:"mode"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	prefs, err := h.svc.UpdateMode(r.Context(), claims.PlayerID, claims.Role, payload.Mode)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	respondJSON(w, http.StatusOK, prefs)
}

func (h *O2ULPreferencesHandler) UpdateCallingState(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	var payload struct {
		Enabled bool `json:"enabled"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	prefs, err := h.svc.UpdateCallingState(r.Context(), claims.PlayerID, claims.Role, payload.Enabled)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	respondJSON(w, http.StatusOK, prefs)
}

func (h *O2ULPreferencesHandler) UpdateOAuthProviders(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	var payload struct {
		EnabledProviders []string `json:"enabledProviders"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	prefs, err := h.svc.UpdateOAuthProviders(r.Context(), claims.PlayerID, claims.Role, payload.EnabledProviders)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	respondJSON(w, http.StatusOK, prefs)
}

func (h *O2ULPreferencesHandler) IsOAuthProviderEnabled(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")
	enabled, err := h.svc.IsOAuthProviderEnabled(r.Context(), provider)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, map[string]bool{"enabled": enabled})
}
