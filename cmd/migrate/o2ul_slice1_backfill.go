package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"com.nlaak.backend-template/internal/domain/o2ul_preferences"
	"com.nlaak.backend-template/internal/domain/o2ul_users"
	"com.nlaak.backend-template/internal/infrastructure/db"
	"github.com/AndrewDonelson/strata"
)

type o2ulBackfillOptions struct {
	InputFile         string
	DryRun            bool
	AllowMissingUsers bool
}

type legacyO2ULExport struct {
	Profiles     []legacyProfile    `json:"profiles"`
	UserProfiles []legacyProfile    `json:"userProfiles"`
	Preferences  *legacyPreferences `json:"preferences"`
}

type legacyProfile struct {
	PlayerID         string  `json:"playerId"`
	UserID           string  `json:"userId"`
	Username         string  `json:"username"`
	Name             string  `json:"name"`
	Email            string  `json:"email"`
	Phone            string  `json:"phone"`
	Bio              string  `json:"bio"`
	Image            string  `json:"image"`
	BGImageURL       string  `json:"bgImageUrl"`
	BGImageStorageID string  `json:"bgImageStorageId"`
	BGImageOpacity   float64 `json:"bgImageOpacity"`
	IsAnonymous      *bool   `json:"isAnonymous"`
	IsOnline         *bool   `json:"isOnline"`
	IsBetaTester     *bool   `json:"isBetaTester"`
	IsHookupEnabled  *bool   `json:"isHookupEnabled"`
	LastLoginDate    *int64  `json:"lastLoginDate"`
	LastSeen         *int64  `json:"lastSeen"`
	CreatedAt        *int64  `json:"createdAt"`
	UpdatedAt        *int64  `json:"updatedAt"`
}

type legacyPreferences struct {
	Mode                  string   `json:"mode"`
	EnableCalling         *bool    `json:"enableCalling"`
	EnabledOAuthProviders []string `json:"enabledOAuthProviders"`
	LastUpdated           *int64   `json:"lastUpdated"`
	UpdatedBy             string   `json:"updatedBy"`
}

type backfillStats struct {
	ProfileTotal      int
	ProfileImported   int
	ProfileSkipped    int
	PreferenceHandled bool
	PreferenceUpdated bool
}

func runO2ULSlice1Backfill(ctx context.Context, ds *strata.DataStore, args []string) error {
	opts, err := parseO2ULBackfillFlags(args)
	if err != nil {
		return err
	}

	legacyData, err := loadLegacyExport(opts.InputFile)
	if err != nil {
		return err
	}

	userRepo := db.NewStrataUserRepository(ds)
	profileRepo := db.NewStrataO2ULUserProfileRepository(ds)
	prefRepo := db.NewStrataO2ULPreferencesRepository(ds)

	stats, err := executeBackfill(ctx, userRepo, profileRepo, prefRepo, legacyData, opts)
	if err != nil {
		return err
	}

	log.Printf("o2ul backfill completed: dry_run=%t profiles_total=%d imported=%d skipped=%d preferences_seen=%t preferences_updated=%t",
		opts.DryRun,
		stats.ProfileTotal,
		stats.ProfileImported,
		stats.ProfileSkipped,
		stats.PreferenceHandled,
		stats.PreferenceUpdated,
	)

	return nil
}

func parseO2ULBackfillFlags(args []string) (o2ulBackfillOptions, error) {
	fs := flag.NewFlagSet("o2ul-slice1-backfill", flag.ContinueOnError)
	input := fs.String("input", "", "Path to legacy O2UL export JSON")
	dryRun := fs.Bool("dry-run", true, "Preview without writing changes")
	allowMissing := fs.Bool("allow-missing-users", false, "Allow profiles for users missing from users table")
	fs.SetOutput(os.Stdout)

	if err := fs.Parse(args); err != nil {
		return o2ulBackfillOptions{}, err
	}
	if strings.TrimSpace(*input) == "" {
		return o2ulBackfillOptions{}, errors.New("--input is required")
	}

	return o2ulBackfillOptions{
		InputFile:         strings.TrimSpace(*input),
		DryRun:            *dryRun,
		AllowMissingUsers: *allowMissing,
	}, nil
}

func loadLegacyExport(path string) (legacyO2ULExport, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return legacyO2ULExport{}, fmt.Errorf("read input file: %w", err)
	}
	var data legacyO2ULExport
	if err := json.Unmarshal(b, &data); err != nil {
		return legacyO2ULExport{}, fmt.Errorf("decode input json: %w", err)
	}
	return data, nil
}

