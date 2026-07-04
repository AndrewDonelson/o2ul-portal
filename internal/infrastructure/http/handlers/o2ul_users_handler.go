package handlers

import (
	"net/http"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
	mw "com.nlaak.backend-template/internal/infrastructure/http/middleware"
	"github.com/go-chi/chi/v5"
)

type O2ULUsersHandler struct {
	svc *application.O2ULUsersService
}

func NewO2ULUsersHandler(svc *application.O2ULUsersService) *O2ULUsersHandler {
	return &O2ULUsersHandler{svc: svc}
}

func (h *O2ULUsersHandler) Viewer(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	viewer, err := h.svc.Viewer(r.Context(), claims.PlayerID, claims.Role)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, viewer)
}

func (h *O2ULUsersHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	resp, err := h.svc.GetPublic(r.Context(), id)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	respondJSON(w, http.StatusOK, resp)
}

func (h *O2ULUsersHandler) Current(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	resp, err := h.svc.GetCurrent(r.Context(), claims.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, resp)
}

func (h *O2ULUsersHandler) List(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	if !domain.CanActAs(claims.Role, domain.RoleModerator) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	page := parsePositiveInt(r.URL.Query().Get("page"), 1)
	pageSize := parsePositiveInt(r.URL.Query().Get("page_size"), 50)
	resp, err := h.svc.List(r.Context(), page, pageSize)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, resp)
}

func (h *O2ULUsersHandler) BatchGetProfiles(w http.ResponseWriter, r *http.Request) {
	_, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	var payload struct {
		UserIDs []string `json:"userIds"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	profiles, err := h.svc.BatchProfiles(r.Context(), payload.UserIDs)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, profiles)
}

func (h *O2ULUsersHandler) Init(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	var payload struct {
		Email    string `json:"email"`
		Username string `json:"username"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	profile, err := h.svc.InitUser(r.Context(), claims.PlayerID, payload.Email, payload.Username)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, profile)
}

func (h *O2ULUsersHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	var payload map[string]any
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	profile, err := h.svc.UpdateProfile(r.Context(), claims.PlayerID, payload)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, http.StatusOK, profile)
}

func (h *O2ULUsersHandler) UpdateBackground(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	var payload struct {
		BGImageURL       string `json:"bgImageUrl"`
		BGImageStorageID string `json:"bgImageStorageId"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	profile, err := h.svc.UpdateBackground(r.Context(), claims.PlayerID, payload.BGImageURL, payload.BGImageStorageID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, http.StatusOK, profile)
}

func (h *O2ULUsersHandler) DeletePlatformData(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	if err := h.svc.DeletePlatformData(r.Context(), claims.PlayerID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"success": true})
}
