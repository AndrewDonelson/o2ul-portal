package db

import (
	"context"
	"errors"

	"github.com/AndrewDonelson/strata"
)

type Migrator struct {
	ds            *strata.DataStore
	migrationsDir string
}

func NewMigrator(ds *strata.DataStore, migrationsDir string) *Migrator {
	return &Migrator{ds: ds, migrationsDir: migrationsDir}
}

func (m *Migrator) Up(ctx context.Context) error {
	if err := m.ds.Migrate(ctx); err != nil {
		return err
	}
	return m.ds.MigrateFrom(ctx, m.migrationsDir)
}

func (m *Migrator) DownOne(ctx context.Context) error {
	_ = ctx
	return errors.New("down migrations are not supported in strata-only mode")
}
