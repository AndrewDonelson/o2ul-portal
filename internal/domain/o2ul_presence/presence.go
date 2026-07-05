package o2ul_presence

const (
	StatusOnline  = "online"
	StatusAway    = "away"
	StatusOffline = "offline"
)

type Presence struct {
	UserID         string `json:"userId"`
	IsOnline       bool   `json:"isOnline"`
	LastSeen       int64  `json:"lastSeen"`
	PresenceStatus string `json:"presenceStatus"`
	LastActive     int64  `json:"lastActive"`
}

type Metrics struct {
	CurrentCCU int `json:"ccuCurrent"`
	Last24h    int `json:"ccu24hrs"`
	Last30d    int `json:"ccu30days"`
	MonthlyAvg int `json:"ccuMonthlyAvg"`
}
