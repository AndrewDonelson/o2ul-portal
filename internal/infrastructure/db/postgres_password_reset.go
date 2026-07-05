package db

import (
	"context"
	"errors"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
	"github.com/AndrewDonelson/strata"
)

const passwordResetTokensSchemaName = "password_reset_tokens"

type passwordResetTokenRecord struct {
	ID        string    `strata:"primary_key"`
	PlayerID  string    `strata:"index"`
	TokenHash string    `strata:"unique,index"`
	ExpiresAt time.Time `strata:"index"`
	CreatedAt time.Time `strata:"auto_now_add"`
	Used      bool      `strata:"index"`
	UsedAt    time.Time
}

func registerPasswordResetSchemas(ds *strata.DataStore) error {
	return ds.Register(strata.Schema{
		Name:      passwordResetTokensSchemaName,
		Model:     &passwordResetTokenRecord{},
		WriteMode: strata.WriteThrough,
		L1:        strata.MemPolicy{TTL: 30 * time.Second, MaxEntries: 10_000},
		L2:        strata.RedisPolicy{TTL: 5 * time.Minute},
		L3:        strata.PostgresPolicy{TableName: passwordResetTokensSchemaName},
	})
}

type StrataPasswordResetRepository struct {
	ds *strata.DataStore
}

func NewStrataPasswordResetRepository(ds *strata.DataStore) *StrataPasswordResetRepository {
	return &StrataPasswordResetRepository{ds: ds}
}

func (r *StrataPasswordResetRepository) Create(ctx context.Context, token domain.PasswordResetToken) error {
	record := &passwordResetTokenRecord{
		ID:        token.ID,
		PlayerID:  token.PlayerID,
		TokenHash: token.TokenHash,
		ExpiresAt: token.ExpiresAt,
		CreatedAt: token.CreatedAt,
		Used:      token.Used,
		UsedAt:    token.UsedAt,
	}
	return r.ds.Set(ctx, passwordResetTokensSchemaName, token.ID, record)
}

func (r *StrataPasswordResetRepository) GetValidByHash(ctx context.Context, tokenHash string, now time.Time) (domain.PasswordResetToken, error) {
	q := strata.Q().Where("token_hash = $1 AND used = $2 AND expires_at > $3", tokenHash, false, now).Limit(1).Build()
	records, err := strata.SearchTyped[passwordResetTokenRecord](ctx, r.ds, passwordResetTokensSchemaName, &q)
	if err != nil {
		return domain.PasswordResetToken{}, err
	}
	if len(records) == 0 {
		return domain.PasswordResetToken{}, application.ErrNotFound
	}
	return toPasswordResetDomain(records[0]), nil
}

func (r *StrataPasswordResetRepository) MarkUsed(ctx context.Context, id string, usedAt time.Time) error {
	record, err := strata.GetTyped[passwordResetTokenRecord](ctx, r.ds, passwordResetTokensSchemaName, id)
	if err != nil {
		if errors.Is(err, strata.ErrNotFound) {
			return application.ErrNotFound
		}
		return err
	}
	record.Used = true
	record.UsedAt = usedAt
	return r.ds.Set(ctx, passwordResetTokensSchemaName, id, record)
}

func toPasswordResetDomain(record passwordResetTokenRecord) domain.PasswordResetToken {
	return domain.PasswordResetToken{
		ID:        record.ID,
		PlayerID:  record.PlayerID,
		TokenHash: record.TokenHash,
		ExpiresAt: record.ExpiresAt,
		CreatedAt: record.CreatedAt,
		Used:      record.Used,
		UsedAt:    record.UsedAt,
	}
}
