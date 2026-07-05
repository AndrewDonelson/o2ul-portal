package application

import (
	"context"
	"fmt"
	"time"

	"com.nlaak.backend-template/internal/domain/o2ul_files"
)

type O2ULFilesService struct {
	repo O2ULFilesRepository
}

func NewO2ULFilesService(repo O2ULFilesRepository) *O2ULFilesService {
	return &O2ULFilesService{repo: repo}
}

func (s *O2ULFilesService) GenerateUploadURL(_ context.Context, userID string) o2ul_files.UploadURL {
	now := time.Now().UnixMilli()
	return o2ul_files.UploadURL{
		URL:       fmt.Sprintf("/api/v1/o2ul/files/upload/%s/%d", userID, now),
		ExpiresAt: now + int64((10 * time.Minute).Milliseconds()),
	}
}

func (s *O2ULFilesService) AddFile(ctx context.Context, userID string, file o2ul_files.File) (o2ul_files.File, error) {
	file.UserID = userID
	if file.CreatedAt == 0 {
		file.CreatedAt = time.Now().UnixMilli()
	}
	return s.repo.Create(ctx, file)
}

func (s *O2ULFilesService) GetStorageID(ctx context.Context, userID, id string) (string, error) {
	file, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return "", err
	}
	if file.UserID != userID {
		return "", ErrNotFound
	}
	return file.StorageID, nil
}

func (s *O2ULFilesService) GetFileURL(ctx context.Context, userID, id string) (string, error) {
	storageID, err := s.GetStorageID(ctx, userID, id)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("/api/v1/o2ul/files/storage/%s", storageID), nil
}

func (s *O2ULFilesService) GetFileByMD5(ctx context.Context, userID, md5Hash string) (o2ul_files.File, error) {
	return s.repo.GetByUserAndMD5(ctx, userID, md5Hash)
}

func (s *O2ULFilesService) RemoveFile(ctx context.Context, userID, id string) error {
	file, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if file.UserID != userID {
		return ErrNotFound
	}
	return s.repo.Delete(ctx, id)
}
