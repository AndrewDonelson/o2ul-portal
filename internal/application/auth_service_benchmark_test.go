package application

import (
	"context"
	"testing"
	"time"

	"com.nlaak.backend-template/internal/domain"
)

type benchAuthToken struct{}

func (benchAuthToken) Issue(player domain.Player) (string, error) {
	return player.ID, nil
}

func (benchAuthToken) Parse(_ string) (TokenClaims, error) {
	return TokenClaims{}, nil
}

type benchAuthLog struct{}

func (benchAuthLog) Info(_ string, _ map[string]any)  {}
func (benchAuthLog) Error(_ string, _ map[string]any) {}

func BenchmarkAuthServiceLogin(b *testing.B) {
	repo := newAuthTestRepo()
	hash, err := domain.HashPassword("bench-password")
	if err != nil {
		b.Fatalf("hash password: %v", err)
	}
	player := domain.Player{
		ID:           "bench-user",
		Email:        "bench@example.com",
		Username:     "bench",
		PasswordHash: hash,
		Role:         domain.RoleRegistered,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	repo.users[player.Email] = player

	svc := NewAuthService(repo, benchAuthToken{}, benchAuthLog{})
	ctx := context.Background()

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, _, err := svc.Login(ctx, player.Email, "bench-password"); err != nil {
			b.Fatalf("login failed: %v", err)
		}
	}
}
