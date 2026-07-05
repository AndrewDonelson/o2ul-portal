package handlers

import (
	"net/http"

	"com.nlaak.backend-template/internal/application"
)

type StrataAdminHandler struct {
	service application.StrataAdminService
}

func NewStrataAdminHandler(service application.StrataAdminService) *StrataAdminHandler {
	return &StrataAdminHandler{service: service}
}

func (h *StrataAdminHandler) Status(w http.ResponseWriter, r *http.Request) {
	if h.service == nil {
		http.Error(w, "strata admin service unavailable", http.StatusServiceUnavailable)
		return
	}
	status, err := h.service.Status(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	respondJSON(w, http.StatusOK, status)
}
