package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/robfig/cron/v3"

	"github.com/pxzlin/wc-pre/internal/domain"
	"github.com/pxzlin/wc-pre/internal/engine/ei"
)

type AlarmService struct {
	predict  *PredictService
	profiles *ProfileService
	cron     *cron.Cron
	mu       sync.RWMutex
	triggers map[string]domain.AlarmTrigger
	sleepAdv map[string]domain.SleepGuardAdvice
}

func NewAlarmService(predict *PredictService, profiles *ProfileService, debugClock string) *AlarmService {
	loc := time.UTC
	if debugClock != "" {
		if t, err := time.Parse(time.RFC3339, debugClock); err == nil {
			_ = t
		}
	}

	a := &AlarmService{
		predict:  predict,
		profiles: profiles,
		cron:     cron.New(cron.WithLocation(loc)),
		triggers: make(map[string]domain.AlarmTrigger),
		sleepAdv: make(map[string]domain.SleepGuardAdvice),
	}

	a.cron.AddFunc("0 22 * * *", func() { a.evaluateSleepGuard(context.Background()) })
	a.cron.AddFunc("*/1 * * * *", func() { a.checkPreMatchAlarms(context.Background()) })
	a.cron.Start()
	return a
}

func (a *AlarmService) evaluateSleepGuard(ctx context.Context) {
	matches, err := a.profiles.ListMatches(ctx)
	if err != nil {
		return
	}
	for _, m := range matches {
		if m.Status != domain.MatchScheduled {
			continue
		}
		pred, err := a.predict.Predict(ctx, m.ID)
		if err != nil {
			continue
		}
		advice := domain.SleepGuardAdvice{
			MatchID: m.ID,
			EI:      pred.EI,
			P00:     pred.P00,
		}
		if pred.IsBoringMatch {
			advice.ShouldEnableSleepGuard = true
			advice.Message = fmt.Sprintf("算法检测到 %s vs %s 沉闷概率极高，建议睡眠保护。", m.Home.Name, m.Away.Name)
		} else {
			advice.Message = fmt.Sprintf("%s vs %s 精彩指数 %.1f，建议正常观赛。", m.Home.Name, m.Away.Name, pred.EI)
		}
		a.mu.Lock()
		a.sleepAdv[m.ID] = advice
		a.mu.Unlock()
	}
}

func (a *AlarmService) checkPreMatchAlarms(ctx context.Context) {
	matches, err := a.profiles.ListMatches(ctx)
	if err != nil {
		return
	}
	now := time.Now()
	for _, m := range matches {
		kickoff, err := time.Parse(time.RFC3339, m.KickoffISO)
		if err != nil {
			continue
		}
		diff := kickoff.Sub(now)
		if diff > 14*time.Minute && diff <= 16*time.Minute {
			pred, err := a.predict.Predict(ctx, m.ID)
			if err != nil {
				continue
			}
			a.mu.Lock()
			a.triggers[m.ID] = domain.AlarmTrigger{
				Type:        "AI_TACTICAL",
				Title:       fmt.Sprintf("战术唤醒：%s vs %s", m.Home.Name, m.Away.Name),
				Description: pred.TacticalNarrative,
			}
			a.mu.Unlock()
		}
	}
}

func (a *AlarmService) TriggerFromLiveEvent(matchID string, event domain.LiveEvent, lts float64) {
	a.mu.Lock()
	defer a.mu.Unlock()

	title := fmt.Sprintf("高能节点：%s", event.Type)
	desc := event.Message
	if event.Type == domain.EventPenalty || event.Type == domain.EventVARReview {
		title = "点球/VAR 关键判罚"
		desc = fmt.Sprintf("第 %d 分钟：%s", event.Minute, event.Message)
	}

	a.triggers[matchID] = domain.AlarmTrigger{
		Type:        string(event.Type),
		Title:       title,
		Description: desc,
	}
}

func (a *AlarmService) PopTrigger(matchID string) (domain.AlarmTrigger, bool) {
	a.mu.Lock()
	defer a.mu.Unlock()
	t, ok := a.triggers[matchID]
	if ok {
		delete(a.triggers, matchID)
	}
	return t, ok
}

func (a *AlarmService) SleepGuard(matchID string) (domain.SleepGuardAdvice, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	a2, ok := a.sleepAdv[matchID]
	return a2, ok
}

func (a *AlarmService) EvaluateSleepGuardNow(ctx context.Context, matchID string) (domain.SleepGuardAdvice, error) {
	match, err := a.profiles.GetMatch(ctx, matchID)
	if err != nil {
		return domain.SleepGuardAdvice{}, err
	}
	pred, err := a.predict.Predict(ctx, matchID)
	if err != nil {
		return domain.SleepGuardAdvice{}, err
	}
	advice := domain.SleepGuardAdvice{
		MatchID: matchID,
		EI:      pred.EI,
		P00:     pred.P00,
		ShouldEnableSleepGuard: pred.IsBoringMatch,
	}
	if pred.IsBoringMatch {
		advice.Message = fmt.Sprintf("算法检测到 %s vs %s 沉闷概率极高。", match.Home.Name, match.Away.Name)
	} else {
		advice.Message = fmt.Sprintf("精彩指数 %.1f，不建议睡眠保护。", pred.EI)
	}
	return advice, nil
}

func (a *AlarmService) IsBoring(ctx context.Context, matchID string) bool {
	pred, err := a.predict.Predict(ctx, matchID)
	if err != nil {
		return false
	}
	return ei.IsBoringMatch(pred.EI, pred.P00)
}
