package startup

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

func ProbePostgres(postgresDSN string, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	pool, err := pgxpool.New(ctx, postgresDSN)
	if err != nil {
		return err
	}
	defer pool.Close()

	return pool.Ping(ctx)
}

func ProbeRedis(redisAddr, redisPassword string, redisDB int, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	client := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPassword,
		DB:       redisDB,
	})
	defer client.Close()

	return client.Ping(ctx).Err()
}

func EnvSourceForLog(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return "defaults (no .env/.env.local found)"
	}
	return trimmed
}

func LayerStatusLabel(err error) string {
	if err == nil {
		return "active"
	}
	return fmt.Sprintf("unavailable (%v)", err)
}
