package imageopt

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"image/png"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	"com.nlaak.backend-template/internal/application"
)

const (
	ModeOff     = "off"
	ModeChanged = "changed"
	ModeAll     = "all"
)

type Optimizer struct{}

func NewOptimizer() *Optimizer {
	return &Optimizer{}
}

type manifestFile struct {
	Version int                      `json:"version"`
	Entries map[string]manifestEntry `json:"entries"`
}

type manifestEntry struct {
	Size    int64  `json:"size"`
	ModUnix int64  `json:"mod_unix"`
	SHA256  string `json:"sha256"`
}

func sameContentFingerprint(a, b manifestEntry) bool {
	return a.Size == b.Size && a.SHA256 == b.SHA256
}

var supportedExt = map[string]struct{}{
	".png":  {},
	".jpg":  {},
	".jpeg": {},
	".gif":  {},
}

func normalizeMode(mode string) string {
	switch strings.ToLower(strings.TrimSpace(mode)) {
	case ModeAll:
		return ModeAll
	case ModeOff:
		return ModeOff
	default:
		return ModeChanged
	}
}

func (o *Optimizer) Optimize(ctx context.Context, req application.ImageOptimizationRequest) (application.ImageOptimizationResult, error) {
	res := application.ImageOptimizationResult{}
	res.ConfiguredMode = strings.TrimSpace(req.Mode)
	mode := normalizeMode(req.Mode)
	res.EffectiveMode = mode
	if mode == ModeOff {
		return res, nil
	}

	root := filepath.Clean(strings.TrimSpace(req.RootDir))
	if root == "" {
		return res, errors.New("image optimization root dir is required")
	}
	if _, err := os.Stat(root); err != nil {
		return res, fmt.Errorf("image optimization root unavailable: %w", err)
	}

	manifestPath := strings.TrimSpace(req.ManifestPath)
	if manifestPath == "" {
		manifestPath = filepath.Join(root, ".imageopt-manifest.json")
	} else if !filepath.IsAbs(manifestPath) {
		manifestPath = filepath.Join(root, manifestPath)
	}
	res.ManifestPath = manifestPath

	manifest := manifestFile{Version: 1, Entries: map[string]manifestEntry{}}
	if mode == ModeChanged {
		loaded, err := loadManifest(manifestPath)
		if err != nil {
			return res, err
		}
		manifest = loaded
	}
	if manifest.Entries == nil {
		manifest.Entries = map[string]manifestEntry{}
	}

	newEntries := make(map[string]manifestEntry, len(manifest.Entries))

	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if d.IsDir() {
			if strings.HasPrefix(d.Name(), ".") && path != root {
				return filepath.SkipDir
			}
			return nil
		}
		ext := strings.ToLower(filepath.Ext(d.Name()))
		if _, ok := supportedExt[ext]; !ok {
			return nil
		}

		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		rel = filepath.ToSlash(rel)
		fileResult := application.ImageOptimizationFileResult{Path: rel}

		info, err := d.Info()
		if err != nil {
			res.Failed++
			fileResult.Status = "failed"
			fileResult.Error = "file info unavailable"
			res.Files = append(res.Files, fileResult)
			return nil
		}
		res.Scanned++

		originalBytes, err := os.ReadFile(path)
		if err != nil {
			res.Failed++
			fileResult.Status = "failed"
			fileResult.Error = "file read failed"
			res.Files = append(res.Files, fileResult)
			return nil
		}
		res.BytesBefore += int64(len(originalBytes))
		fileResult.BytesBefore = int64(len(originalBytes))

		sum := sha256.Sum256(originalBytes)
		fingerprint := manifestEntry{
			Size:   int64(len(originalBytes)),
			SHA256: hex.EncodeToString(sum[:]),
		}

		if mode == ModeChanged {
			if prev, ok := manifest.Entries[rel]; ok && sameContentFingerprint(prev, fingerprint) {
				res.Skipped++
				res.BytesAfter += int64(len(originalBytes))
				fileResult.Status = "skipped"
				fileResult.BytesAfter = int64(len(originalBytes))
				res.Files = append(res.Files, fileResult)
				newEntries[rel] = fingerprint
				return nil
			}
		}

		optimizedBytes, optErr := optimizeBytes(ext, originalBytes)
		if optErr != nil {
			res.Failed++
			res.BytesAfter += int64(len(originalBytes))
			fileResult.Status = "failed"
			fileResult.BytesAfter = int64(len(originalBytes))
			fileResult.Error = optErr.Error()
			res.Files = append(res.Files, fileResult)
			newEntries[rel] = fingerprint
			return nil
		}
		if len(optimizedBytes) < len(originalBytes) {
			if err := writeFileAtomic(path, optimizedBytes, info.Mode()); err != nil {
				res.Failed++
				res.BytesAfter += int64(len(originalBytes))
				fileResult.Status = "failed"
				fileResult.BytesAfter = int64(len(originalBytes))
				fileResult.Error = err.Error()
				res.Files = append(res.Files, fileResult)
				newEntries[rel] = fingerprint
				return nil
			}
			res.Optimized++
			res.BytesAfter += int64(len(optimizedBytes))
			fileResult.Status = "optimized"
			fileResult.BytesAfter = int64(len(optimizedBytes))
			res.Files = append(res.Files, fileResult)
			optimizedSum := sha256.Sum256(optimizedBytes)
			newEntries[rel] = manifestEntry{
				Size:   int64(len(optimizedBytes)),
				SHA256: hex.EncodeToString(optimizedSum[:]),
			}
			return nil
		}

		res.Skipped++
		res.BytesAfter += int64(len(originalBytes))
		fileResult.Status = "skipped"
		fileResult.BytesAfter = int64(len(originalBytes))
		res.Files = append(res.Files, fileResult)
		newEntries[rel] = fingerprint
		return nil
	})
	if err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return res, err
		}
		return res, fmt.Errorf("image optimization walk failed: %w", err)
	}

	if mode == ModeChanged {
		manifest.Entries = newEntries
		if err := saveManifest(manifestPath, manifest); err != nil {
			return res, err
		}
	}

	return res, nil
}

