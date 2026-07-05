package handlers

import (
	"fmt"
	"net/http"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain/o2ul_files"
	mw "com.nlaak.backend-template/internal/infrastructure/http/middleware"
	"github.com/go-chi/chi/v5"
)

type O2ULFilesHandler struct {
	svc *application.O2ULFilesService
}

func NewO2ULFilesHandler(svc *application.O2ULFilesService) *O2ULFilesHandler {
	return &O2ULFilesHandler{svc: svc}
}

func (h *O2ULFilesHandler) GenerateUploadURL(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	resp := h.svc.GenerateUploadURL(r.Context(), claims.PlayerID)
	respondJSON(w, http.StatusOK, resp)
}

func (h *O2ULFilesHandler) AddFile(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	var payload struct {
		Name        string `json:"name"`
		ContentType string `json:"contentType"`
		StorageID   string `json:"storageId"`
		Size        int64  `json:"size"`
		MD5Hash     string `json:"md5Hash"`
	}
	if err := decodeJSON(w, r, &payload); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	created, err := h.svc.AddFile(r.Context(), claims.PlayerID, o2ul_files.File{
		ID:          fmt.Sprintf("file-%d", time.Now().UnixNano()),
		Name:        payload.Name,
		ContentType: payload.ContentType,
		StorageID:   payload.StorageID,
		Size:        payload.Size,
		MD5Hash:     payload.MD5Hash,
		CreatedAt:   time.Now().UnixMilli(),
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, created)
}

func (h *O2ULFilesHandler) GetStorageID(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	id := chi.URLParam(r, "id")
	storageID, err := h.svc.GetStorageID(r.Context(), claims.PlayerID, id)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"storageId": storageID})
}

func (h *O2ULFilesHandler) GetFileURL(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	id := chi.URLParam(r, "id")
	url, err := h.svc.GetFileURL(r.Context(), claims.PlayerID, id)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"url": url})
}

func (h *O2ULFilesHandler) GetFileByMD5(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	md5Hash := chi.URLParam(r, "hash")
	file, err := h.svc.GetFileByMD5(r.Context(), claims.PlayerID, md5Hash)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	respondJSON(w, http.StatusOK, file)
}

func (h *O2ULFilesHandler) RemoveFile(w http.ResponseWriter, r *http.Request) {
	claims, ok := mw.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, "missing claims", http.StatusUnauthorized)
		return
	}
	id := chi.URLParam(r, "id")
	if err := h.svc.RemoveFile(r.Context(), claims.PlayerID, id); err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}
