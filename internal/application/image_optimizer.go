package application

import "context"

// ImageOptimizationRequest describes a startup optimization pass for static images.
type ImageOptimizationRequest struct {
	RootDir      string
	Mode         string
	ManifestPath string
}

// ImageOptimizationResult summarizes the optimizer pass.
type ImageOptimizationResult struct {
	ConfiguredMode string
	EffectiveMode  string
	ManifestPath   string
	Scanned        int
	Optimized      int
	Skipped        int
	Failed         int
	BytesBefore    int64
	BytesAfter     int64
	Files          []ImageOptimizationFileResult
}

// ImageOptimizationFileResult describes the outcome for one processed image.
type ImageOptimizationFileResult struct {
	Path        string
	Status      string
	BytesBefore int64
	BytesAfter  int64
	Error       string
}

// ImageOptimizer optimizes images in a static asset tree.
type ImageOptimizer interface {
	Optimize(ctx context.Context, req ImageOptimizationRequest) (ImageOptimizationResult, error)
}
