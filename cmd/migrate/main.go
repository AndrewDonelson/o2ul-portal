package main

import (
	"context"
	"log"
	"os"
	"time"

	"com.nlaak.backend-template/internal/infrastructure/config"
	"com.nlaak.backend-template/internal/infrastructure/db"
	"com.nlaak.backend-template/internal/infrastructure/startup"
)

func main() {
	startup.ConfigureProcessLogger("MIGRATE")

	cfg := config.LoadFor("MIGRATE")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	ds, err := db.NewStrataDataStore(ctx, cfg.PostgresDSN, cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		log.Fatalf("strata init failed: %v", err)
	}
	defer ds.Close()

	m := db.NewMigrator(ds, "./internal/infrastructure/db/migrations")
	if len(os.Args) > 1 && os.Args[1] == "o2ul-slice1-backfill" {
		if err := runO2ULSlice1Backfill(ctx, ds, os.Args[2:]); err != nil {
			log.Fatalf("o2ul backfill failed: %v", err)
		}
		return
	}
	if len(os.Args) > 1 && os.Args[1] == "down" {
		if err := m.DownOne(ctx); err != nil {
			log.Fatalf("migration down failed: %v", err)
		}
		log.Println("migration down completed")
		return
	}
	if err := m.Up(ctx); err != nil {
		log.Fatalf("migration up failed: %v", err)
	}
	log.Println("migration up completed")
}
