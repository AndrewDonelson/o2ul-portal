package application

import (
	"context"
	"time"
)

type StrataMigrationRecord struct {
	ID        int       `json:"id"`
	Schema    string    `json:"schema"`
	FileName  string    `json:"fileName"`
	AppliedAt time.Time `json:"appliedAt"`
}

type StrataStatus struct {
	Gets           int64                   `json:"gets"`
	Sets           int64                   `json:"sets"`
	Deletes        int64                   `json:"deletes"`
	Errors         int64                   `json:"errors"`
	DirtyCount     int64                   `json:"dirtyCount"`
	L1Entries      int64                   `json:"l1Entries"`
	MigrationCount int                     `json:"migrationCount"`
	Migrations     []StrataMigrationRecord `json:"migrations"`
}

type StrataAdminService interface {
	Status(ctx context.Context) (StrataStatus, error)
}
