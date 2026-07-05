package orchestrator

import (
	"fmt"
	"strings"
)

func BackendFromName(name string) (Backend, error) {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case "", "systemd":
		return NewSystemdAdapter(), nil
	case "local", "exec":
		return NewLocalExecAdapter(), nil
	case "docker":
		return NewDockerAdapter(), nil
	case "k8s", "kubernetes":
		return NewKubernetesAdapter("default"), nil
	default:
		return nil, fmt.Errorf("unsupported orchestrator backend: %s", name)
	}
}
