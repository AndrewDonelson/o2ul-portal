package application

import (
	"context"
	"sort"
	"strings"
	"time"

	"com.nlaak.backend-template/internal/domain"
	"com.nlaak.backend-template/internal/domain/o2ul_users"
)

type O2ULUsersService struct {
	users    UserRepository
	profiles O2ULUserProfileRepository
}

func NewO2ULUsersService(users UserRepository, profiles O2ULUserProfileRepository) *O2ULUsersService {
	return &O2ULUsersService{users: users, profiles: profiles}
}

func (s *O2ULUsersService) Viewer(ctx context.Context, callerID string, callerRole domain.Role) (*o2ul_users.Viewer, error) {
	_ = callerRole
	if strings.TrimSpace(callerID) == "" {
		return nil, nil
	}

	user, err := s.users.ByID(ctx, callerID)
	if err != nil {
		return nil, err
	}
	profile, _ := s.profiles.GetByPlayerID(ctx, callerID)

	username := firstNonEmpty(profile.Username, user.Username)
	name := firstNonEmpty(profile.Name, user.Username)
	email := firstNonEmpty(profile.Email, user.Email)
	image := profile.Image
	adminRole := domain.Role("")
	if o2ul_users.IsAdminRole(user.Role) {
		adminRole = user.Role
	}

	return &o2ul_users.Viewer{
		UserID:          user.ID,
		Username:        username,
		Name:            name,
		Email:           email,
		Image:           image,
		Role:            user.Role,
		IsAnonymous:     profile.IsAnonymous,
		IsOnline:        profile.IsOnline,
		IsAdmin:         o2ul_users.IsAdminRole(user.Role),
		AdminRole:       adminRole,
		IsBetaTester:    profile.IsBetaTester,
		IsHookupEnabled: profile.IsHookupEnabled,
		LastSeen:        profile.LastSeenUnix,
		PresenceStatus:  presenceStatus(profile.IsOnline),
	}, nil
}

func (s *O2ULUsersService) GetPublic(ctx context.Context, id string) (*map[string]any, error) {
	user, err := s.users.ByID(ctx, id)
	if err != nil {
		return nil, err
	}
	profile, _ := s.profiles.GetByPlayerID(ctx, id)

	resp := map[string]any{
		"userId":     user.ID,
		"username":   firstNonEmpty(profile.Username, user.Username),
		"name":       firstNonEmpty(profile.Name, user.Username),
		"avatar":     profile.Image,
		"bio":        profile.Bio,
		"bgImageUrl": profile.BGImageURL,
		"isOnline":   profile.IsOnline,
		"role":       domain.RoleRegistered,
		"isAdmin":    o2ul_users.IsAdminRole(user.Role),
	}
	return &resp, nil
}

func (s *O2ULUsersService) GetCurrent(ctx context.Context, callerID string) (*map[string]any, error) {
	if strings.TrimSpace(callerID) == "" {
		return nil, nil
	}
	user, err := s.users.ByID(ctx, callerID)
	if err != nil {
		return nil, err
	}
	profile, _ := s.profiles.GetByPlayerID(ctx, callerID)

	resp := map[string]any{
		"id":               user.ID,
		"email":            user.Email,
		"username":         firstNonEmpty(profile.Username, user.Username),
		"role":             user.Role,
		"name":             firstNonEmpty(profile.Name, user.Username),
		"image":            profile.Image,
		"bio":              profile.Bio,
		"phone":            profile.Phone,
		"isOnline":         profile.IsOnline,
		"isAnonymous":      profile.IsAnonymous,
		"lastLoginDate":    profile.LastLoginDateUnix,
		"lastSeen":         profile.LastSeenUnix,
		"bgImageUrl":       profile.BGImageURL,
		"bgImageStorageId": profile.BGImageStorageID,
	}
	return &resp, nil
}

func (s *O2ULUsersService) List(ctx context.Context, page, pageSize int) (map[string]any, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}
	if pageSize > 200 {
		pageSize = 200
	}

	users, err := s.users.List(ctx)
	if err != nil {
		return nil, err
	}
	sort.Slice(users, func(i, j int) bool {
		return users[i].CreatedAt.After(users[j].CreatedAt)
	})

	offset := (page - 1) * pageSize
	if offset > len(users) {
		offset = len(users)
	}
	end := offset + pageSize
	if end > len(users) {
		end = len(users)
	}
	hasMore := end < len(users)

	items := make([]map[string]any, 0, end-offset)
	for _, user := range users[offset:end] {
		profile, _ := s.profiles.GetByPlayerID(ctx, user.ID)
		items = append(items, map[string]any{
			"id":       user.ID,
			"email":    user.Email,
			"username": firstNonEmpty(profile.Username, user.Username),
			"role":     user.Role,
			"name":     firstNonEmpty(profile.Name, user.Username),
			"image":    profile.Image,
		})
	}

	return map[string]any{
		"items": items,
		"pagination": map[string]any{
			"page":       page,
			"pageSize":   pageSize,
			"hasMore":    hasMore,
			"totalCount": len(users),
		},
	}, nil
}

