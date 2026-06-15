package mock

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/pxzlin/wc-pre/internal/domain"
)

type scriptEvent struct {
	Type      domain.LiveEventType `json:"type"`
	Minute    int                  `json:"minute"`
	HomeScore int                  `json:"homeScore"`
	AwayScore int                  `json:"awayScore"`
	Message   string               `json:"message"`
	DelayMs   int                  `json:"delayMs"`
}

type Feed struct {
	dataDir string
	mu      sync.Mutex
	states  map[string]domain.LiveMatchState
}

func NewFeed(dataDir string) *Feed {
	return &Feed{
		dataDir: dataDir,
		states:  make(map[string]domain.LiveMatchState),
	}
}

func (f *Feed) Subscribe(ctx context.Context, matchID string) (<-chan domain.LiveEvent, error) {
	scriptPath := filepath.Join(f.dataDir, "live_scripts", matchID+".json")
	data, err := os.ReadFile(scriptPath)
	if err != nil {
		return f.defaultScript(ctx, matchID)
	}

	var script []scriptEvent
	if err := json.Unmarshal(data, &script); err != nil {
		return nil, err
	}

	ch := make(chan domain.LiveEvent)
	go func() {
		defer close(ch)
		state := domain.LiveMatchState{
			MatchID:          matchID,
			Attacks10m:       5,
			Corners10m:       2,
			ShotsOnTarget10m: 3,
			DeltaXG10m:       0.4,
		}
		for _, ev := range script {
			select {
			case <-ctx.Done():
				return
			default:
			}
			delay := ev.DelayMs
			if delay <= 0 {
				delay = 2000
			}
			time.Sleep(time.Duration(delay) * time.Millisecond)

			state.Minute = ev.Minute
			state.HomeScore = ev.HomeScore
			state.AwayScore = ev.AwayScore
			state.Attacks10m += 2
			state.ShotsOnTarget10m += 1
			state.DeltaXG10m += 0.15

			f.mu.Lock()
			f.states[matchID] = state
			f.mu.Unlock()

			ch <- domain.LiveEvent{
				Type:      ev.Type,
				Minute:    ev.Minute,
				HomeScore: ev.HomeScore,
				AwayScore: ev.AwayScore,
				Message:   ev.Message,
			}
		}
	}()
	return ch, nil
}

func (f *Feed) defaultScript(ctx context.Context, matchID string) (<-chan domain.LiveEvent, error) {
	ch := make(chan domain.LiveEvent)
	go func() {
		defer close(ch)
		events := []domain.LiveEvent{
			{Type: domain.EventPenalty, Minute: 80, HomeScore: 1, AwayScore: 1, Message: "模拟点球判罚"},
		}
		for _, ev := range events {
			select {
			case <-ctx.Done():
				return
			case <-time.After(2 * time.Second):
				ch <- ev
			}
		}
	}()
	return ch, nil
}

func (f *Feed) GetState(matchID string) (domain.LiveMatchState, bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	s, ok := f.states[matchID]
	if !ok {
		return domain.LiveMatchState{MatchID: matchID, Minute: 72, Attacks10m: 8, Corners10m: 3, ShotsOnTarget10m: 4, DeltaXG10m: 0.5}, true
	}
	return s, ok
}

func (f *Feed) UpdateState(matchID string, event domain.LiveEvent) domain.LiveMatchState {
	f.mu.Lock()
	defer f.mu.Unlock()
	state, ok := f.states[matchID]
	if !ok {
		state = domain.LiveMatchState{MatchID: matchID, Attacks10m: 5, Corners10m: 2, ShotsOnTarget10m: 3, DeltaXG10m: 0.4}
	}
	state.Minute = event.Minute
	state.HomeScore = event.HomeScore
	state.AwayScore = event.AwayScore
	state.Attacks10m += 5
	state.ShotsOnTarget10m += 2
	state.DeltaXG10m += 0.2
	f.states[matchID] = state
	return state
}
