package handlers

import (
	"net/http"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
	mw "com.nlaak.backend-template/internal/infrastructure/http/middleware"
)

type PreferencesHandler struct {
	svc *application.PreferencesService
}

func NewPreferencesHandler(svc *application.PreferencesService) *PreferencesHandler {
	return &PreferencesHandler{svc: svc}
}

func (h *PreferencesHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}

	settings, err := h.svc.GetSettings(r.Context(), claims.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, settings)
}

func (h *PreferencesHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}

	var payload struct {
		Theme          string `json:"theme"`
		RefreshSeconds int    `json:"refreshSeconds"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	saved, err := h.svc.SaveSettings(r.Context(), domain.UserSettings{
		PlayerID:       claims.PlayerID,
		Theme:          payload.Theme,
		RefreshSeconds: payload.RefreshSeconds,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, http.StatusOK, saved)
}

func (h *PreferencesHandler) GetNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}

	prefs, err := h.svc.GetNotificationPreferences(r.Context(), claims.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, prefs)
}

func (h *PreferencesHandler) UpdateNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}

	var payload struct {
		EmailEnabled bool `json:"emailEnabled"`
		PushEnabled  bool `json:"pushEnabled"`
		InAppEnabled bool `json:"inAppEnabled"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	saved, err := h.svc.SaveNotificationPreferences(r.Context(), domain.NotificationPreferences{
		PlayerID:     claims.PlayerID,
		EmailEnabled: payload.EmailEnabled,
		PushEnabled:  payload.PushEnabled,
		InAppEnabled: payload.InAppEnabled,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, http.StatusOK, saved)
}
