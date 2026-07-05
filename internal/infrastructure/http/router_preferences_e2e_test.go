package httpinfra

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
)

type preferencesRepoStub struct {
	settings map[string]domain.UserSettings
	notifs   map[string]domain.NotificationPreferences
}

func newPreferencesRepoStub() *preferencesRepoStub {
	return &preferencesRepoStub{
		settings: map[string]domain.UserSettings{},
		notifs:   map[string]domain.NotificationPreferences{},
	}
}

func (r *preferencesRepoStub) GetSettings(_ context.Context, playerID string) (domain.UserSettings, error) {
	v, ok := r.settings[playerID]
	if !ok {
		return domain.UserSettings{}, application.ErrNotFound
	}
	return v, nil
}

func (r *preferencesRepoStub) UpsertSettings(_ context.Context, settings domain.UserSettings) error {
	r.settings[settings.PlayerID] = settings
	return nil
}

func (r *preferencesRepoStub) GetNotificationPreferences(_ context.Context, playerID string) (domain.NotificationPreferences, error) {
	v, ok := r.notifs[playerID]
	if !ok {
		return domain.NotificationPreferences{}, application.ErrNotFound
	}
	return v, nil
}

func (r *preferencesRepoStub) UpsertNotificationPreferences(_ context.Context, prefs domain.NotificationPreferences) error {
	r.notifs[prefs.PlayerID] = prefs
	return nil
}

type preferencesRouterUserRepo struct{}

func (preferencesRouterUserRepo) Create(_ context.Context, player domain.Player) (domain.Player, error) {
	return player, nil
}
func (preferencesRouterUserRepo) ByEmail(_ context.Context, _ string) (domain.Player, error) {
	return domain.Player{}, errors.New("not found")
}
func (preferencesRouterUserRepo) ByID(_ context.Context, _ string) (domain.Player, error) {
	return domain.Player{}, errors.New("not found")
}
func (preferencesRouterUserRepo) List(_ context.Context) ([]domain.Player, error) {
	return []domain.Player{}, nil
}
func (preferencesRouterUserRepo) UpdateRole(_ context.Context, _ string, _ domain.Role, _ time.Time) error {
	return nil
}

func TestPreferencesEndpoints_E2E(t *testing.T) {
	tokenSvc := NewJWTService("test-secret", time.Hour)
	authSvc := application.NewAuthService(preferencesRouterUserRepo{}, tokenSvc, paymentTestLog{})
	paymentSvc := application.NewPaymentService(paymentTestLog{}, &paymentProviderStub{name: "stripe"}, &paymentProviderStub{name: "steam"})
	prefsRepo := newPreferencesRepoStub()
	prefsSvc := application.NewPreferencesService(prefsRepo, paymentTestLog{})

	router := BuildAPIRouter(APIOptions{
		AuthService:        authSvc,
		PaymentService:     paymentSvc,
		PreferencesService: prefsSvc,
		UserRepo:           preferencesRouterUserRepo{},
		TokenSvc:           tokenSvc,
	})

	token, err := tokenSvc.Issue(domain.Player{ID: "player-42", Email: "ops@example.com", Username: "ops", Role: domain.RoleMember})
	if err != nil {
		t.Fatalf("issue token failed: %v", err)
	}

	t.Run("settings require auth", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/settings", nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rr.Code)
		}
	})

	t.Run("settings get defaults then persist", func(t *testing.T) {
		getReq := httptest.NewRequest(http.MethodGet, "/api/v1/settings", nil)
		getReq.Header.Set("Authorization", "Bearer "+token)
		getRR := httptest.NewRecorder()
		router.ServeHTTP(getRR, getReq)
		if getRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", getRR.Code, getRR.Body.String())
		}

		putPayload, _ := json.Marshal(map[string]any{"theme": "theme-amber", "refreshSeconds": 45})
		putReq := httptest.NewRequest(http.MethodPut, "/api/v1/settings", bytes.NewReader(putPayload))
		putReq.Header.Set("Authorization", "Bearer "+token)
		putReq.Header.Set("Content-Type", "application/json")
		putRR := httptest.NewRecorder()
		router.ServeHTTP(putRR, putReq)
		if putRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", putRR.Code, putRR.Body.String())
		}

		verifyReq := httptest.NewRequest(http.MethodGet, "/api/v1/settings", nil)
		verifyReq.Header.Set("Authorization", "Bearer "+token)
		verifyRR := httptest.NewRecorder()
		router.ServeHTTP(verifyRR, verifyReq)
		if verifyRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", verifyRR.Code, verifyRR.Body.String())
		}

		var saved domain.UserSettings
		if err := json.Unmarshal(verifyRR.Body.Bytes(), &saved); err != nil {
			t.Fatalf("unmarshal failed: %v", err)
		}
		if saved.Theme != "theme-amber" || saved.RefreshSeconds != 45 {
			t.Fatalf("unexpected saved settings: %+v", saved)
		}
	})

	t.Run("notification preferences persist", func(t *testing.T) {
		putPayload, _ := json.Marshal(map[string]any{"emailEnabled": true, "pushEnabled": true, "inAppEnabled": false})
		putReq := httptest.NewRequest(http.MethodPut, "/api/v1/notifications/preferences", bytes.NewReader(putPayload))
		putReq.Header.Set("Authorization", "Bearer "+token)
		putReq.Header.Set("Content-Type", "application/json")
		putRR := httptest.NewRecorder()
		router.ServeHTTP(putRR, putReq)
		if putRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", putRR.Code, putRR.Body.String())
		}

		getReq := httptest.NewRequest(http.MethodGet, "/api/v1/notifications/preferences", nil)
		getReq.Header.Set("Authorization", "Bearer "+token)
		getRR := httptest.NewRecorder()
		router.ServeHTTP(getRR, getReq)
		if getRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", getRR.Code, getRR.Body.String())
		}

		var saved domain.NotificationPreferences
		if err := json.Unmarshal(getRR.Body.Bytes(), &saved); err != nil {
			t.Fatalf("unmarshal failed: %v", err)
		}
		if !saved.EmailEnabled || !saved.PushEnabled || saved.InAppEnabled {
			t.Fatalf("unexpected saved notification prefs: %+v", saved)
		}
	})
}
