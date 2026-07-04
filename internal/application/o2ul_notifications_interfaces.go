package application

import (
	"context"

	"com.nlaak.backend-template/internal/domain/o2ul_notifications"
)

type O2ULNotificationsRepository interface {
	StoreSubscription(ctx context.Context, subscription o2ul_notifications.PushSubscription) (o2ul_notifications.PushSubscription, error)
	RemoveSubscriptionByEndpoint(ctx context.Context, userID, endpoint string) error
	ListSubscriptionsByUserID(ctx context.Context, userID string) ([]o2ul_notifications.PushSubscription, error)
	CreatePending(ctx context.Context, notification o2ul_notifications.PendingNotification) (o2ul_notifications.PendingNotification, error)
	UpdatePendingStatus(ctx context.Context, id, status, lastError string) (o2ul_notifications.PendingNotification, error)
	ListPending(ctx context.Context, limit int) ([]o2ul_notifications.PendingNotification, error)
}
