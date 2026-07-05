package application

import (
	"context"
	"errors"
	"time"

	"com.nlaak.backend-template/internal/domain"
	"com.nlaak.backend-template/internal/domain/o2ul_preferences"
)

type O2ULPreferencesService struct {
	repo O2ULPreferencesRepository
}

func NewO2ULPreferencesService(repo O2ULPreferencesRepository) *O2ULPreferencesService {
	return &O2ULPreferencesService{repo: repo}
}

func (s *O2ULPreferencesService) Get(ctx context.Context) (o2ul_preferences.SystemPreferences, error) {
	prefs, err := s.repo.Get(ctx)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return o2ul_preferences.DefaultPreferences(time.Now().UnixMilli()), nil
		}
		return o2ul_preferences.SystemPreferences{}, err
	}
	if len(prefs.EnabledOAuthProviders) == 0 {
		prefs.EnabledOAuthProviders = []string{o2ul_preferences.BuiltInAuthProvider}
	}
	return prefs, nil
}

func (s *O2ULPreferencesService) UpdateMode(ctx context.Context, callerID string, callerRole domain.Role, mode string) (o2ul_preferences.SystemPreferences, error) {
	if !domain.CanActAs(callerRole, domain.RoleAdmin) {
		return o2ul_preferences.SystemPreferences{}, errors.New("admin access required")
	}
	prefs, _ := s.Get(ctx)
	prefs.Mode = mode
	prefs.UpdatedBy = callerID
	prefs.LastUpdatedUnix = time.Now().UnixMilli()
	prefs.EnabledOAuthProviders = []string{o2ul_preferences.BuiltInAuthProvider}
	return s.repo.Upsert(ctx, prefs)
}

func (s *O2ULPreferencesService) UpdateCallingState(ctx context.Context, callerID string, callerRole domain.Role, enabled bool) (o2ul_preferences.SystemPreferences, error) {
	if !domain.CanActAs(callerRole, domain.RoleAdmin) {
		return o2ul_preferences.SystemPreferences{}, errors.New("admin access required")
	}
	prefs, _ := s.Get(ctx)
	prefs.EnableCalling = enabled
	prefs.UpdatedBy = callerID
	prefs.LastUpdatedUnix = time.Now().UnixMilli()
	prefs.EnabledOAuthProviders = []string{o2ul_preferences.BuiltInAuthProvider}
	return s.repo.Upsert(ctx, prefs)
}

func (s *O2ULPreferencesService) UpdateOAuthProviders(ctx context.Context, callerID string, callerRole domain.Role, providers []string) (o2ul_preferences.SystemPreferences, error) {
	if !domain.CanActAs(callerRole, domain.RoleAdmin) {
		return o2ul_preferences.SystemPreferences{}, errors.New("admin access required")
	}
	_ = providers
	prefs, _ := s.Get(ctx)
	prefs.EnabledOAuthProviders = []string{o2ul_preferences.BuiltInAuthProvider}
	prefs.UpdatedBy = callerID
	prefs.LastUpdatedUnix = time.Now().UnixMilli()
	return s.repo.Upsert(ctx, prefs)
}

func (s *O2ULPreferencesService) IsOAuthProviderEnabled(ctx context.Context, provider string) (bool, error) {
	if provider == o2ul_preferences.BuiltInAuthProvider {
		return true, nil
	}
	prefs, err := s.Get(ctx)
	if err != nil {
		return false, err
	}
	for _, p := range prefs.EnabledOAuthProviders {
		if p == provider {
			return true, nil
		}
	}
	return false, nil
}
