package application

import (
	"context"
	"time"

	"com.nlaak.backend-template/internal/domain/o2ul_presence"
)

type O2ULPresenceService struct {
	repo O2ULPresenceRepository
}

func NewO2ULPresenceService(repo O2ULPresenceRepository) *O2ULPresenceService {
	return &O2ULPresenceService{repo: repo}
}

func (s *O2ULPresenceService) GetPresence(ctx context.Context, userID string) (o2ul_presence.Presence, error) {
	presence, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		if err == ErrNotFound {
			now := time.Now().UnixMilli()
			return o2ul_presence.Presence{UserID: userID, IsOnline: false, LastSeen: now, LastActive: now, PresenceStatus: o2ul_presence.StatusOffline}, nil
		}
		return o2ul_presence.Presence{}, err
	}
	return presence, nil
}

func (s *O2ULPresenceService) UpdatePresence(ctx context.Context, userID, status string) (o2ul_presence.Presence, error) {
	now := time.Now().UnixMilli()
	presence, _ := s.GetPresence(ctx, userID)
	presence.UserID = userID
	presence.PresenceStatus = status
	presence.LastActive = now
	presence.LastSeen = now
	presence.IsOnline = status == o2ul_presence.StatusOnline || status == o2ul_presence.StatusAway
	return s.repo.Upsert(ctx, presence)
}

func (s *O2ULPresenceService) SetOffline(ctx context.Context, userID string) (o2ul_presence.Presence, error) {
	return s.UpdatePresence(ctx, userID, o2ul_presence.StatusOffline)
}

func (s *O2ULPresenceService) GetCCUMetrics(ctx context.Context) (o2ul_presence.Metrics, error) {
	items, err := s.repo.List(ctx)
	if err != nil {
		return o2ul_presence.Metrics{}, err
	}
	now := time.Now().UnixMilli()
	cut1m := now - int64(time.Minute/time.Millisecond)
	cut24h := now - int64((24*time.Hour)/time.Millisecond)
	cut30d := now - int64((30*24*time.Hour)/time.Millisecond)
	metrics := o2ul_presence.Metrics{}
	for _, item := range items {
		if item.LastSeen >= cut1m && item.IsOnline {
			metrics.CurrentCCU++
		}
		if item.LastSeen >= cut24h {
			metrics.Last24h++
		}
		if item.LastSeen >= cut30d {
			metrics.Last30d++
		}
	}
	if metrics.Last30d > 0 {
		metrics.MonthlyAvg = metrics.Last30d / 30
	}
	return metrics, nil
}
