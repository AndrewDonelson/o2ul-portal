package application

import (
	"context"

	"com.nlaak.backend-template/internal/domain/o2ul_files"
)

type O2ULFilesRepository interface {
	Create(ctx context.Context, file o2ul_files.File) (o2ul_files.File, error)
	GetByID(ctx context.Context, id string) (o2ul_files.File, error)
	GetByUserAndMD5(ctx context.Context, userID, md5Hash string) (o2ul_files.File, error)
	Delete(ctx context.Context, id string) error
}
