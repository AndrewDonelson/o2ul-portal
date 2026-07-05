package application

import (
	"context"
	"time"

	"com.nlaak.backend-template/internal/domain/o2ul_notifications"
)

type O2ULNotificationsService struct {
	repo O2ULNotificationsRepository
}

func NewO2ULNotificationsService(repo O2ULNotificationsRepository) *O2ULNotificationsService {
	return &O2ULNotificationsService{repo: repo}
}

func (s *O2ULNotificationsService) StoreSubscription(ctx context.Context, userID string, subscription o2ul_notifications.PushSubscription) (o2ul_notifications.PushSubscription, error) {
	now := time.Now().UnixMilli()
	subscription.UserID = userID
	subscription.UpdatedAt = now
	if subscription.CreatedAt == 0 {
		subscription.CreatedAt = now
	}
	return s.repo.StoreSubscription(ctx, subscription)
}

func (s *O2ULNotificationsService) RemoveSubscription(ctx context.Context, userID, endpoint string) error {
	return s.repo.RemoveSubscriptionByEndpoint(ctx, userID, endpoint)
}

func (s *O2ULNotificationsService) ListSubscriptions(ctx context.Context, userID string) ([]o2ul_notifications.PushSubscription, error) {
	return s.repo.ListSubscriptionsByUserID(ctx, userID)
}

func (s *O2ULNotificationsService) CreateNotification(ctx context.Context, notification o2ul_notifications.PendingNotification) (o2ul_notifications.PendingNotification, error) {
	notification.Status = o2ul_notifications.NotificationStatusPending
	notification.CreatedAt = time.Now().UnixMilli()
	return s.repo.CreatePending(ctx, notification)
}

func (s *O2ULNotificationsService) UpdateNotificationStatus(ctx context.Context, id, status, lastError string) (o2ul_notifications.PendingNotification, error) {
	return s.repo.UpdatePendingStatus(ctx, id, status, lastError)
}

func (s *O2ULNotificationsService) ListPending(ctx context.Context, limit int) ([]o2ul_notifications.PendingNotification, error) {
	if limit <= 0 {
		limit = 20
	}
	return s.repo.ListPending(ctx, limit)
}
