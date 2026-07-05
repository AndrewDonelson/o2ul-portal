package application

import (
	"context"

	"com.nlaak.backend-template/internal/domain/o2ul_preferences"
)

type O2ULPreferencesRepository interface {
	Get(ctx context.Context) (o2ul_preferences.SystemPreferences, error)
	Upsert(ctx context.Context, prefs o2ul_preferences.SystemPreferences) (o2ul_preferences.SystemPreferences, error)
}
