package orchestrator

import (
	"context"
	"errors"
	"fmt"
	"os/exec"
	"sync"
	"time"

	"github.com/google/uuid"
)

type SystemdAdapter struct {
	mu   sync.RWMutex
	meta map[string]Instance
}

func NewSystemdAdapter() *SystemdAdapter {
	return &SystemdAdapter{meta: make(map[string]Instance)}
}

func (a *SystemdAdapter) Spawn(ctx context.Context, service, command string, _ []string) (Instance, error) {
	unit := service
	if unit == "" {
		unit = command
	}
	if unit == "" {
		return Instance{}, errors.New("service or command is required for systemd backend")
	}
	if err := exec.CommandContext(ctx, "systemctl", "start", unit).Run(); err != nil {
		return Instance{}, fmt.Errorf("systemctl start failed: %w", err)
	}
	id := uuid.NewString()
	inst := Instance{
		ID:        id,
		Service:   unit,
		Command:   "systemctl start",
		Args:      []string{unit},
		PID:       0,
		SpawnedAt: time.Now().UTC(),
	}
	a.mu.Lock()
	a.meta[id] = inst
	a.mu.Unlock()
	return inst, nil
}

func (a *SystemdAdapter) Despawn(ctx context.Context, id string) error {
	a.mu.RLock()
	inst, ok := a.meta[id]
	a.mu.RUnlock()
	if !ok {
		return errors.New("instance not found")
	}
	if err := exec.CommandContext(ctx, "systemctl", "stop", inst.Service).Run(); err != nil {
		return fmt.Errorf("systemctl stop failed: %w", err)
	}
	a.mu.Lock()
	delete(a.meta, id)
	a.mu.Unlock()
	return nil
}

func (a *SystemdAdapter) List(_ context.Context) ([]Instance, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	out := make([]Instance, 0, len(a.meta))
	for _, v := range a.meta {
		out = append(out, v)
	}
	return out, nil
}
