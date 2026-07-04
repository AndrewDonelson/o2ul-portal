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
	"com.nlaak.backend-template/internal/domain/o2ul_preferences"
	"com.nlaak.backend-template/internal/domain/o2ul_users"
)

type o2ulUserRepoStub struct {
	users map[string]domain.Player
}

func newO2ULUserRepoStub() *o2ulUserRepoStub {
	return &o2ulUserRepoStub{users: map[string]domain.Player{}}
}

func (r *o2ulUserRepoStub) Create(_ context.Context, player domain.Player) (domain.Player, error) {
	r.users[player.ID] = player
	return player, nil
}

func (r *o2ulUserRepoStub) ByEmail(_ context.Context, email string) (domain.Player, error) {
	for _, u := range r.users {
		if u.Email == email {
			return u, nil
		}
	}
	return domain.Player{}, errors.New("not found")
}

func (r *o2ulUserRepoStub) ByID(_ context.Context, id string) (domain.Player, error) {
	u, ok := r.users[id]
	if !ok {
		return domain.Player{}, errors.New("not found")
	}
	return u, nil
}

func (r *o2ulUserRepoStub) List(_ context.Context) ([]domain.Player, error) {
	out := make([]domain.Player, 0, len(r.users))
	for _, u := range r.users {
		out = append(out, u)
	}
	return out, nil
}

func (r *o2ulUserRepoStub) UpdateRole(_ context.Context, id string, role domain.Role, updatedAt time.Time) error {
	u, ok := r.users[id]
	if !ok {
		return errors.New("not found")
	}
	u.Role = role
	u.UpdatedAt = updatedAt
	r.users[id] = u
	return nil
}

type o2ulProfileRepoStub struct {
	profiles map[string]o2ul_users.Profile
}

func newO2ULProfileRepoStub() *o2ulProfileRepoStub {
	return &o2ulProfileRepoStub{profiles: map[string]o2ul_users.Profile{}}
}

func (r *o2ulProfileRepoStub) GetByPlayerID(_ context.Context, playerID string) (o2ul_users.Profile, error) {
	p, ok := r.profiles[playerID]
	if !ok {
		return o2ul_users.Profile{}, application.ErrNotFound
	}
	return p, nil
}

func (r *o2ulProfileRepoStub) Upsert(_ context.Context, profile o2ul_users.Profile) (o2ul_users.Profile, error) {
	r.profiles[profile.PlayerID] = profile
	return profile, nil
}

func (r *o2ulProfileRepoStub) BatchGetByPlayerIDs(_ context.Context, playerIDs []string) ([]o2ul_users.Profile, error) {
	out := make([]o2ul_users.Profile, 0, len(playerIDs))
	for _, id := range playerIDs {
		if p, ok := r.profiles[id]; ok {
			out = append(out, p)
		}
	}
	return out, nil
}

func (r *o2ulProfileRepoStub) DeleteByPlayerID(_ context.Context, playerID string) error {
	delete(r.profiles, playerID)
	return nil
}

type o2ulPreferencesRepoStub struct {
	prefs *o2ul_preferences.SystemPreferences
}

func (r *o2ulPreferencesRepoStub) Get(_ context.Context) (o2ul_preferences.SystemPreferences, error) {
	if r.prefs == nil {
		return o2ul_preferences.SystemPreferences{}, application.ErrNotFound
	}
	return *r.prefs, nil
}

func (r *o2ulPreferencesRepoStub) Upsert(_ context.Context, prefs o2ul_preferences.SystemPreferences) (o2ul_preferences.SystemPreferences, error) {
	r.prefs = &prefs
	return prefs, nil
}

func issueO2ULToken(t *testing.T, tokenSvc *JWTService, player domain.Player) string {
	t.Helper()
	tkn, err := tokenSvc.Issue(player)
	if err != nil {
		t.Fatalf("issue token failed: %v", err)
	}
	return tkn
}

