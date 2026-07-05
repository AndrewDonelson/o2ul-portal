package db

import (
	"context"

	"com.nlaak.backend-template/internal/application"
	"github.com/AndrewDonelson/strata"
)

type StrataAdminStatusService struct {
	ds *strata.DataStore
}

func NewStrataAdminStatusService(ds *strata.DataStore) *StrataAdminStatusService {
	return &StrataAdminStatusService{ds: ds}
}

func (s *StrataAdminStatusService) Status(ctx context.Context) (application.StrataStatus, error) {
	stats := s.ds.Stats()
	migrationRecords, err := s.ds.MigrationStatus(ctx)
	if err != nil {
		return application.StrataStatus{}, err
	}
	out := make([]application.StrataMigrationRecord, 0, len(migrationRecords))
	for _, rec := range migrationRecords {
		out = append(out, application.StrataMigrationRecord{
			ID:        rec.ID,
			Schema:    rec.Schema,
			FileName:  rec.FileName,
			AppliedAt: rec.AppliedAt,
		})
	}
	return application.StrataStatus{
		Gets:           stats.Gets,
		Sets:           stats.Sets,
		Deletes:        stats.Deletes,
		Errors:         stats.Errors,
		DirtyCount:     stats.DirtyCount,
		L1Entries:      stats.L1Entries,
		MigrationCount: len(out),
		Migrations:     out,
	}, nil
}
