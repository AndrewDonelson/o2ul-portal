package orchestrator

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type LocalExecAdapter struct {
	mu        sync.RWMutex
	instances map[string]*exec.Cmd
	meta      map[string]Instance
}

func NewLocalExecAdapter() *LocalExecAdapter {
	return &LocalExecAdapter{
		instances: make(map[string]*exec.Cmd),
		meta:      make(map[string]Instance),
	}
}

func (a *LocalExecAdapter) Spawn(_ context.Context, service, command string, args []string) (Instance, error) {
	if command == "" {
		return Instance{}, errors.New("command is required")
	}
	cmd := exec.Command(command, args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return Instance{}, err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return Instance{}, err
	}
	if err := cmd.Start(); err != nil {
		return Instance{}, err
	}
	id := uuid.NewString()
	instance := Instance{
		ID:        id,
		Service:   service,
		Command:   command,
		Args:      args,
		PID:       cmd.Process.Pid,
		SpawnedAt: time.Now().UTC(),
	}
	a.mu.Lock()
	a.instances[id] = cmd
	a.meta[id] = instance
	a.mu.Unlock()

	go streamLogs(service, instance.PID, "stdout", stdout)
	go streamLogs(service, instance.PID, "stderr", stderr)

	go func() {
		_ = cmd.Wait()
		a.mu.Lock()
		delete(a.instances, id)
		delete(a.meta, id)
		a.mu.Unlock()
	}()

	return instance, nil
}

func streamLogs(service string, pid int, stream string, r io.ReadCloser) {
	defer r.Close()
	tag := strings.ToUpper(strings.TrimSpace(service))
	if tag == "" {
		tag = "MANAGED"
	}
	defaultToken := "[" + tag + "]"
	tagPrefix := "[" + tag
	scanner := bufio.NewScanner(r)
	buffer := make([]byte, 0, 64*1024)
	scanner.Buffer(buffer, 1024*1024)
	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}
		_, _ = fmt.Fprintf(os.Stdout, "%s %s\n", time.Now().Format("2006/01/02 15:04:05"), normalizeManagedLine(line, defaultToken, tagPrefix))
	}
	if err := scanner.Err(); err != nil {
		if strings.Contains(err.Error(), "file already closed") {
			return
		}
		log.Printf("managed stream closed with error: service=%s pid=%d stream=%s err=%v", tag, pid, stream, err)
	}
}

func normalizeManagedLine(line string, defaultToken string, tagPrefix string) string {
	trimmed := strings.TrimSpace(line)
	parts := strings.SplitN(trimmed, " ", 3)
	if len(parts) == 3 && isDate(parts[0]) && isTime(parts[1]) {
		trimmed = strings.TrimSpace(parts[2])
	}
	if strings.Contains(trimmed, tagPrefix) {
		return trimmed
	}
	return defaultToken + " " + trimmed
}

func isDate(s string) bool {
	if len(s) != 10 {
		return false
	}
	for i := 0; i < len(s); i++ {
		switch i {
		case 4, 7:
			if s[i] != '/' {
				return false
			}
		default:
			if s[i] < '0' || s[i] > '9' {
				return false
			}
		}
	}
	return true
}

func isTime(s string) bool {
	if len(s) != 8 {
		return false
	}
	for i := 0; i < len(s); i++ {
		switch i {
		case 2, 5:
			if s[i] != ':' {
				return false
			}
		default:
			if s[i] < '0' || s[i] > '9' {
				return false
			}
		}
	}
	return true
}

func (a *LocalExecAdapter) Despawn(_ context.Context, id string) error {
	a.mu.RLock()
	cmd := a.instances[id]
	a.mu.RUnlock()
	if cmd == nil || cmd.Process == nil {
		return errors.New("instance not found")
	}
	if err := cmd.Process.Kill(); err != nil {
		return err
	}
	a.mu.Lock()
	delete(a.instances, id)
	delete(a.meta, id)
	a.mu.Unlock()
	return nil
}

func (a *LocalExecAdapter) List(_ context.Context) ([]Instance, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	out := make([]Instance, 0, len(a.meta))
	for _, inst := range a.meta {
		out = append(out, inst)
	}
	return out, nil
}