func TestO2ULSlice1Endpoints_E2E(t *testing.T) {
	tokenSvc := NewJWTService("test-secret", time.Hour)
	users := newO2ULUserRepoStub()
	profiles := newO2ULProfileRepoStub()
	o2ulPrefsRepo := &o2ulPreferencesRepoStub{}

	now := time.Now().UTC()
	registered := domain.Player{
		ID:        "player-registered",
		Email:     "registered@example.com",
		Username:  "registered",
		Role:      domain.RoleRegistered,
		CreatedAt: now,
		UpdatedAt: now,
	}
	admin := domain.Player{
		ID:        "player-admin",
		Email:     "admin@example.com",
		Username:  "admin",
		Role:      domain.RoleAdmin,
		CreatedAt: now,
		UpdatedAt: now,
	}
	moderator := domain.Player{
		ID:        "player-moderator",
		Email:     "mod@example.com",
		Username:  "mod",
		Role:      domain.RoleModerator,
		CreatedAt: now,
		UpdatedAt: now,
	}
	users.users[registered.ID] = registered
	users.users[admin.ID] = admin
	users.users[moderator.ID] = moderator

	profiles.profiles[registered.ID] = o2ul_users.Profile{
		PlayerID:     registered.ID,
		Username:     "registered_profile",
		Name:         "Registered User",
		Email:        "registered@example.com",
		IsOnline:     true,
		LastSeenUnix: time.Now().UnixMilli(),
	}

	o2ulUsersSvc := application.NewO2ULUsersService(users, profiles)
	o2ulPrefsSvc := application.NewO2ULPreferencesService(o2ulPrefsRepo)
	o2ulSyncSvc := application.NewO2ULAuthSyncService(users, profiles)

	router := BuildAPIRouter(APIOptions{
		AuthService:            application.NewAuthService(users, tokenSvc, authEndpointLog{}),
		PaymentService:         application.NewPaymentService(authEndpointLog{}),
		UserRepo:               users,
		TokenSvc:               tokenSvc,
		O2ULUsersService:       o2ulUsersSvc,
		O2ULPreferencesService: o2ulPrefsSvc,
		O2ULAuthSyncService:    o2ulSyncSvc,
	})

	registeredToken := issueO2ULToken(t, tokenSvc, registered)
	adminToken := issueO2ULToken(t, tokenSvc, admin)
	moderatorToken := issueO2ULToken(t, tokenSvc, moderator)

	t.Run("viewer requires auth", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/o2ul/users/viewer", nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rr.Code)
		}
	})

	t.Run("viewer returns merged user profile", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/o2ul/users/viewer", nil)
		req.Header.Set("Authorization", "Bearer "+registeredToken)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		var body map[string]any
		if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
			t.Fatalf("unmarshal failed: %v", err)
		}
		if body["userId"] != registered.ID {
			t.Fatalf("unexpected userId: %v", body["userId"])
		}
		if body["username"] != "registered_profile" {
			t.Fatalf("unexpected username: %v", body["username"])
		}
	})

	t.Run("public get user profile is accessible", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/o2ul/users/"+registered.ID, nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
	})

	t.Run("registered cannot list users, moderator can", func(t *testing.T) {
		registeredReq := httptest.NewRequest(http.MethodGet, "/api/v1/o2ul/users?page=1&page_size=10", nil)
		registeredReq.Header.Set("Authorization", "Bearer "+registeredToken)
		registeredRR := httptest.NewRecorder()
		router.ServeHTTP(registeredRR, registeredReq)
		if registeredRR.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d body=%s", registeredRR.Code, registeredRR.Body.String())
		}

		moderatorReq := httptest.NewRequest(http.MethodGet, "/api/v1/o2ul/users?page=1&page_size=10", nil)
		moderatorReq.Header.Set("Authorization", "Bearer "+moderatorToken)
		moderatorRR := httptest.NewRecorder()
		router.ServeHTTP(moderatorRR, moderatorReq)
		if moderatorRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", moderatorRR.Code, moderatorRR.Body.String())
		}

		var listBody map[string]any
		if err := json.Unmarshal(moderatorRR.Body.Bytes(), &listBody); err != nil {
			t.Fatalf("unmarshal failed: %v", err)
		}
		if _, ok := listBody["items"]; !ok {
			t.Fatalf("expected items in list response: %v", listBody)
		}
	})

	t.Run("batch profiles returns defaults for missing ids", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]any{
			"userIds": []string{registered.ID, "missing-user"},
		})
		req := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/users/profiles:batch-get", bytes.NewReader(payload))
		req.Header.Set("Authorization", "Bearer "+registeredToken)
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}

		var profilesResp []map[string]any
		if err := json.Unmarshal(rr.Body.Bytes(), &profilesResp); err != nil {
			t.Fatalf("unmarshal failed: %v", err)
		}
		if len(profilesResp) != 2 {
			t.Fatalf("expected 2 profiles, got %d", len(profilesResp))
		}

		foundFallback := false
		for _, p := range profilesResp {
			if p["userId"] == "missing-user" {
				foundFallback = true
				if p["username"] != "anonymous" {
					t.Fatalf("unexpected fallback username: %v", p["username"])
				}
			}
		}
		if !foundFallback {
			t.Fatalf("expected fallback profile for missing-user")
		}
	})

	t.Run("profile and background updates persist", func(t *testing.T) {
		patchPayload, _ := json.Marshal(map[string]any{
			"name":  "Registered Updated",
			"bio":   "Converted from legacy platform",
			"phone": "+15551234567",
		})
		patchReq := httptest.NewRequest(http.MethodPatch, "/api/v1/o2ul/users/profile", bytes.NewReader(patchPayload))
		patchReq.Header.Set("Authorization", "Bearer "+registeredToken)
		patchReq.Header.Set("Content-Type", "application/json")
		patchRR := httptest.NewRecorder()
		router.ServeHTTP(patchRR, patchReq)
		if patchRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", patchRR.Code, patchRR.Body.String())
		}

		bgPayload, _ := json.Marshal(map[string]any{
			"bgImageUrl":       "https://cdn.example.com/bg.png",
			"bgImageStorageId": "storage-123",
		})
		bgReq := httptest.NewRequest(http.MethodPatch, "/api/v1/o2ul/users/profile/background", bytes.NewReader(bgPayload))
		bgReq.Header.Set("Authorization", "Bearer "+registeredToken)
		bgReq.Header.Set("Content-Type", "application/json")
		bgRR := httptest.NewRecorder()
		router.ServeHTTP(bgRR, bgReq)
		if bgRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", bgRR.Code, bgRR.Body.String())
		}

		stored := profiles.profiles[registered.ID]
		if stored.Name != "Registered Updated" || stored.Bio != "Converted from legacy platform" || stored.Phone != "+15551234567" {
			t.Fatalf("profile patch did not persist as expected: %+v", stored)
		}
		if stored.BGImageURL != "https://cdn.example.com/bg.png" || stored.BGImageStorageID != "storage-123" {
			t.Fatalf("background update did not persist as expected: %+v", stored)
		}
	})

	t.Run("delete platform data removes profile only", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/o2ul/users/platform/github", nil)
		req.Header.Set("Authorization", "Bearer "+registeredToken)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		if _, ok := profiles.profiles[registered.ID]; ok {
			t.Fatalf("expected profile to be removed")
		}
		if _, ok := users.users[registered.ID]; !ok {
			t.Fatalf("expected base auth user to remain")
		}
	})

	t.Run("preferences default includes platform provider only", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/o2ul/preferences", nil)
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		var body map[string]any
		if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
			t.Fatalf("unmarshal failed: %v", err)
		}
		providers, ok := body["enabledOAuthProviders"].([]any)
		if !ok || len(providers) != 1 || providers[0] != o2ul_preferences.BuiltInAuthProvider {
			t.Fatalf("unexpected providers: %v", body["enabledOAuthProviders"])
		}
	})

	t.Run("moderator cannot update mode", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]any{"mode": o2ul_preferences.ModeBeta})
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/o2ul/preferences/mode", bytes.NewReader(payload))
		req.Header.Set("Authorization", "Bearer "+moderatorToken)
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d body=%s", rr.Code, rr.Body.String())
		}
	})

	t.Run("admin can update mode", func(t *testing.T) {
		payload, _ := json.Marshal(map[string]any{"mode": o2ul_preferences.ModeBeta})
		req := httptest.NewRequest(http.MethodPatch, "/api/v1/o2ul/preferences/mode", bytes.NewReader(payload))
		req.Header.Set("Authorization", "Bearer "+adminToken)
		req.Header.Set("Content-Type", "application/json")
		rr := httptest.NewRecorder()
		router.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rr.Code, rr.Body.String())
		}
		var body map[string]any
		if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
			t.Fatalf("unmarshal failed: %v", err)
		}
		if body["mode"] != o2ul_preferences.ModeBeta {
			t.Fatalf("unexpected mode: %v", body["mode"])
		}
	})

	t.Run("provider enabled endpoint only allows platform", func(t *testing.T) {
		reqPlatform := httptest.NewRequest(http.MethodGet, "/api/v1/o2ul/preferences/oauth-providers/platform/enabled", nil)
		rrPlatform := httptest.NewRecorder()
		router.ServeHTTP(rrPlatform, reqPlatform)
		if rrPlatform.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rrPlatform.Code, rrPlatform.Body.String())
		}
		var platformBody map[string]bool
		if err := json.Unmarshal(rrPlatform.Body.Bytes(), &platformBody); err != nil {
			t.Fatalf("unmarshal failed: %v", err)
		}
		if !platformBody["enabled"] {
			t.Fatalf("expected platform enabled=true")
		}

		reqGoogle := httptest.NewRequest(http.MethodGet, "/api/v1/o2ul/preferences/oauth-providers/google/enabled", nil)
		rrGoogle := httptest.NewRecorder()
		router.ServeHTTP(rrGoogle, reqGoogle)
		if rrGoogle.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", rrGoogle.Code, rrGoogle.Body.String())
		}
		var googleBody map[string]bool
		if err := json.Unmarshal(rrGoogle.Body.Bytes(), &googleBody); err != nil {
			t.Fatalf("unmarshal failed: %v", err)
		}
		if googleBody["enabled"] {
			t.Fatalf("expected google enabled=false")
		}
	})

	t.Run("auth sync signIn and signOut update profile online state", func(t *testing.T) {
		signInPayload, _ := json.Marshal(map[string]any{"action": application.O2ULAuthSyncSignIn})
		signInReq := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/auth/sync-profile", bytes.NewReader(signInPayload))
		signInReq.Header.Set("Authorization", "Bearer "+registeredToken)
		signInReq.Header.Set("Content-Type", "application/json")
		signInRR := httptest.NewRecorder()
		router.ServeHTTP(signInRR, signInReq)
		if signInRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", signInRR.Code, signInRR.Body.String())
		}
		if !profiles.profiles[registered.ID].IsOnline {
			t.Fatalf("expected profile to be online after signIn")
		}

		signOutPayload, _ := json.Marshal(map[string]any{"action": application.O2ULAuthSyncSignOut})
		signOutReq := httptest.NewRequest(http.MethodPost, "/api/v1/o2ul/auth/sync-profile", bytes.NewReader(signOutPayload))
		signOutReq.Header.Set("Authorization", "Bearer "+registeredToken)
		signOutReq.Header.Set("Content-Type", "application/json")
		signOutRR := httptest.NewRecorder()
		router.ServeHTTP(signOutRR, signOutReq)
		if signOutRR.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", signOutRR.Code, signOutRR.Body.String())
		}
		if profiles.profiles[registered.ID].IsOnline {
			t.Fatalf("expected profile to be offline after signOut")
		}
	})
}