func executeBackfill(
	ctx context.Context,
	userRepo *db.StrataUserRepository,
	profileRepo *db.StrataO2ULUserProfileRepository,
	prefRepo *db.StrataO2ULPreferencesRepository,
	legacy legacyO2ULExport,
	opts o2ulBackfillOptions,
) (backfillStats, error) {
	stats := backfillStats{}
	profiles := legacy.Profiles
	if len(profiles) == 0 {
		profiles = legacy.UserProfiles
	}

	stats.ProfileTotal = len(profiles)
	for _, lp := range profiles {
		playerID := strings.TrimSpace(firstNonEmpty(lp.PlayerID, lp.UserID))
		if playerID == "" {
			stats.ProfileSkipped++
			continue
		}

		_, err := userRepo.ByID(ctx, playerID)
		if err != nil && !opts.AllowMissingUsers {
			stats.ProfileSkipped++
			continue
		}

		profile := o2ul_users.Profile{
			PlayerID:         playerID,
			Username:         strings.TrimSpace(lp.Username),
			Name:             strings.TrimSpace(lp.Name),
			Email:            strings.TrimSpace(lp.Email),
			Phone:            strings.TrimSpace(lp.Phone),
			Bio:              strings.TrimSpace(lp.Bio),
			Image:            strings.TrimSpace(lp.Image),
			BGImageURL:       strings.TrimSpace(lp.BGImageURL),
			BGImageStorageID: strings.TrimSpace(lp.BGImageStorageID),
			BGImageOpacity:   lp.BGImageOpacity,
			CreatedAtUnix:    ptrInt64OrNow(lp.CreatedAt),
			UpdatedAtUnix:    ptrInt64OrNow(lp.UpdatedAt),
		}

		if lp.IsAnonymous != nil {
			profile.IsAnonymous = *lp.IsAnonymous
		}
		if lp.IsOnline != nil {
			profile.IsOnline = *lp.IsOnline
		}
		if lp.IsBetaTester != nil {
			profile.IsBetaTester = *lp.IsBetaTester
		}
		if lp.IsHookupEnabled != nil {
			profile.IsHookupEnabled = *lp.IsHookupEnabled
		}
		if lp.LastLoginDate != nil {
			profile.LastLoginDateUnix = *lp.LastLoginDate
		}
		if lp.LastSeen != nil {
			profile.LastSeenUnix = *lp.LastSeen
		}

		if opts.DryRun {
			stats.ProfileImported++
			continue
		}
		if _, err := profileRepo.Upsert(ctx, profile); err != nil {
			return stats, fmt.Errorf("upsert o2ul profile %s: %w", playerID, err)
		}
		stats.ProfileImported++
	}

	if legacy.Preferences != nil {
		stats.PreferenceHandled = true
		prefs := normalizeLegacyPreferences(*legacy.Preferences)
		if opts.DryRun {
			stats.PreferenceUpdated = true
			return stats, nil
		}
		if _, err := prefRepo.Upsert(ctx, prefs); err != nil {
			return stats, fmt.Errorf("upsert o2ul preferences: %w", err)
		}
		stats.PreferenceUpdated = true
	}

	return stats, nil
}

func normalizeLegacyPreferences(src legacyPreferences) o2ul_preferences.SystemPreferences {
	now := time.Now().UnixMilli()
	mode := strings.ToLower(strings.TrimSpace(src.Mode))
	if mode != o2ul_preferences.ModeLive && mode != o2ul_preferences.ModeBeta {
		mode = o2ul_preferences.ModeLive
	}
	enableCalling := false
	if src.EnableCalling != nil {
		enableCalling = *src.EnableCalling
	}
	lastUpdated := now
	if src.LastUpdated != nil {
		lastUpdated = *src.LastUpdated
	}
	updatedBy := strings.TrimSpace(src.UpdatedBy)
	if updatedBy == "" {
		updatedBy = "migration"
	}

	return o2ul_preferences.SystemPreferences{
		Mode:                  mode,
		EnableCalling:         enableCalling,
		EnabledOAuthProviders: []string{o2ul_preferences.BuiltInAuthProvider},
		LastUpdatedUnix:       lastUpdated,
		UpdatedBy:             updatedBy,
	}
}

func ptrInt64OrNow(v *int64) int64 {
	if v != nil {
		return *v
	}
	return time.Now().UnixMilli()
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
