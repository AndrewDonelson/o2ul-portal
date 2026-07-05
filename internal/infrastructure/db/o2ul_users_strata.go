package db

import (
	"context"
	"errors"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain/o2ul_users"
	"github.com/AndrewDonelson/strata"
)

const o2ulProfilesSchemaName = "o2ul_user_profiles"

type o2ulProfileRecord struct {
	PlayerID          string `strata:"primary_key"`
	Username          string `strata:"index"`
	Name              string
	Email             string `strata:"index"`
	Image             string
	Bio               string
	Phone             string
	BGImageURL        string
	BGImageStorageID  string
	BGImageOpacity    float64
	IsAnonymous       bool
	IsOnline          bool
	IsBetaTester      bool
	IsHookupEnabled   bool
	LastLoginDateUnix int64
	LastSeenUnix      int64
	CreatedAtUnix     int64
	UpdatedAtUnix     int64
	CreatedAt         time.Time `strata:"auto_now_add"`
	UpdatedAt         time.Time `strata:"auto_now"`
}

func registerO2ULProfileSchemas(ds *strata.DataStore) error {
	if err := ds.Register(strata.Schema{
		Name:      o2ulProfilesSchemaName,
		Model:     &o2ulProfileRecord{},
		WriteMode: strata.WriteThrough,
		L1:        strata.MemPolicy{TTL: 30 * time.Second, MaxEntries: 10_000},
		L2:        strata.RedisPolicy{TTL: 5 * time.Minute},
		L3:        strata.PostgresPolicy{TableName: o2ulProfilesSchemaName},
	}); err != nil {
		return err
	}
	return registerO2ULPreferenceSchemas(ds)
}

type StrataO2ULUserProfileRepository struct {
	ds *strata.DataStore
}

func NewStrataO2ULUserProfileRepository(ds *strata.DataStore) *StrataO2ULUserProfileRepository {
	return &StrataO2ULUserProfileRepository{ds: ds}
}

func (r *StrataO2ULUserProfileRepository) GetByPlayerID(ctx context.Context, playerID string) (o2ul_users.Profile, error) {
	record, err := strata.GetTyped[o2ulProfileRecord](ctx, r.ds, o2ulProfilesSchemaName, playerID)
	if err != nil {
		if errors.Is(err, strata.ErrNotFound) {
			return o2ul_users.Profile{}, application.ErrNotFound
		}
		return o2ul_users.Profile{}, err
	}
	return fromO2ULProfileRecord(*record), nil
}

func (r *StrataO2ULUserProfileRepository) Upsert(ctx context.Context, profile o2ul_users.Profile) (o2ul_users.Profile, error) {
	record := toO2ULProfileRecord(profile)
	if err := r.ds.Set(ctx, o2ulProfilesSchemaName, profile.PlayerID, &record); err != nil {
		return o2ul_users.Profile{}, err
	}
	return profile, nil
}

func (r *StrataO2ULUserProfileRepository) BatchGetByPlayerIDs(ctx context.Context, playerIDs []string) ([]o2ul_users.Profile, error) {
	out := make([]o2ul_users.Profile, 0, len(playerIDs))
	for _, id := range playerIDs {
		profile, err := r.GetByPlayerID(ctx, id)
		if err != nil {
			if errors.Is(err, application.ErrNotFound) {
				continue
			}
			return nil, err
		}
		out = append(out, profile)
	}
	return out, nil
}

func (r *StrataO2ULUserProfileRepository) DeleteByPlayerID(ctx context.Context, playerID string) error {
	return r.ds.Delete(ctx, o2ulProfilesSchemaName, playerID)
}

func toO2ULProfileRecord(p o2ul_users.Profile) o2ulProfileRecord {
	return o2ulProfileRecord{
		PlayerID:          p.PlayerID,
		Username:          p.Username,
		Name:              p.Name,
		Email:             p.Email,
		Image:             p.Image,
		Bio:               p.Bio,
		Phone:             p.Phone,
		BGImageURL:        p.BGImageURL,
		BGImageStorageID:  p.BGImageStorageID,
		BGImageOpacity:    p.BGImageOpacity,
		IsAnonymous:       p.IsAnonymous,
		IsOnline:          p.IsOnline,
		IsBetaTester:      p.IsBetaTester,
		IsHookupEnabled:   p.IsHookupEnabled,
		LastLoginDateUnix: p.LastLoginDateUnix,
		LastSeenUnix:      p.LastSeenUnix,
		CreatedAtUnix:     p.CreatedAtUnix,
		UpdatedAtUnix:     p.UpdatedAtUnix,
	}
}

func fromO2ULProfileRecord(r o2ulProfileRecord) o2ul_users.Profile {
	return o2ul_users.Profile{
		PlayerID:          r.PlayerID,
		Username:          r.Username,
		Name:              r.Name,
		Email:             r.Email,
		Image:             r.Image,
		Bio:               r.Bio,
		Phone:             r.Phone,
		BGImageURL:        r.BGImageURL,
		BGImageStorageID:  r.BGImageStorageID,
		BGImageOpacity:    r.BGImageOpacity,
		IsAnonymous:       r.IsAnonymous,
		IsOnline:          r.IsOnline,
		IsBetaTester:      r.IsBetaTester,
		IsHookupEnabled:   r.IsHookupEnabled,
		LastLoginDateUnix: r.LastLoginDateUnix,
		LastSeenUnix:      r.LastSeenUnix,
		CreatedAtUnix:     r.CreatedAtUnix,
		UpdatedAtUnix:     r.UpdatedAtUnix,
	}
}
