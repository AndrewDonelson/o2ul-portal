package o2ul_notifications

type PushSubscription struct {
	ID             string `json:"id"`
	UserID         string `json:"userId"`
	Endpoint       string `json:"endpoint"`
	ExpirationTime int64  `json:"expirationTime,omitempty"`
	P256DH         string `json:"p256dh"`
	Auth           string `json:"auth"`
	CreatedAt      int64  `json:"createdAt"`
	UpdatedAt      int64  `json:"updatedAt"`
}

type PendingNotification struct {
	ID          string         `json:"id"`
	UserID      string         `json:"userId"`
	Title       string         `json:"title"`
	Body        string         `json:"body"`
	Icon        string         `json:"icon,omitempty"`
	Tag         string         `json:"tag,omitempty"`
	URL         string         `json:"url,omitempty"`
	Data        map[string]any `json:"data,omitempty"`
	Status      string         `json:"status"`
	CreatedAt   int64          `json:"createdAt"`
	ProcessedAt int64          `json:"processedAt,omitempty"`
	Attempts    int            `json:"attempts"`
	LastError   string         `json:"lastError,omitempty"`
}

const (
	NotificationStatusPending         = "pending"
	NotificationStatusDelivered       = "delivered"
	NotificationStatusFailed          = "failed"
	NotificationStatusNoSubscriptions = "no_subscriptions"
)
