package application

import (
	"context"

	"com.nlaak.backend-template/internal/domain/o2ul_presence"
)

type O2ULPresenceRepository interface {
	GetByUserID(ctx context.Context, userID string) (o2ul_presence.Presence, error)
	Upsert(ctx context.Context, presence o2ul_presence.Presence) (o2ul_presence.Presence, error)
	List(ctx context.Context) ([]o2ul_presence.Presence, error)
}
