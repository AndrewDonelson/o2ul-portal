package imageopt

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"os"
	"path/filepath"
	"testing"
	"time"

	"com.nlaak.backend-template/internal/application"
)

func TestOptimizer_ChangedModeUsesManifest(t *testing.T) {
	root := t.TempDir()
	imgPath := filepath.Join(root, "images", "app", "logo.png")
	if err := os.MkdirAll(filepath.Dir(imgPath), 0o755); err != nil {
		t.Fatalf("mkdir failed: %v", err)
	}
	if err := os.WriteFile(imgPath, buildNoCompressionPNG(t), 0o644); err != nil {
		t.Fatalf("write png failed: %v", err)
	}

	opt := NewOptimizer()
	manifestPath := filepath.Join(root, ".imageopt-manifest.json")

	first, err := opt.Optimize(context.Background(), application.ImageOptimizationRequest{
		RootDir:      root,
		Mode:         ModeChanged,
		ManifestPath: manifestPath,
	})
	if err != nil {
		t.Fatalf("first optimize failed: %v", err)
	}
	if first.Scanned != 1 {
		t.Fatalf("first scanned=%d want=1", first.Scanned)
	}
	if first.Optimized != 1 {
		t.Fatalf("first optimized=%d want=1", first.Optimized)
	}
	if first.BytesAfter >= first.BytesBefore {
		t.Fatalf("first bytes not reduced: before=%d after=%d", first.BytesBefore, first.BytesAfter)
	}

	second, err := opt.Optimize(context.Background(), application.ImageOptimizationRequest{
		RootDir:      root,
		Mode:         ModeChanged,
		ManifestPath: manifestPath,
	})
	if err != nil {
		t.Fatalf("second optimize failed: %v", err)
	}
	if second.Scanned != 1 {
		t.Fatalf("second scanned=%d want=1", second.Scanned)
	}
	if second.Optimized != 0 {
		t.Fatalf("second optimized=%d want=0", second.Optimized)
	}
	if second.Skipped != 1 {
		t.Fatalf("second skipped=%d want=1", second.Skipped)
	}
}

func TestOptimizer_OffModeNoOps(t *testing.T) {
	root := t.TempDir()
	opt := NewOptimizer()
	res, err := opt.Optimize(context.Background(), application.ImageOptimizationRequest{
		RootDir: root,
		Mode:    ModeOff,
	})
	if err != nil {
		t.Fatalf("off mode failed: %v", err)
	}
	if res.Scanned != 0 || res.Optimized != 0 || res.Skipped != 0 || res.Failed != 0 {
		t.Fatalf("unexpected off mode result: %+v", res)
	}
}

func TestOptimizer_ChangedModeSkipsWhenOnlyMTimeChanges(t *testing.T) {
	root := t.TempDir()
	imgPath := filepath.Join(root, "images", "app", "logo.png")
	if err := os.MkdirAll(filepath.Dir(imgPath), 0o755); err != nil {
		t.Fatalf("mkdir failed: %v", err)
	}
	if err := os.WriteFile(imgPath, buildNoCompressionPNG(t), 0o644); err != nil {
		t.Fatalf("write png failed: %v", err)
	}

	opt := NewOptimizer()
	manifestPath := filepath.Join(root, ".imageopt-manifest.json")

	first, err := opt.Optimize(context.Background(), application.ImageOptimizationRequest{
		RootDir:      root,
		Mode:         ModeChanged,
		ManifestPath: manifestPath,
	})
	if err != nil {
		t.Fatalf("first optimize failed: %v", err)
	}
	if first.Optimized != 1 {
		t.Fatalf("first optimized=%d want=1", first.Optimized)
	}

	stat, err := os.Stat(imgPath)
	if err != nil {
		t.Fatalf("stat failed: %v", err)
	}
	newMtime := stat.ModTime().Add(3 * time.Second)
	if err := os.Chtimes(imgPath, newMtime, newMtime); err != nil {
		t.Fatalf("chtimes failed: %v", err)
	}

	second, err := opt.Optimize(context.Background(), application.ImageOptimizationRequest{
		RootDir:      root,
		Mode:         ModeChanged,
		ManifestPath: manifestPath,
	})
	if err != nil {
		t.Fatalf("second optimize failed: %v", err)
	}
	if second.Optimized != 0 {
		t.Fatalf("second optimized=%d want=0", second.Optimized)
	}
	if second.Skipped != 1 {
		t.Fatalf("second skipped=%d want=1", second.Skipped)
	}
}

func buildNoCompressionPNG(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 240, 240))
	for y := 0; y < 240; y++ {
		for x := 0; x < 240; x++ {
			img.Set(x, y, color.RGBA{R: 20, G: 30, B: 200, A: 255})
		}
	}
	var buf bytes.Buffer
	enc := png.Encoder{CompressionLevel: png.NoCompression}
	if err := enc.Encode(&buf, img); err != nil {
		t.Fatalf("png encode failed: %v", err)
	}
	return buf.Bytes()
}
