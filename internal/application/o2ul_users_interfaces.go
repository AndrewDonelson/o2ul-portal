package application

import (
	"context"

	"com.nlaak.backend-template/internal/domain/o2ul_users"
)

type O2ULUserProfileRepository interface {
	GetByPlayerID(ctx context.Context, playerID string) (o2ul_users.Profile, error)
	Upsert(ctx context.Context, profile o2ul_users.Profile) (o2ul_users.Profile, error)
	BatchGetByPlayerIDs(ctx context.Context, playerIDs []string) ([]o2ul_users.Profile, error)
	DeleteByPlayerID(ctx context.Context, playerID string) error
}
