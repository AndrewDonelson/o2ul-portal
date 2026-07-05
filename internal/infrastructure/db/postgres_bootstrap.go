package db

import (
	"context"
	"fmt"
	"net/url"
	"path"
	"strings"

	"github.com/jackc/pgx/v5"
)

func ensurePostgresDatabase(ctx context.Context, postgresDSN string) error {
	adminDSN, dbName, err := postgresAdminDSN(postgresDSN)
	if err != nil {
		return err
	}

	conn, err := pgx.Connect(ctx, adminDSN)
	if err != nil {
		return fmt.Errorf("connect admin db: %w", err)
	}
	defer conn.Close(ctx)

	var exists bool
	if err := conn.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)", dbName).Scan(&exists); err != nil {
		return fmt.Errorf("check db existence: %w", err)
	}
	if exists {
		return nil
	}

	query := fmt.Sprintf("CREATE DATABASE %s", quotePGIdentifier(dbName))
	if _, err := conn.Exec(ctx, query); err != nil {
		return fmt.Errorf("create db %q: %w", dbName, err)
	}

	return nil
}

func postgresAdminDSN(postgresDSN string) (string, string, error) {
	u, err := url.Parse(postgresDSN)
	if err != nil {
		return "", "", fmt.Errorf("parse postgres dsn: %w", err)
	}

	dbName := strings.TrimPrefix(u.Path, "/")
	if dbName == "" {
		return "", "", fmt.Errorf("postgres dsn missing database name")
	}

	u.Path = path.Join("/", "postgres")
	return u.String(), dbName, nil
}

func quotePGIdentifier(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}
