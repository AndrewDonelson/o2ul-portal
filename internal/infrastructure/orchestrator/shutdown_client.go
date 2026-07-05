package orchestrator

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"syscall"
	"strings"
)

func RequestManagedShutdown(ctx context.Context, url, token, reason string) error {
	trimmedURL := strings.TrimSpace(url)
	if trimmedURL == "" {
		return nil
	}
	if strings.TrimSpace(token) == "" {
		return fmt.Errorf("control token is not configured")
	}

	payload, _ := json.Marshal(map[string]any{"reason": reason})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, trimmedURL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Orchestrator-Token", token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		if errors.Is(err, syscall.ECONNREFUSED) {
			return nil
		}
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return fmt.Errorf("shutdown endpoint returned status %d", resp.StatusCode)
	}
	return nil
}
