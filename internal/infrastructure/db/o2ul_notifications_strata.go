package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain/o2ul_notifications"
	"github.com/AndrewDonelson/strata"
)

const o2ulPushSubscriptionsSchemaName = "o2ul_push_subscriptions"
const o2ulPendingNotificationsSchemaName = "o2ul_pending_notifications"

type o2ulPushSubscriptionRecord struct {
	SubscriptionKey string `strata:"primary_key"`
	UserID          string `strata:"index"`
	Endpoint        string `strata:"unique,index"`
	ExpirationTime  int64
	P256DH          string
	Auth            string
	CreatedAt       int64
	UpdatedAt       int64
	CreatedTime     time.Time `strata:"auto_now_add"`
	UpdatedTime     time.Time `strata:"auto_now"`
}

type o2ulPendingNotificationRecord struct {
	NotificationKey string `strata:"primary_key"`
	UserID          string `strata:"index"`
	Title           string
	Body            string
	Icon            string
	Tag             string
	URL             string
	DataJSON        string
	Status          string `strata:"index"`
	CreatedAt       int64  `strata:"index"`
	ProcessedAt     int64
	Attempts        int
	LastError       string
	CreatedTime     time.Time `strata:"auto_now_add"`
	UpdatedTime     time.Time `strata:"auto_now"`
}

func registerO2ULNotificationSchemas(ds *strata.DataStore) error {
	if err := ds.Register(strata.Schema{
		Name:      o2ulPushSubscriptionsSchemaName,
		Model:     &o2ulPushSubscriptionRecord{},
		WriteMode: strata.WriteThrough,
		L1:        strata.MemPolicy{TTL: 30 * time.Second, MaxEntries: 50_000},
		L2:        strata.RedisPolicy{TTL: 5 * time.Minute},
		L3:        strata.PostgresPolicy{TableName: o2ulPushSubscriptionsSchemaName},
	}); err != nil {
		return err
	}
	if err := ds.Register(strata.Schema{
		Name:      o2ulPendingNotificationsSchemaName,
		Model:     &o2ulPendingNotificationRecord{},
		WriteMode: strata.WriteThrough,
		L1:        strata.MemPolicy{TTL: 30 * time.Second, MaxEntries: 100_000},
		L2:        strata.RedisPolicy{TTL: 10 * time.Minute},
		L3:        strata.PostgresPolicy{TableName: o2ulPendingNotificationsSchemaName},
	}); err != nil {
		return err
	}
	return nil
}

type StrataO2ULNotificationsRepository struct {
	ds *strata.DataStore
}

func NewStrataO2ULNotificationsRepository(ds *strata.DataStore) *StrataO2ULNotificationsRepository {
	return &StrataO2ULNotificationsRepository{ds: ds}
}

func (r *StrataO2ULNotificationsRepository) StoreSubscription(ctx context.Context, subscription o2ul_notifications.PushSubscription) (o2ul_notifications.PushSubscription, error) {
	if subscription.ID == "" {
		subscription.ID = fmt.Sprintf("sub-%d", time.Now().UnixNano())
	}
	record := o2ulPushSubscriptionRecord{
		SubscriptionKey: subscription.ID,
		UserID:          subscription.UserID,
		Endpoint:        subscription.Endpoint,
		ExpirationTime:  subscription.ExpirationTime,
		P256DH:          subscription.P256DH,
		Auth:            subscription.Auth,
		CreatedAt:       subscription.CreatedAt,
		UpdatedAt:       subscription.UpdatedAt,
	}
	if err := r.ds.Set(ctx, o2ulPushSubscriptionsSchemaName, subscription.ID, &record); err != nil {
		return o2ul_notifications.PushSubscription{}, err
	}
	return subscription, nil
}

func (r *StrataO2ULNotificationsRepository) RemoveSubscriptionByEndpoint(ctx context.Context, userID, endpoint string) error {
	q := strata.Q().Where("endpoint = $1 AND user_id = $2", endpoint, userID).Limit(1).Build()
	records, err := strata.SearchTyped[o2ulPushSubscriptionRecord](ctx, r.ds, o2ulPushSubscriptionsSchemaName, &q)
	if err != nil {
		return err
	}
	if len(records) == 0 {
		return nil
	}
	return r.ds.Delete(ctx, o2ulPushSubscriptionsSchemaName, records[0].SubscriptionKey)
}

