package db

import (
	"context"
	"errors"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain/o2ul_preferences"
	"github.com/AndrewDonelson/strata"
)

const o2ulPreferencesSchemaName = "o2ul_preferences"
const o2ulPreferencesKey = "system"

type o2ulPreferencesRecord struct {
	ID                    string `strata:"primary_key"`
	Mode                  string
	EnableCalling         bool
	EnabledOAuthProviders []string
	LastUpdatedUnix       int64
	UpdatedBy             string
	CreatedAt             time.Time `strata:"auto_now_add"`
	UpdatedAt             time.Time `strata:"auto_now"`
}

func registerO2ULPreferenceSchemas(ds *strata.DataStore) error {
	if err := ds.Register(strata.Schema{
		Name:      o2ulPreferencesSchemaName,
		Model:     &o2ulPreferencesRecord{},
		WriteMode: strata.WriteThrough,
		L1:        strata.MemPolicy{TTL: 30 * time.Second, MaxEntries: 1_000},
		L2:        strata.RedisPolicy{TTL: 5 * time.Minute},
		L3:        strata.PostgresPolicy{TableName: o2ulPreferencesSchemaName},
	}); err != nil {
		return err
	}
	return registerO2ULFileSchemas(ds)
}

type StrataO2ULPreferencesRepository struct {
	ds *strata.DataStore
}

func NewStrataO2ULPreferencesRepository(ds *strata.DataStore) *StrataO2ULPreferencesRepository {
	return &StrataO2ULPreferencesRepository{ds: ds}
}

func (r *StrataO2ULPreferencesRepository) Get(ctx context.Context) (o2ul_preferences.SystemPreferences, error) {
	record, err := strata.GetTyped[o2ulPreferencesRecord](ctx, r.ds, o2ulPreferencesSchemaName, o2ulPreferencesKey)
	if err != nil {
		if errors.Is(err, strata.ErrNotFound) {
			return o2ul_preferences.SystemPreferences{}, application.ErrNotFound
		}
		return o2ul_preferences.SystemPreferences{}, err
	}
	return o2ul_preferences.SystemPreferences{
		Mode:                  record.Mode,
		EnableCalling:         record.EnableCalling,
		EnabledOAuthProviders: record.EnabledOAuthProviders,
		LastUpdatedUnix:       record.LastUpdatedUnix,
		UpdatedBy:             record.UpdatedBy,
	}, nil
}

func (r *StrataO2ULPreferencesRepository) Upsert(ctx context.Context, prefs o2ul_preferences.SystemPreferences) (o2ul_preferences.SystemPreferences, error) {
	record := &o2ulPreferencesRecord{
		ID:                    o2ulPreferencesKey,
		Mode:                  prefs.Mode,
		EnableCalling:         prefs.EnableCalling,
		EnabledOAuthProviders: prefs.EnabledOAuthProviders,
		LastUpdatedUnix:       prefs.LastUpdatedUnix,
		UpdatedBy:             prefs.UpdatedBy,
	}
	if err := r.ds.Set(ctx, o2ulPreferencesSchemaName, o2ulPreferencesKey, record); err != nil {
		return o2ul_preferences.SystemPreferences{}, err
	}
	return prefs, nil
}
