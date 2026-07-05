package db

import (
	"context"
	"errors"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain/o2ul_files"
	"github.com/AndrewDonelson/strata"
)

const o2ulFilesSchemaName = "o2ul_files"

type o2ulFileRecord struct {
	FileKey     string `strata:"primary_key"`
	UserID      string `strata:"index"`
	Name        string
	ContentType string
	StorageID   string `strata:"index"`
	Size        int64
	MD5Hash     string `strata:"index"`
	CreatedAt   int64
	CreatedTime time.Time `strata:"auto_now_add"`
	UpdatedTime time.Time `strata:"auto_now"`
}

func registerO2ULFileSchemas(ds *strata.DataStore) error {
	if err := ds.Register(strata.Schema{
		Name:      o2ulFilesSchemaName,
		Model:     &o2ulFileRecord{},
		WriteMode: strata.WriteThrough,
		L1:        strata.MemPolicy{TTL: 30 * time.Second, MaxEntries: 20_000},
		L2:        strata.RedisPolicy{TTL: 10 * time.Minute},
		L3:        strata.PostgresPolicy{TableName: o2ulFilesSchemaName},
	}); err != nil {
		return err
	}
	return registerO2ULPresenceSchemas(ds)
}

type StrataO2ULFilesRepository struct {
	ds *strata.DataStore
}

func NewStrataO2ULFilesRepository(ds *strata.DataStore) *StrataO2ULFilesRepository {
	return &StrataO2ULFilesRepository{ds: ds}
}

func (r *StrataO2ULFilesRepository) Create(ctx context.Context, file o2ul_files.File) (o2ul_files.File, error) {
	record := o2ulFileRecord{
		FileKey:     file.ID,
		UserID:      file.UserID,
		Name:        file.Name,
		ContentType: file.ContentType,
		StorageID:   file.StorageID,
		Size:        file.Size,
		MD5Hash:     file.MD5Hash,
		CreatedAt:   file.CreatedAt,
	}
	if err := r.ds.Set(ctx, o2ulFilesSchemaName, file.ID, &record); err != nil {
		return o2ul_files.File{}, err
	}
	return file, nil
}

func (r *StrataO2ULFilesRepository) GetByID(ctx context.Context, id string) (o2ul_files.File, error) {
	record, err := strata.GetTyped[o2ulFileRecord](ctx, r.ds, o2ulFilesSchemaName, id)
	if err != nil {
		if errors.Is(err, strata.ErrNotFound) {
			return o2ul_files.File{}, application.ErrNotFound
		}
		return o2ul_files.File{}, err
	}
	return toO2ULFile(*record), nil
}

func (r *StrataO2ULFilesRepository) GetByUserAndMD5(ctx context.Context, userID, md5Hash string) (o2ul_files.File, error) {
	q := strata.Q().Where("user_id = $1 AND md5_hash = $2", userID, md5Hash).Limit(1).Build()
	records, err := strata.SearchTyped[o2ulFileRecord](ctx, r.ds, o2ulFilesSchemaName, &q)
	if err != nil {
		return o2ul_files.File{}, err
	}
	if len(records) == 0 {
		return o2ul_files.File{}, application.ErrNotFound
	}
	return toO2ULFile(records[0]), nil
}

func (r *StrataO2ULFilesRepository) Delete(ctx context.Context, id string) error {
	return r.ds.Delete(ctx, o2ulFilesSchemaName, id)
}

func toO2ULFile(record o2ulFileRecord) o2ul_files.File {
	return o2ul_files.File{
		ID:          record.FileKey,
		UserID:      record.UserID,
		Name:        record.Name,
		ContentType: record.ContentType,
		StorageID:   record.StorageID,
		Size:        record.Size,
		MD5Hash:     record.MD5Hash,
		CreatedAt:   record.CreatedAt,
	}
}
