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

type KubernetesAdapter struct {
	namespace string
	mu        sync.RWMutex
	meta      map[string]Instance
}

func NewKubernetesAdapter(namespace string) *KubernetesAdapter {
	if strings.TrimSpace(namespace) == "" {
		namespace = "default"
	}
	return &KubernetesAdapter{namespace: namespace, meta: make(map[string]Instance)}
}

func (a *KubernetesAdapter) Spawn(ctx context.Context, service, command string, args []string) (Instance, error) {
	image := command
	if image == "" {
		return Instance{}, errors.New("command must be a container image for kubernetes backend")
	}
	name := service
	if name == "" {
		name = "svc-" + uuid.NewString()[:8]
	}
	kubectlArgs := []string{"-n", a.namespace, "run", name, "--image", image, "--restart", "Never"}
	if len(args) > 0 {
		kubectlArgs = append(kubectlArgs, "--command", "--")
		kubectlArgs = append(kubectlArgs, args...)
	}
	out, err := exec.CommandContext(ctx, "kubectl", kubectlArgs...).CombinedOutput()
	if err != nil {
		return Instance{}, fmt.Errorf("kubectl run failed: %w (%s)", err, strings.TrimSpace(string(out)))
	}
	id := uuid.NewString()
	inst := Instance{
		ID:        id,
		Service:   name,
		Command:   "kubectl run",
		Args:      kubectlArgs,
		PID:       0,
		SpawnedAt: time.Now().UTC(),
	}
	a.mu.Lock()
	a.meta[id] = inst
	a.mu.Unlock()
	return inst, nil
}

func (a *KubernetesAdapter) Despawn(ctx context.Context, id string) error {
	a.mu.RLock()
	inst, ok := a.meta[id]
	a.mu.RUnlock()
	if !ok {
		return errors.New("instance not found")
	}
	out, err := exec.CommandContext(ctx, "kubectl", "-n", a.namespace, "delete", "pod", inst.Service, "--ignore-not-found=true").CombinedOutput()
	if err != nil {
		return fmt.Errorf("kubectl delete failed: %w (%s)", err, strings.TrimSpace(string(out)))
	}
	a.mu.Lock()
	delete(a.meta, id)
	a.mu.Unlock()
	return nil
}

func (a *KubernetesAdapter) List(_ context.Context) ([]Instance, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	out := make([]Instance, 0, len(a.meta))
	for _, v := range a.meta {
		out = append(out, v)
	}
	return out, nil
}
