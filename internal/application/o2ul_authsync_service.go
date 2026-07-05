package application

import (
	"context"
	"errors"
	"strings"
	"time"
)

type O2ULAuthSyncService struct {
	users    UserRepository
	profiles O2ULUserProfileRepository
}

func NewO2ULAuthSyncService(users UserRepository, profiles O2ULUserProfileRepository) *O2ULAuthSyncService {
	return &O2ULAuthSyncService{users: users, profiles: profiles}
}

func (s *O2ULAuthSyncService) SyncProfile(ctx context.Context, callerID string, action O2ULAuthSyncAction) (string, error) {
	if strings.TrimSpace(callerID) == "" {
		return "", errors.New("missing caller id")
	}

	user, err := s.users.ByID(ctx, callerID)
	if err != nil {
		return "", err
	}

	profile, _ := s.profiles.GetByPlayerID(ctx, callerID)
	now := time.Now().UnixMilli()
	profile.PlayerID = callerID
	if profile.Username == "" {
		profile.Username = user.Username
	}
	if profile.Name == "" {
		profile.Name = user.Username
	}
	if profile.Email == "" {
		profile.Email = user.Email
	}
	profile.LastSeenUnix = now
	profile.UpdatedAtUnix = now
	if profile.CreatedAtUnix == 0 {
		profile.CreatedAtUnix = now
	}

	switch action {
	case O2ULAuthSyncSignIn:
		profile.IsOnline = true
		profile.LastLoginDateUnix = now
	case O2ULAuthSyncSignOut:
		profile.IsOnline = false
	default:
		return "", errors.New("invalid action")
	}

	_, err = s.profiles.Upsert(ctx, profile)
	if err != nil {
		return "", err
	}
	return callerID, nil
}
