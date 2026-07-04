package handlers

import (
	"fmt"
	"net/http"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
	"com.nlaak.backend-template/internal/domain/o2ul_notifications"
	mw "com.nlaak.backend-template/internal/infrastructure/http/middleware"
	"github.com/go-chi/chi/v5"
)

type O2ULNotificationsHandler struct {
	svc *application.O2ULNotificationsService
}

func NewO2ULNotificationsHandler(svc *application.O2ULNotificationsService) *O2ULNotificationsHandler {
	return &O2ULNotificationsHandler{svc: svc}
}

func (h *O2ULNotificationsHandler) StoreSubscription(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	var payload struct {
		Endpoint       string `json:"endpoint"`
		ExpirationTime int64  `json:"expirationTime"`
		Keys           struct {
			P256DH string `json:"p256dh"`
			Auth   string `json:"auth"`
		} `json:"keys"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	subscription, err := h.svc.StoreSubscription(r.Context(), claims.PlayerID, o2ul_notifications.PushSubscription{
		ID:             fmt.Sprintf("sub-%d", time.Now().UnixNano()),
		Endpoint:       payload.Endpoint,
		ExpirationTime: payload.ExpirationTime,
		P256DH:         payload.Keys.P256DH,
		Auth:           payload.Keys.Auth,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, subscription)
}

func (h *O2ULNotificationsHandler) RemoveSubscription(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	var payload struct {
		Endpoint string `json:"endpoint"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	if err := h.svc.RemoveSubscription(r.Context(), claims.PlayerID, payload.Endpoint); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (h *O2ULNotificationsHandler) ListSubscriptions(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	items, err := h.svc.ListSubscriptions(r.Context(), claims.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, items)
}

func (h *O2ULNotificationsHandler) CreateNotification(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	if !domain.CanActAs(claims.Role, domain.RoleModerator) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	var payload struct {
		UserID string         `json:"userId"`
		Title  string         `json:"title"`
		Body   string         `json:"body"`
		Icon   string         `json:"icon"`
		Tag    string         `json:"tag"`
		URL    string         `json:"url"`
		Data   map[string]any `json:"data"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	created, err := h.svc.CreateNotification(r.Context(), o2ul_notifications.PendingNotification{
		ID:     fmt.Sprintf("notif-%d", time.Now().UnixNano()),
		UserID: payload.UserID,
		Title:  payload.Title,
		Body:   payload.Body,
		Icon:   payload.Icon,
		Tag:    payload.Tag,
		URL:    payload.URL,
		Data:   payload.Data,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, created)
}

func (h *O2ULNotificationsHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	if !domain.CanActAs(claims.Role, domain.RoleModerator) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	id := chi.URLParam(r, "id")
	var payload struct {
		Status    string `json:"status"`
		LastError string `json:"lastError"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	updated, err := h.svc.UpdateNotificationStatus(r.Context(), id, payload.Status, payload.LastError)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, updated)
}

func (h *O2ULNotificationsHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	if !domain.CanActAs(claims.Role, domain.RoleModerator) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	limit := parsePositiveInt(r.URL.Query().Get("limit"), 20)
	items, err := h.svc.ListPending(r.Context(), limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, items)
}
