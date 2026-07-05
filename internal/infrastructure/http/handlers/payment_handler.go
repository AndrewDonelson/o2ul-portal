package handlers

import (
	"net/http"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain/payment"
	"github.com/go-chi/chi/v5"
)

type PaymentHandler struct {
	payments *application.PaymentService
}

func NewPaymentHandler(payments *application.PaymentService) *PaymentHandler {
	return &PaymentHandler{payments: payments}
}

func (h *PaymentHandler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	var req payment.CheckoutRequest
	if err := decodeJSON(w, r, &req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	out, err := h.payments.CreateCheckoutSession(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, http.StatusCreated, out)
}

func (h *PaymentHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	providerName := payment.Provider(chi.URLParam(r, "provider"))
	payload, err := readLimitedBody(w, r, maxWebhookBodyBytes)
	if err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	signature := r.Header.Get("X-Signature")
	if providerName == payment.ProviderStripe {
		signature = r.Header.Get("Stripe-Signature")
	}
	out, err := h.payments.HandleWebhook(r.Context(), providerName, payload, signature)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	respondJSON(w, http.StatusOK, out)
}
