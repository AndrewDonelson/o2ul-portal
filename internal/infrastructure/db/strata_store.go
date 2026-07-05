package db

import (
	"context"
	"fmt"
	"time"

	"github.com/AndrewDonelson/strata"
)

func NewStrataDataStore(ctx context.Context, postgresDSN, redisAddr, redisPassword string, redisDB int) (*strata.DataStore, error) {
	if err := ensurePostgresDatabase(ctx, postgresDSN); err != nil {
		return nil, fmt.Errorf("ensurePostgresDatabase: %w", err)
	}

	ds, err := strata.NewDataStore(strata.Config{
		PostgresDSN:   postgresDSN,
		RedisAddr:     redisAddr,
		RedisPassword: redisPassword,
		RedisDB:       redisDB,
		L3Pool: strata.L3PoolConfig{
			MaxConns:        20,
			MinConns:        2,
			MaxConnLifetime: 30 * time.Minute,
			MaxConnIdleTime: 10 * time.Minute,
		},
		L2Pool:       strata.L2PoolConfig{PoolSize: 10},
		DefaultL1TTL: 60 * time.Second,
		DefaultL2TTL: 15 * time.Minute,
	})
	if err != nil {
		return nil, fmt.Errorf("strata.NewDataStore: %w", err)
	}
	if err := registerSchemas(ds); err != nil {
		_ = ds.Close()
		return nil, fmt.Errorf("registerSchemas: %w", err)
	}
	return ds, nil
}
