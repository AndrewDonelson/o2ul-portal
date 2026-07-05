package domain

import "time"

type PasswordResetToken struct {
	ID        string    `json:"id"`
	PlayerID  string    `json:"playerId"`
	TokenHash string    `json:"-"`
	ExpiresAt time.Time `json:"expiresAt"`
	CreatedAt time.Time `json:"createdAt"`
	Used      bool      `json:"used"`
	UsedAt    time.Time `json:"usedAt"`
}
