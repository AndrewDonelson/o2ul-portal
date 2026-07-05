package domain

import "time"

type UserSettings struct {
	PlayerID       string    `json:"playerId"`
	Theme          string    `json:"theme"`
	RefreshSeconds int       `json:"refreshSeconds"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type NotificationPreferences struct {
	PlayerID     string    `json:"playerId"`
	EmailEnabled bool      `json:"emailEnabled"`
	PushEnabled  bool      `json:"pushEnabled"`
	InAppEnabled bool      `json:"inAppEnabled"`
	UpdatedAt    time.Time `json:"updatedAt"`
}
