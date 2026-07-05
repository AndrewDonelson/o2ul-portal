package db

import (
	"context"
	"errors"
	"time"

	"com.nlaak.backend-template/internal/domain"
	"github.com/AndrewDonelson/strata"
)

const usersSchemaName = "users"

type userRecord struct {
	ID           string `strata:"primary_key"`
	Email        string `strata:"unique,index"`
	Username     string `strata:"index"`
	PasswordHash string
	Role         string    `strata:"index"`
	CreatedAt    time.Time `strata:"auto_now_add"`
	UpdatedAt    time.Time `strata:"auto_now"`
}

func registerSchemas(ds *strata.DataStore) error {
	if err := ds.Register(strata.Schema{
		Name:      usersSchemaName,
		Model:     &userRecord{},
		WriteMode: strata.WriteThrough,
		L1:        strata.MemPolicy{TTL: 30 * time.Second, MaxEntries: 10_000},
		L2:        strata.RedisPolicy{TTL: 5 * time.Minute},
		L3:        strata.PostgresPolicy{TableName: usersSchemaName},
	}); err != nil {
		return err
	}
	if err := registerPreferenceSchemas(ds); err != nil {
		return err
	}
	if err := registerPasswordResetSchemas(ds); err != nil {
		return err
	}
	return registerO2ULProfileSchemas(ds)
}

type StrataUserRepository struct {
	ds *strata.DataStore
}

func NewStrataUserRepository(ds *strata.DataStore) *StrataUserRepository {
	return &StrataUserRepository{ds: ds}
}

func (r *StrataUserRepository) Create(ctx context.Context, p domain.Player) (domain.Player, error) {
	record := toUserRecord(p)
	if err := r.ds.Set(ctx, usersSchemaName, p.ID, &record); err != nil {
		return domain.Player{}, err
	}
	return p, nil
}

func (r *StrataUserRepository) ByEmail(ctx context.Context, email string) (domain.Player, error) {
	q := strata.Q().Where("email = $1", email).Limit(1).Build()
	records, err := strata.SearchTyped[userRecord](ctx, r.ds, usersSchemaName, &q)
	if err != nil {
		return domain.Player{}, err
	}
	if len(records) == 0 {
		return domain.Player{}, errors.New("not found")
	}
	return fromUserRecord(records[0]), nil
}

func (r *StrataUserRepository) ByID(ctx context.Context, id string) (domain.Player, error) {
	record, err := strata.GetTyped[userRecord](ctx, r.ds, usersSchemaName, id)
	if err != nil {
		if errors.Is(err, strata.ErrNotFound) {
			return domain.Player{}, errors.New("not found")
		}
		return domain.Player{}, err
	}
	return fromUserRecord(*record), nil
}

func (r *StrataUserRepository) List(ctx context.Context) ([]domain.Player, error) {
	q := strata.Q().OrderBy("created_at").Desc().Build()
	records, err := strata.SearchTyped[userRecord](ctx, r.ds, usersSchemaName, &q)
	if err != nil {
		return nil, err
	}
	out := make([]domain.Player, 0, len(records))
	for _, record := range records {
		out = append(out, fromUserRecord(record))
	}
	return out, nil
}

func (r *StrataUserRepository) ListPage(ctx context.Context, offset, limit int) ([]domain.Player, bool, error) {
	if offset < 0 {
		offset = 0
	}
	if limit <= 0 {
		limit = 50
	}

	q := strata.Q().OrderBy("created_at").Desc().Offset(offset).Limit(limit + 1).Build()
	records, err := strata.SearchTyped[userRecord](ctx, r.ds, usersSchemaName, &q)
	if err != nil {
		return nil, false, err
	}

	hasMore := len(records) > limit
	if hasMore {
		records = records[:limit]
	}

	out := make([]domain.Player, 0, len(records))
	for _, record := range records {
		out = append(out, fromUserRecord(record))
	}
	return out, hasMore, nil
}

func (r *StrataUserRepository) UpdateRole(ctx context.Context, id string, role domain.Role, updatedAt time.Time) error {
	record, err := strata.GetTyped[userRecord](ctx, r.ds, usersSchemaName, id)
	if err != nil {
		if errors.Is(err, strata.ErrNotFound) {
			return errors.New("not found")
		}
		return err
	}
	record.Role = string(role)
	record.UpdatedAt = updatedAt
	return r.ds.Set(ctx, usersSchemaName, id, record)
}

func (r *StrataUserRepository) UpdatePassword(ctx context.Context, id string, passwordHash string, updatedAt time.Time) error {
	record, err := strata.GetTyped[userRecord](ctx, r.ds, usersSchemaName, id)
	if err != nil {
		if errors.Is(err, strata.ErrNotFound) {
			return errors.New("not found")
		}
		return err
	}
	record.PasswordHash = passwordHash
	record.UpdatedAt = updatedAt
	return r.ds.Set(ctx, usersSchemaName, id, record)
}

func toUserRecord(p domain.Player) userRecord {
	return userRecord{
		ID:           p.ID,
		Email:        p.Email,
		Username:     p.Username,
		PasswordHash: p.PasswordHash,
		Role:         string(p.Role),
		CreatedAt:    p.CreatedAt,
		UpdatedAt:    p.UpdatedAt,
	}
}

func fromUserRecord(r userRecord) domain.Player {
	return domain.Player{
		ID:           r.ID,
		Email:        r.Email,
		Username:     r.Username,
		PasswordHash: r.PasswordHash,
		Role:         domain.Role(r.Role),
		CreatedAt:    r.CreatedAt,
		UpdatedAt:    r.UpdatedAt,
	}
}
