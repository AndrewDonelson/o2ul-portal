package o2ul_users

import "com.nlaak.backend-template/internal/domain"

type Profile struct {
	PlayerID          string  `json:"userId"`
	Username          string  `json:"username,omitempty"`
	Name              string  `json:"name,omitempty"`
	Email             string  `json:"email,omitempty"`
	Image             string  `json:"image,omitempty"`
	Bio               string  `json:"bio,omitempty"`
	Phone             string  `json:"phone,omitempty"`
	BGImageURL        string  `json:"bgImageUrl,omitempty"`
	BGImageStorageID  string  `json:"bgImageStorageId,omitempty"`
	BGImageOpacity    float64 `json:"bgImageOpacity,omitempty"`
	IsAnonymous       bool    `json:"isAnonymous"`
	IsOnline          bool    `json:"isOnline"`
	IsBetaTester      bool    `json:"isBetaTester"`
	IsHookupEnabled   bool    `json:"isHookupEnabled"`
	LastLoginDateUnix int64   `json:"lastLoginDate,omitempty"`
	LastSeenUnix      int64   `json:"lastSeen,omitempty"`
	CreatedAtUnix     int64   `json:"createdAt,omitempty"`
	UpdatedAtUnix     int64   `json:"updatedAt,omitempty"`
}

type Viewer struct {
	UserID          string      `json:"userId"`
	Username        string      `json:"username,omitempty"`
	Name            string      `json:"name,omitempty"`
	Email           string      `json:"email,omitempty"`
	Image           string      `json:"image,omitempty"`
	Role            domain.Role `json:"role"`
	IsAnonymous     bool        `json:"isAnonymous"`
	IsOnline        bool        `json:"isOnline"`
	IsAdmin         bool        `json:"isAdmin"`
	AdminRole       domain.Role `json:"adminRole,omitempty"`
	IsBetaTester    bool        `json:"isBetaTester"`
	IsHookupEnabled bool        `json:"isHookupEnabled"`
	LastSeen        int64       `json:"lastSeen,omitempty"`
	PresenceStatus  string      `json:"presenceStatus"`
}

func IsAdminRole(role domain.Role) bool {
	return domain.CanActAs(role, domain.RoleAdmin)
}
