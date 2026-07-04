package o2ul_preferences

const (
	ModeLive = "live"
	ModeBeta = "beta"
)

const BuiltInAuthProvider = "platform"

type SystemPreferences struct {
	Mode                  string   `json:"mode"`
	EnableCalling         bool     `json:"enableCalling"`
	EnabledOAuthProviders []string `json:"enabledOAuthProviders"`
	LastUpdatedUnix       int64    `json:"lastUpdated"`
	UpdatedBy             string   `json:"updatedBy"`
}

func DefaultPreferences(nowUnix int64) SystemPreferences {
	return SystemPreferences{
		Mode:                  ModeLive,
		EnableCalling:         false,
		EnabledOAuthProviders: []string{BuiltInAuthProvider},
		LastUpdatedUnix:       nowUnix,
		UpdatedBy:             "system",
	}
}