func (s *O2ULUsersService) BatchProfiles(ctx context.Context, ids []string) ([]o2ul_users.Profile, error) {
	profiles, err := s.profiles.BatchGetByPlayerIDs(ctx, ids)
	if err != nil {
		return nil, err
	}
	seen := make(map[string]struct{}, len(profiles))
	for _, p := range profiles {
		seen[p.PlayerID] = struct{}{}
	}
	for _, id := range ids {
		if _, ok := seen[id]; ok {
			continue
		}
		profiles = append(profiles, o2ul_users.Profile{
			PlayerID: id,
			Username: "anonymous",
			Name:     "Anonymous User",
			IsOnline: false,
		})
	}
	return profiles, nil
}

func (s *O2ULUsersService) InitUser(ctx context.Context, callerID, email, username string) (o2ul_users.Profile, error) {
	profile, err := s.profiles.GetByPlayerID(ctx, callerID)
	if err == nil {
		profile.LastLoginDateUnix = time.Now().UnixMilli()
		profile.LastSeenUnix = time.Now().UnixMilli()
		profile.IsOnline = true
		return s.profiles.Upsert(ctx, profile)
	}

	created := o2ul_users.Profile{
		PlayerID:          callerID,
		Username:          username,
		Name:              firstNonEmpty(username, "New User"),
		Email:             email,
		IsAnonymous:       false,
		IsOnline:          true,
		LastLoginDateUnix: time.Now().UnixMilli(),
		LastSeenUnix:      time.Now().UnixMilli(),
		CreatedAtUnix:     time.Now().UnixMilli(),
		UpdatedAtUnix:     time.Now().UnixMilli(),
	}
	return s.profiles.Upsert(ctx, created)
}

func (s *O2ULUsersService) UpdateProfile(ctx context.Context, callerID string, patch map[string]any) (o2ul_users.Profile, error) {
	profile, _ := s.profiles.GetByPlayerID(ctx, callerID)
	profile.PlayerID = callerID
	applyProfilePatch(&profile, patch)
	profile.UpdatedAtUnix = time.Now().UnixMilli()
	if profile.CreatedAtUnix == 0 {
		profile.CreatedAtUnix = profile.UpdatedAtUnix
	}
	return s.profiles.Upsert(ctx, profile)
}

func (s *O2ULUsersService) UpdateBackground(ctx context.Context, callerID, url, storageID string) (o2ul_users.Profile, error) {
	profile, _ := s.profiles.GetByPlayerID(ctx, callerID)
	profile.PlayerID = callerID
	profile.BGImageURL = url
	profile.BGImageStorageID = storageID
	profile.UpdatedAtUnix = time.Now().UnixMilli()
	if profile.CreatedAtUnix == 0 {
		profile.CreatedAtUnix = profile.UpdatedAtUnix
	}
	return s.profiles.Upsert(ctx, profile)
}

func (s *O2ULUsersService) DeletePlatformData(ctx context.Context, callerID string) error {
	return s.profiles.DeleteByPlayerID(ctx, callerID)
}

func applyProfilePatch(profile *o2ul_users.Profile, patch map[string]any) {
	if v, ok := patch["username"].(string); ok {
		profile.Username = v
	}
	if v, ok := patch["name"].(string); ok {
		profile.Name = v
	}
	if v, ok := patch["bio"].(string); ok {
		profile.Bio = v
	}
	if v, ok := patch["email"].(string); ok {
		profile.Email = v
	}
	if v, ok := patch["phone"].(string); ok {
		profile.Phone = v
	}
	if v, ok := patch["bgImageUrl"].(string); ok {
		profile.BGImageURL = v
	}
	if v, ok := patch["bgImageStorageId"].(string); ok {
		profile.BGImageStorageID = v
	}
	if v, ok := patch["bgImageOpacity"].(float64); ok {
		profile.BGImageOpacity = v
	}
	if v, ok := patch["image"].(string); ok {
		profile.Image = v
	}
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func presenceStatus(isOnline bool) string {
	if isOnline {
		return "online"
	}
	return "offline"
}
