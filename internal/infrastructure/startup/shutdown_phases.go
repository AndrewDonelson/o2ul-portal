package startup

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"
)

type ShutdownPhase struct {
	Name    string
	Timeout time.Duration
	Run     func(ctx context.Context) error
}

func RunShutdownPhases(ctx context.Context, component, reason string, phases []ShutdownPhase) error {
	startedAt := time.Now()
	log.Printf("shutdown begin: component=%s reason=%s phases=%d", component, reason, len(phases))

	var errs []error
	okCount := 0
	failCount := 0

	for _, phase := range phases {
		phaseName := phase.Name
		if phaseName == "" {
			phaseName = "unnamed"
		}

		phaseCtx := ctx
		cancel := func() {}
		if phase.Timeout > 0 {
			phaseCtx, cancel = context.WithTimeout(ctx, phase.Timeout)
		}

		phaseStart := time.Now()
		err := phase.Run(phaseCtx)
		duration := time.Since(phaseStart)
		cancel()

		if err != nil {
			failCount++
			errs = append(errs, fmt.Errorf("%s: %w", phaseName, err))
			log.Printf("shutdown phase: component=%s phase=%s status=failed duration_ms=%d error=%v", component, phaseName, duration.Milliseconds(), err)
			continue
		}

		okCount++
		log.Printf("shutdown phase: component=%s phase=%s status=ok duration_ms=%d", component, phaseName, duration.Milliseconds())
	}

	totalDuration := time.Since(startedAt)
	log.Printf("shutdown complete: component=%s reason=%s ok=%d failed=%d duration_ms=%d", component, reason, okCount, failCount, totalDuration.Milliseconds())

	if len(errs) > 0 {
		return errors.Join(errs...)
	}
	return nil
}