func optimizeBytes(ext string, src []byte) ([]byte, error) {
	reader := bytes.NewReader(src)
	img, _, err := image.Decode(reader)
	if err != nil {
		return nil, err
	}

	var buf bytes.Buffer
	switch ext {
	case ".png":
		enc := png.Encoder{CompressionLevel: png.BestCompression}
		if err := enc.Encode(&buf, img); err != nil {
			return nil, err
		}
	case ".jpg", ".jpeg":
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85}); err != nil {
			return nil, err
		}
	case ".gif":
		if err := gif.Encode(&buf, img, &gif.Options{NumColors: 256}); err != nil {
			return nil, err
		}
	default:
		return nil, fmt.Errorf("unsupported image extension: %s", ext)
	}

	return buf.Bytes(), nil
}

func writeFileAtomic(path string, data []byte, mode fs.FileMode) error {
	tmp := path + ".imageopt.tmp"
	if err := os.WriteFile(tmp, data, mode); err != nil {
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}

func loadManifest(path string) (manifestFile, error) {
	mf := manifestFile{Version: 1, Entries: map[string]manifestEntry{}}
	content, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return mf, nil
		}
		return mf, fmt.Errorf("image optimization manifest read failed: %w", err)
	}
	if len(strings.TrimSpace(string(content))) == 0 {
		return mf, nil
	}
	if err := json.Unmarshal(content, &mf); err != nil {
		return mf, fmt.Errorf("image optimization manifest parse failed: %w", err)
	}
	if mf.Entries == nil {
		mf.Entries = map[string]manifestEntry{}
	}
	return mf, nil
}

func saveManifest(path string, mf manifestFile) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("image optimization manifest directory failed: %w", err)
	}
	content, err := json.MarshalIndent(mf, "", "  ")
	if err != nil {
		return fmt.Errorf("image optimization manifest encode failed: %w", err)
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, content, 0o644); err != nil {
		return fmt.Errorf("image optimization manifest write failed: %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return fmt.Errorf("image optimization manifest finalize failed: %w", err)
	}
	return nil
}
