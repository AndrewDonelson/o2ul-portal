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

type adminRoleRepo struct {
	users map[string]domain.Player
}

func newAdminRoleRepo() *adminRoleRepo {
	return &adminRoleRepo{users: map[string]domain.Player{}}
}

func (r *adminRoleRepo) Create(_ context.Context, player domain.Player) (domain.Player, error) {
	if _, exists := r.users[player.ID]; exists {
		return domain.Player{}, errors.New("duplicate")
	}
	r.users[player.ID] = player
	return player, nil
}

func (r *adminRoleRepo) ByEmail(_ context.Context, email string) (domain.Player, error) {
	for _, u := range r.users {
		if u.Email == email {
			return u, nil
		}
	}
	return domain.Player{}, errors.New("not found")
}

func (r *adminRoleRepo) ByID(_ context.Context, id string) (domain.Player, error) {
	u, ok := r.users[id]
	if !ok {
		return domain.Player{}, errors.New("not found")
	}
	return u, nil
}

func (r *adminRoleRepo) List(_ context.Context) ([]domain.Player, error) {
	out := make([]domain.Player, 0, len(r.users))
	for _, u := range r.users {
		out = append(out, u)
	}
	return out, nil
}

func (r *adminRoleRepo) UpdateRole(_ context.Context, id string, role domain.Role, updatedAt time.Time) error {
	u, ok := r.users[id]
	if !ok {
		return errors.New("not found")
	}
	u.Role = role
	u.UpdatedAt = updatedAt
	r.users[id] = u
	return nil
}

func newAdminRoleTestRouter(t *testing.T) (http.Handler, *adminRoleRepo, *JWTService) {
	t.Helper()
	repo := newAdminRoleRepo()
	tokenSvc := NewJWTService("test-secret", time.Hour)
	authSvc := application.NewAuthService(repo, tokenSvc, authEndpointLog{})
	paymentSvc := application.NewPaymentService(authEndpointLog{})

	router := BuildAPIRouter(APIOptions{
		AuthService:    authSvc,
		PaymentService: paymentSvc,
		UserRepo:       repo,
		TokenSvc:       tokenSvc,
	})
	return router, repo, tokenSvc
}

func issueRoleToken(t *testing.T, tokenSvc *JWTService, role domain.Role) string {
	t.Helper()
	tkn, err := tokenSvc.Issue(domain.Player{
		ID:       "caller-" + string(role),
		Email:    string(role) + "@example.com",
		Username: string(role),
		Role:     role,
	})
	if err != nil {
		t.Fatalf("issue token failed: %v", err)
	}
	return tkn
}

func TestAdminRoleAssignmentMatrix_E2E(t *testing.T) {
	router, repo, tokenSvc := newAdminRoleTestRouter(t)

	now := time.Now().UTC()
	repo.users["registered-user"] = domain.Player{
		ID:        "registered-user",
		Email:     "registered@example.com",
		Username:  "registered-user",
		Role:      domain.RoleRegistered,
		CreatedAt: now,
		UpdatedAt: now,
	}
	repo.users["guest-user"] = domain.Player{
		ID:        "guest-user",
		Email:     "guest@example.com",
		Username:  "guest-user",
		Role:      domain.RoleGuest,
		CreatedAt: now,
		UpdatedAt: now,
	}

	tests := []struct {
		name        string
		callerRole  domain.Role
		targetID    string
		assignRole  domain.Role
		wantStatus  int
		wantNewRole domain.Role
	}{
		{
			name:        "master assigns admin",
			callerRole:  domain.RoleMasterAdmin,
			targetID:    "registered-user",
			assignRole:  domain.RoleAdmin,
			wantStatus:  http.StatusOK,
			wantNewRole: domain.RoleAdmin,
		},
		{
			name:       "admin cannot assign admin",
			callerRole: domain.RoleAdmin,
			targetID:   "registered-user",
			assignRole: domain.RoleAdmin,
			wantStatus: http.StatusForbidden,
		},
		{
			name:        "admin assigns sysop",
			callerRole:  domain.RoleAdmin,
			targetID:    "registered-user",
			assignRole:  domain.RoleSysOp,
			wantStatus:  http.StatusOK,
			wantNewRole: domain.RoleSysOp,
		},
		{
			name:        "sysop assigns moderator",
			callerRole:  domain.RoleSysOp,
			targetID:    "registered-user",
			assignRole:  domain.RoleModerator,
			wantStatus:  http.StatusOK,
			wantNewRole: domain.RoleModerator,
		},
		{
			name:       "moderator cannot assign sysop",
			callerRole: domain.RoleModerator,
			targetID:   "registered-user",
			assignRole: domain.RoleSysOp,
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "master cannot assign master",
			callerRole: domain.RoleMasterAdmin,
			targetID:   "registered-user",
			assignRole: domain.RoleMasterAdmin,
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "cannot assign elevated role to guest target",
			callerRole: domain.RoleAdmin,
			targetID:   "guest-user",
			assignRole: domain.RoleModerator,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "cannot assign subscriber to guest target",
			callerRole: domain.RoleModerator,
			targetID:   "guest-user",
			assignRole: domain.RoleSubscriber,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid role payload",
			callerRole: domain.RoleMasterAdmin,
			targetID:   "registered-user",
			assignRole: domain.Role("owner"),
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			token := issueRoleToken(t, tokenSvc, tc.callerRole)
			payload, _ := json.Marshal(map[string]string{"role": string(tc.assignRole)})
			req := httptest.NewRequest(http.MethodPatch, "/api/v1/admin/users/"+tc.targetID+"/role", bytes.NewReader(payload))
			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			rr := httptest.NewRecorder()

			router.ServeHTTP(rr, req)
			if rr.Code != tc.wantStatus {
				t.Fatalf("expected %d, got %d body=%s", tc.wantStatus, rr.Code, rr.Body.String())
			}

			if tc.wantStatus == http.StatusOK {
				updated, err := repo.ByID(context.Background(), tc.targetID)
				if err != nil {
					t.Fatalf("load updated user failed: %v", err)
				}
				if updated.Role != tc.wantNewRole {
					t.Fatalf("expected role %s, got %s", tc.wantNewRole, updated.Role)
				}
			}
		})
	}
}
