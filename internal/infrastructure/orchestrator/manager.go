package orchestrator

import (
	"context"
	"errors"
	"time"
)

type Instance struct {
	ID        string    `json:"id"`
	Service   string    `json:"service"`
	Command   string    `json:"command"`
	Args      []string  `json:"args"`
	PID       int       `json:"pid"`
	SpawnedAt time.Time `json:"spawnedAt"`
}

type Manager struct {
	backend Backend
}

func NewManager(backend Backend) *Manager {
	return &Manager{backend: backend}
}

func (m *Manager) Spawn(ctx context.Context, service, command string, args []string) (Instance, error) {
	if m.backend == nil {
		return Instance{}, errors.New("orchestrator backend is not configured")
	}
	return m.backend.Spawn(ctx, service, command, args)
}

func (m *Manager) Despawn(ctx context.Context, id string) error {
	if m.backend == nil {
		return errors.New("orchestrator backend is not configured")
	}
	return m.backend.Despawn(ctx, id)
}

func (m *Manager) List() []Instance {
	return m.ListWithContext(context.Background())
}

func (m *Manager) ListWithContext(ctx context.Context) []Instance {
	if m.backend == nil {
		return nil
	}
	out, err := m.backend.List(ctx)
	if err != nil {
		return nil
	}
	return out
}
