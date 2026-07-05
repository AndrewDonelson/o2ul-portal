package httpinfra

import (
	"testing"
	"time"

	"com.nlaak.backend-template/internal/domain"
)

func BenchmarkJWTIssueAndParse(b *testing.B) {
	svc := NewJWTService("bench-secret", time.Hour)
	player := domain.Player{
		ID:       "bench-user",
		Email:    "bench@example.com",
		Username: "bench",
		Role:     domain.RoleRegistered,
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		tkn, err := svc.Issue(player)
		if err != nil {
			b.Fatalf("issue token: %v", err)
		}
		if _, err := svc.Parse(tkn); err != nil {
			b.Fatalf("parse token: %v", err)
		}
	}
}
