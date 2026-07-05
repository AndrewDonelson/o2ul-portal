package application

import (
	"context"
	"errors"
	"time"

	"com.nlaak.backend-template/internal/domain"
)

type PreferencesService struct {
	repo PreferencesRepository
	logs LogSink
}

func NewPreferencesService(repo PreferencesRepository, logs LogSink) *PreferencesService {
	return &PreferencesService{repo: repo, logs: logs}
}

func defaultSettings(playerID string) domain.UserSettings {
	return domain.UserSettings{
		PlayerID:       playerID,
		Theme:          "theme-ocean",
		RefreshSeconds: 30,
		UpdatedAt:      time.Now().UTC(),
	}
}

func defaultNotifications(playerID string) domain.NotificationPreferences {
	return domain.NotificationPreferences{
		PlayerID:     playerID,
		EmailEnabled: true,
		PushEnabled:  false,
		InAppEnabled: true,
		UpdatedAt:    time.Now().UTC(),
	}
}

func (s *PreferencesService) GetSettings(ctx context.Context, playerID string) (domain.UserSettings, error) {
	settings, err := s.repo.GetSettings(ctx, playerID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return defaultSettings(playerID), nil
		}
		return domain.UserSettings{}, err
	}
	return settings, nil
}

func (s *PreferencesService) SaveSettings(ctx context.Context, settings domain.UserSettings) (domain.UserSettings, error) {
	if settings.PlayerID == "" {
		return domain.UserSettings{}, errors.New("player id is required")
	}
	if settings.Theme == "" {
		settings.Theme = "theme-ocean"
	}
	if settings.RefreshSeconds <= 0 {
		settings.RefreshSeconds = 30
	}
	settings.UpdatedAt = time.Now().UTC()
	if err := s.repo.UpsertSettings(ctx, settings); err != nil {
		return domain.UserSettings{}, err
	}
	s.logs.Info("settings_saved", map[string]any{"playerId": settings.PlayerID})
	return settings, nil
}

func (s *PreferencesService) GetNotificationPreferences(ctx context.Context, playerID string) (domain.NotificationPreferences, error) {
	prefs, err := s.repo.GetNotificationPreferences(ctx, playerID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return defaultNotifications(playerID), nil
		}
		return domain.NotificationPreferences{}, err
	}
	return prefs, nil
}

func (s *PreferencesService) SaveNotificationPreferences(ctx context.Context, prefs domain.NotificationPreferences) (domain.NotificationPreferences, error) {
	if prefs.PlayerID == "" {
		return domain.NotificationPreferences{}, errors.New("player id is required")
	}
	prefs.UpdatedAt = time.Now().UTC()
	if err := s.repo.UpsertNotificationPreferences(ctx, prefs); err != nil {
		return domain.NotificationPreferences{}, err
	}
	s.logs.Info("notification_preferences_saved", map[string]any{"playerId": prefs.PlayerID})
	return prefs, nil
}
