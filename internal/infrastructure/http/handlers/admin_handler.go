package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
	mw "com.nlaak.backend-template/internal/infrastructure/http/middleware"
	"github.com/go-chi/chi/v5"
)

type AdminHandler struct {
	repo application.UserRepository
}

type pagedUserRepository interface {
	ListPage(ctx context.Context, offset, limit int) ([]domain.Player, bool, error)
}

func NewAdminHandler(repo application.UserRepository) *AdminHandler {
	return &AdminHandler{repo: repo}
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	const (
		defaultPage     = 1
		defaultPageSize = 50
		maxPageSize     = 200
	)

	page := parsePositiveInt(r.URL.Query().Get("page"), defaultPage)
	pageSize := parsePositiveInt(r.URL.Query().Get("page_size"), defaultPageSize)
	if pageSize > maxPageSize {
		pageSize = maxPageSize
	}
	offset := (page - 1) * pageSize

	users := make([]domain.Player, 0, pageSize)
	hasMore := false

	if pagedRepo, ok := h.repo.(pagedUserRepository); ok {
		pagedUsers, more, err := pagedRepo.ListPage(r.Context(), offset, pageSize)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		users = pagedUsers
		hasMore = more
	} else {
		allUsers, err := h.repo.List(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if offset < len(allUsers) {
			end := offset + pageSize
			if end > len(allUsers) {
				end = len(allUsers)
			}
			users = allUsers[offset:end]
			hasMore = end < len(allUsers)
		}
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"users": users,
		"pagination": map[string]any{
			"page":       page,
			"pageSize":   pageSize,
			"count":      len(users),
			"hasMore":    hasMore,
			"nextPage":   page + 1,
			"appliedMax": maxPageSize,
		},
	})
}

func parsePositiveInt(raw string, fallback int) int {
	v, err := strconv.Atoi(raw)
	if err != nil || v <= 0 {
		return fallback
	}
	return v
}

func (h *AdminHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing auth claims", http.StatusUnauthorized)
		return
	}

	id := chi.URLParam(r, "id")
	var req struct {
		Role domain.Role `json:"role"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	targetRole, valid := domain.ParseRole(string(req.Role))
	if !valid {
		http.Error(w, "invalid role", http.StatusBadRequest)
		return
	}

	if !domain.CanAssignRole(claims.Role, targetRole) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	targetUser, err := h.repo.ByID(r.Context(), id)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	if (targetRole == domain.RoleAdmin || targetRole == domain.RoleSysOp || targetRole == domain.RoleModerator || targetRole == domain.RoleSubscriber) && !domain.IsRegisteredUser(targetUser.Role) {
		http.Error(w, "target must be at least registered", http.StatusBadRequest)
		return
	}

	if err := h.repo.UpdateRole(r.Context(), id, targetRole, time.Now().UTC()); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"ok": true})
}
