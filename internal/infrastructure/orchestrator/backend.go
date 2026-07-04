package orchestrator

import "context"

type Backend interface {
	Spawn(ctx context.Context, service, command string, args []string) (Instance, error)
	Despawn(ctx context.Context, id string) error
	List(ctx context.Context) ([]Instance, error)
}
