package orchestrator

import (
	"context"
	"errors"
	"testing"
)

type backendStub struct {
	spawnFn   func(ctx context.Context, service, command string, args []string) (Instance, error)
	despawnFn func(ctx context.Context, id string) error
	listFn    func(ctx context.Context) ([]Instance, error)
}

func (b backendStub) Spawn(ctx context.Context, service, command string, args []string) (Instance, error) {
	return b.spawnFn(ctx, service, command, args)
}

func (b backendStub) Despawn(ctx context.Context, id string) error {
	return b.despawnFn(ctx, id)
}

func (b backendStub) List(ctx context.Context) ([]Instance, error) {
	return b.listFn(ctx)
}

func TestManagerNilBackend(t *testing.T) {
	m := NewManager(nil)
	if _, err := m.Spawn(context.Background(), "svc", "echo", []string{"ok"}); err == nil {
		t.Fatalf("expected spawn error for nil backend")
	}
	if err := m.Despawn(context.Background(), "x"); err == nil {
		t.Fatalf("expected despawn error for nil backend")
	}
	if got := m.List(); got != nil {
		t.Fatalf("expected nil list with nil backend")
	}
}

func TestManagerPropagatesBackendErrors(t *testing.T) {
	m := NewManager(backendStub{
		spawnFn: func(context.Context, string, string, []string) (Instance, error) {
			return Instance{}, errors.New("spawn failed")
		},
		despawnFn: func(context.Context, string) error { return errors.New("despawn failed") },
		listFn:    func(context.Context) ([]Instance, error) { return nil, errors.New("list failed") },
	})

	if _, err := m.Spawn(context.Background(), "svc", "cmd", nil); err == nil {
		t.Fatalf("expected spawn error")
	}
	if err := m.Despawn(context.Background(), "id"); err == nil {
		t.Fatalf("expected despawn error")
	}
	if out := m.List(); out != nil {
		t.Fatalf("expected nil list on backend list error")
	}
}

func TestLocalExecAdapterLifecycleEdgeCases(t *testing.T) {
	a := NewLocalExecAdapter()
	if _, err := a.Spawn(context.Background(), "svc", "", nil); err == nil {
		t.Fatalf("expected command required error")
	}

	inst, err := a.Spawn(context.Background(), "svc", "sleep", []string{"30"})
	if err != nil {
		t.Fatalf("spawn failed: %v", err)
	}
	list, err := a.List(context.Background())
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 running instance, got %d", len(list))
	}
	if err := a.Despawn(context.Background(), inst.ID); err != nil {
		t.Fatalf("despawn failed: %v", err)
	}
	if err := a.Despawn(context.Background(), "missing"); err == nil {
		t.Fatalf("expected not found for missing instance")
	}
}
