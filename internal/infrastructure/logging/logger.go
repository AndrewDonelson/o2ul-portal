package logging

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

type Logger struct {
	serviceName string
	sinkURL     string
	client      *http.Client
	sinkQueue   chan []byte
}

type logEnvelope struct {
	Level     string         `json:"level"`
	Message   string         `json:"message"`
	Service   string         `json:"service"`
	Timestamp time.Time      `json:"timestamp"`
	Fields    map[string]any `json:"fields,omitempty"`
}

func New(serviceName, sinkURL string) *Logger {
	l := &Logger{
		serviceName: serviceName,
		sinkURL:     sinkURL,
		client:      &http.Client{Timeout: 2 * time.Second},
	}
	if sinkURL != "" {
		l.sinkQueue = make(chan []byte, 256)
		go l.runSinkWorker()
	}
	return l
}

func (l *Logger) Info(msg string, fields map[string]any) {
	l.write("info", msg, fields)
}

func (l *Logger) Error(msg string, fields map[string]any) {
	l.write("error", msg, fields)
}

func (l *Logger) write(level, msg string, fields map[string]any) {
	env := logEnvelope{
		Level:     level,
		Message:   msg,
		Service:   l.serviceName,
		Timestamp: time.Now().UTC(),
		Fields:    fields,
	}
	b, _ := json.Marshal(env)
	log.Printf("%s", string(b))
	if l.sinkURL == "" || l.sinkQueue == nil {
		return
	}
	select {
	case l.sinkQueue <- b:
	default:
		// Drop when queue is saturated to keep request paths non-blocking.
	}
}

func (l *Logger) runSinkWorker() {
	for payload := range l.sinkQueue {
		req, err := http.NewRequest(http.MethodPost, l.sinkURL, bytes.NewReader(payload))
		if err != nil {
			continue
		}
		req.Header.Set("Content-Type", "application/json")
		resp, err := l.client.Do(req)
		if err != nil {
			continue
		}
		_ = resp.Body.Close()
	}
}
