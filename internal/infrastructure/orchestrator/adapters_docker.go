package orchestrator

import (
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type DockerAdapter struct {
	mu   sync.RWMutex
	meta map[string]Instance
}

func NewDockerAdapter() *DockerAdapter {
	return &DockerAdapter{meta: make(map[string]Instance)}
}

func (a *DockerAdapter) Spawn(ctx context.Context, service, command string, args []string) (Instance, error) {
	image := command
	if image == "" {
		return Instance{}, errors.New("command must be a docker image for docker backend")
	}
	containerName := service
	if containerName == "" {
		containerName = "svc-" + uuid.NewString()[:8]
	}
	runArgs := []string{"run", "-d", "--name", containerName, image}
	runArgs = append(runArgs, args...)
	output, err := exec.CommandContext(ctx, "docker", runArgs...).CombinedOutput()
	if err != nil {
		return Instance{}, fmt.Errorf("docker run failed: %w (%s)", err, strings.TrimSpace(string(output)))
	}
	id := uuid.NewString()
	inst := Instance{
		ID:        id,
		Service:   containerName,
		Command:   "docker run",
		Args:      runArgs,
		PID:       0,
		SpawnedAt: time.Now().UTC(),
	}
	a.mu.Lock()
	a.meta[id] = inst
	a.mu.Unlock()
	return inst, nil
}

func (a *DockerAdapter) Despawn(ctx context.Context, id string) error {
	a.mu.RLock()
	inst, ok := a.meta[id]
	a.mu.RUnlock()
	if !ok {
		return errors.New("instance not found")
	}
	output, err := exec.CommandContext(ctx, "docker", "rm", "-f", inst.Service).CombinedOutput()
	if err != nil {
		return fmt.Errorf("docker rm failed: %w (%s)", err, strings.TrimSpace(string(output)))
	}
	a.mu.Lock()
	delete(a.meta, id)
	a.mu.Unlock()
	return nil
}

func (a *DockerAdapter) List(_ context.Context) ([]Instance, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	out := make([]Instance, 0, len(a.meta))
	for _, v := range a.meta {
		out = append(out, v)
	}
	return out, nil
}