func (r *StrataO2ULNotificationsRepository) ListSubscriptionsByUserID(ctx context.Context, userID string) ([]o2ul_notifications.PushSubscription, error) {
	q := strata.Q().Where("user_id = $1", userID).Build()
	records, err := strata.SearchTyped[o2ulPushSubscriptionRecord](ctx, r.ds, o2ulPushSubscriptionsSchemaName, &q)
	if err != nil {
		return nil, err
	}
	out := make([]o2ul_notifications.PushSubscription, 0, len(records))
	for _, rcd := range records {
		out = append(out, o2ul_notifications.PushSubscription{
			ID:             rcd.SubscriptionKey,
			UserID:         rcd.UserID,
			Endpoint:       rcd.Endpoint,
			ExpirationTime: rcd.ExpirationTime,
			P256DH:         rcd.P256DH,
			Auth:           rcd.Auth,
			CreatedAt:      rcd.CreatedAt,
			UpdatedAt:      rcd.UpdatedAt,
		})
	}
	return out, nil
}

func (r *StrataO2ULNotificationsRepository) CreatePending(ctx context.Context, notification o2ul_notifications.PendingNotification) (o2ul_notifications.PendingNotification, error) {
	if notification.ID == "" {
		notification.ID = fmt.Sprintf("notif-%d", time.Now().UnixNano())
	}
	record := o2ulPendingNotificationRecord{
		NotificationKey: notification.ID,
		UserID:          notification.UserID,
		Title:           notification.Title,
		Body:            notification.Body,
		Icon:            notification.Icon,
		Tag:             notification.Tag,
		URL:             notification.URL,
		Status:          notification.Status,
		CreatedAt:       notification.CreatedAt,
		ProcessedAt:     notification.ProcessedAt,
		Attempts:        notification.Attempts,
		LastError:       notification.LastError,
	}
	if err := r.ds.Set(ctx, o2ulPendingNotificationsSchemaName, notification.ID, &record); err != nil {
		return o2ul_notifications.PendingNotification{}, err
	}
	return notification, nil
}

func (r *StrataO2ULNotificationsRepository) UpdatePendingStatus(ctx context.Context, id, status, lastError string) (o2ul_notifications.PendingNotification, error) {
	record, err := strata.GetTyped[o2ulPendingNotificationRecord](ctx, r.ds, o2ulPendingNotificationsSchemaName, id)
	if err != nil {
		if errors.Is(err, strata.ErrNotFound) {
			return o2ul_notifications.PendingNotification{}, application.ErrNotFound
		}
		return o2ul_notifications.PendingNotification{}, err
	}
	record.Status = status
	record.LastError = lastError
	record.Attempts += 1
	record.ProcessedAt = time.Now().UnixMilli()
	if err := r.ds.Set(ctx, o2ulPendingNotificationsSchemaName, id, record); err != nil {
		return o2ul_notifications.PendingNotification{}, err
	}
	return toPendingNotification(*record), nil
}

func (r *StrataO2ULNotificationsRepository) ListPending(ctx context.Context, limit int) ([]o2ul_notifications.PendingNotification, error) {
	q := strata.Q().Where("status = $1", o2ul_notifications.NotificationStatusPending).OrderBy("created_at").Desc().Limit(limit).Build()
	records, err := strata.SearchTyped[o2ulPendingNotificationRecord](ctx, r.ds, o2ulPendingNotificationsSchemaName, &q)
	if err != nil {
		return nil, err
	}
	out := make([]o2ul_notifications.PendingNotification, 0, len(records))
	for _, record := range records {
		out = append(out, toPendingNotification(record))
	}
	return out, nil
}

func toPendingNotification(record o2ulPendingNotificationRecord) o2ul_notifications.PendingNotification {
	return o2ul_notifications.PendingNotification{
		ID:          record.NotificationKey,
		UserID:      record.UserID,
		Title:       record.Title,
		Body:        record.Body,
		Icon:        record.Icon,
		Tag:         record.Tag,
		URL:         record.URL,
		Status:      record.Status,
		CreatedAt:   record.CreatedAt,
		ProcessedAt: record.ProcessedAt,
		Attempts:    record.Attempts,
		LastError:   record.LastError,
	}
}
