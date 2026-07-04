package db

import (
	"context"
	"errors"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain/o2ul_presence"
	"github.com/AndrewDonelson/strata"
)

const o2ulPresenceSchemaName = "o2ul_presence"

type o2ulPresenceRecord struct {
	UserKey         string `strata:"primary_key"`
	IsOnline        bool
	LastSeen        int64 `strata:"index"`
	PresenceStatus  string
	LastActive      int64
	CreatedTime     time.Time `strata:"auto_now_add"`
	LastUpdatedTime time.Time `strata:"auto_now"`
}

func registerO2ULPresenceSchemas(ds *strata.DataStore) error {
	if err := ds.Register(strata.Schema{
		Name:      o2ulPresenceSchemaName,
		Model:     &o2ulPresenceRecord{},
		WriteMode: strata.WriteThrough,
		L1:        strata.MemPolicy{TTL: 15 * time.Second, MaxEntries: 50_000},
		L2:        strata.RedisPolicy{TTL: 2 * time.Minute},
		L3:        strata.PostgresPolicy{TableName: o2ulPresenceSchemaName},
	}); err != nil {
		return err
	}
	return registerO2ULNotificationSchemas(ds)
}

type StrataO2ULPresenceRepository struct {
	ds *strata.DataStore
}

func NewStrataO2ULPresenceRepository(ds *strata.DataStore) *StrataO2ULPresenceRepository {
	return &StrataO2ULPresenceRepository{ds: ds}
}

func (r *StrataO2ULPresenceRepository) GetByUserID(ctx context.Context, userID string) (o2ul_presence.Presence, error) {
	record, err := strata.GetTyped[o2ulPresenceRecord](ctx, r.ds, o2ulPresenceSchemaName, userID)
	if err != nil {
		if errors.Is(err, strata.ErrNotFound) {
			return o2ul_presence.Presence{}, application.ErrNotFound
		}
		return o2ul_presence.Presence{}, err
	}
	return o2ul_presence.Presence{
		UserID:         record.UserKey,
		IsOnline:       record.IsOnline,
		LastSeen:       record.LastSeen,
		PresenceStatus: record.PresenceStatus,
		LastActive:     record.LastActive,
	}, nil
}

func (r *StrataO2ULPresenceRepository) Upsert(ctx context.Context, presence o2ul_presence.Presence) (o2ul_presence.Presence, error) {
	record := o2ulPresenceRecord{
		UserKey:        presence.UserID,
		IsOnline:       presence.IsOnline,
		LastSeen:       presence.LastSeen,
		PresenceStatus: presence.PresenceStatus,
		LastActive:     presence.LastActive,
	}
	if err := r.ds.Set(ctx, o2ulPresenceSchemaName, presence.UserID, &record); err != nil {
		return o2ul_presence.Presence{}, err
	}
	return presence, nil
}

func (r *StrataO2ULPresenceRepository) List(ctx context.Context) ([]o2ul_presence.Presence, error) {
	q := strata.Q().Build()
	records, err := strata.SearchTyped[o2ulPresenceRecord](ctx, r.ds, o2ulPresenceSchemaName, &q)
	if err != nil {
		return nil, err
	}
	out := make([]o2ul_presence.Presence, 0, len(records))
	for _, record := range records {
		out = append(out, o2ul_presence.Presence{
			UserID:         record.UserKey,
			IsOnline:       record.IsOnline,
			LastSeen:       record.LastSeen,
			PresenceStatus: record.PresenceStatus,
			LastActive:     record.LastActive,
		})
	}
	return out, nil
}
