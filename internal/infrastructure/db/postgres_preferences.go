package db

import (
	"context"
	"errors"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
	"github.com/AndrewDonelson/strata"
)

const (
	settingsSchemaName                = "user_settings"
	notificationPreferencesSchemaName = "notification_preferences"
)

type userSettingsRecord struct {
	PlayerID       string `strata:"primary_key"`
	Theme          string
	RefreshSeconds int
	UpdatedAt      time.Time `strata:"auto_now"`
}

type notificationPreferencesRecord struct {
	PlayerID     string `strata:"primary_key"`
	EmailEnabled bool
	PushEnabled  bool
	InAppEnabled bool
	UpdatedAt    time.Time `strata:"auto_now"`
}

func registerPreferenceSchemas(ds *strata.DataStore) error {
	if err := ds.Register(strata.Schema{
		Name:      settingsSchemaName,
		Model:     &userSettingsRecord{},
		WriteMode: strata.WriteThrough,
		L1:        strata.MemPolicy{TTL: 30 * time.Second, MaxEntries: 10_000},
		L2:        strata.RedisPolicy{TTL: 5 * time.Minute},
		L3:        strata.PostgresPolicy{TableName: settingsSchemaName},
	}); err != nil {
		return err
	}
	return ds.Register(strata.Schema{
		Name:      notificationPreferencesSchemaName,
		Model:     &notificationPreferencesRecord{},
		WriteMode: strata.WriteThrough,
		L1:        strata.MemPolicy{TTL: 30 * time.Second, MaxEntries: 10_000},
		L2:        strata.RedisPolicy{TTL: 5 * time.Minute},
		L3:        strata.PostgresPolicy{TableName: notificationPreferencesSchemaName},
	})
}

type StrataPreferencesRepository struct {
	ds *strata.DataStore
}

func NewStrataPreferencesRepository(ds *strata.DataStore) *StrataPreferencesRepository {
	return &StrataPreferencesRepository{ds: ds}
}

func (r *StrataPreferencesRepository) GetSettings(ctx context.Context, playerID string) (domain.UserSettings, error) {
	record, err := strata.GetTyped[userSettingsRecord](ctx, r.ds, settingsSchemaName, playerID)
	if err != nil {
		if errors.Is(err, strata.ErrNotFound) {
			return domain.UserSettings{}, application.ErrNotFound
		}
		return domain.UserSettings{}, err
	}
	return domain.UserSettings{
		PlayerID:       record.PlayerID,
		Theme:          record.Theme,
		RefreshSeconds: record.RefreshSeconds,
		UpdatedAt:      record.UpdatedAt,
	}, nil
}

func (r *StrataPreferencesRepository) UpsertSettings(ctx context.Context, settings domain.UserSettings) error {
	record := &userSettingsRecord{
		PlayerID:       settings.PlayerID,
		Theme:          settings.Theme,
		RefreshSeconds: settings.RefreshSeconds,
		UpdatedAt:      settings.UpdatedAt,
	}
	return r.ds.Set(ctx, settingsSchemaName, settings.PlayerID, record)
}

func (r *StrataPreferencesRepository) GetNotificationPreferences(ctx context.Context, playerID string) (domain.NotificationPreferences, error) {
	record, err := strata.GetTyped[notificationPreferencesRecord](ctx, r.ds, notificationPreferencesSchemaName, playerID)
	if err != nil {
		if errors.Is(err, strata.ErrNotFound) {
			return domain.NotificationPreferences{}, application.ErrNotFound
		}
		return domain.NotificationPreferences{}, err
	}
	return domain.NotificationPreferences{
		PlayerID:     record.PlayerID,
		EmailEnabled: record.EmailEnabled,
		PushEnabled:  record.PushEnabled,
		InAppEnabled: record.InAppEnabled,
		UpdatedAt:    record.UpdatedAt,
	}, nil
}

func (r *StrataPreferencesRepository) UpsertNotificationPreferences(ctx context.Context, prefs domain.NotificationPreferences) error {
	record := &notificationPreferencesRecord{
		PlayerID:     prefs.PlayerID,
		EmailEnabled: prefs.EmailEnabled,
		PushEnabled:  prefs.PushEnabled,
		InAppEnabled: prefs.InAppEnabled,
		UpdatedAt:    prefs.UpdatedAt,
	}
	return r.ds.Set(ctx, notificationPreferencesSchemaName, prefs.PlayerID, record)
}
