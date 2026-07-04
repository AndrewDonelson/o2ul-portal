package handlers

import (
	"encoding/json"
	"net/http"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
	mw "com.nlaak.backend-template/internal/infrastructure/http/middleware"
)

type AuthHandler struct {
	auth *application.AuthService
	repo application.UserRepository
}

func NewAuthHandler(auth *application.AuthService, repo application.UserRepository) *AuthHandler {
	return &AuthHandler{auth: auth, repo: repo}
}

type registerReq struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type forgotPasswordReq struct {
	Email string `json:"email"`
}

type resetPasswordReq struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if err := decodeJSON(w, r, &req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	role := domain.RoleRegistered
	if req.Role != "" {
		parsed, ok := domain.ParseRole(req.Role)
		if !ok {
			http.Error(w, "invalid role", http.StatusBadRequest)
			return
		}
		if parsed != domain.RoleRegistered {
			http.Error(w, "register role must be registered", http.StatusBadRequest)
			return
		}
		role = parsed
	}
	p, token, err := h.auth.Register(r.Context(), req.Email, req.Username, req.Password, role)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, http.StatusCreated, map[string]any{"token": token, "player": p})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := decodeJSON(w, r, &req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	p, token, err := h.auth.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}
	respondJSON(w, http.StatusOK, map[string]any{"token": token, "player": p})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	p, err := h.repo.ByID(r.Context(), claims.PlayerID)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	respondJSON(w, http.StatusOK, p)
}

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req forgotPasswordReq
	if err := decodeJSON(w, r, &req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	if err := h.auth.ForgotPassword(r.Context(), req.Email); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondJSON(w, http.StatusAccepted, map[string]any{"ok": true})
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordReq
	if err := decodeJSON(w, r, &req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	if err := h.auth.ResetPassword(r.Context(), req.Token, req.Password); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondJSON(w, http.StatusAccepted, map[string]any{"ok": true})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}

	p, token, err := h.auth.RefreshToken(r.Context(), claims.PlayerID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{"token": token, "player": p})
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
