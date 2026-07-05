package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const (
	maxJSONBodyBytes    int64 = 1 << 20
	maxWebhookBodyBytes int64 = 2 << 20
)

func decodeJSON(w http.ResponseWriter, r *http.Request, out any) error {
	return decodeJSONWithLimit(w, r, out, maxJSONBodyBytes)
}

func decodeJSONWithLimit(w http.ResponseWriter, r *http.Request, out any, maxBytes int64) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(out); err != nil {
		var syntaxErr *json.SyntaxError
		var typeErr *json.UnmarshalTypeError
		switch {
		case errors.Is(err, io.EOF):
			return fmt.Errorf("empty body")
		case errors.As(err, &syntaxErr):
			return fmt.Errorf("malformed json")
		case errors.As(err, &typeErr):
			return fmt.Errorf("invalid field type")
		case strings.Contains(err.Error(), "http: request body too large"):
			return fmt.Errorf("body too large")
		default:
			return err
		}
	}

	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		if err == nil {
			return fmt.Errorf("multiple json values")
		}
		return fmt.Errorf("invalid trailing data")
	}
	return nil
}

func readLimitedBody(w http.ResponseWriter, r *http.Request, maxBytes int64) ([]byte, error) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
	defer r.Body.Close()
	body, err := io.ReadAll(r.Body)
	if err != nil {
		if strings.Contains(err.Error(), "http: request body too large") {
			return nil, fmt.Errorf("body too large")
		}
		return nil, err
	}
	return body, nil
}
