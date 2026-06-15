package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"

	"github.com/pxzlin/wc-pre/internal/domain"
	"github.com/pxzlin/wc-pre/internal/engine/lts"
	"github.com/pxzlin/wc-pre/internal/live/mock"
	"github.com/pxzlin/wc-pre/internal/service"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type LiveHandler struct {
	feed     *mock.Feed
	alarm    *service.AlarmService
	predict  *service.PredictService
	profiles *service.ProfileService
	history  sync.Map
}

func NewLiveHandler(feed *mock.Feed, alarm *service.AlarmService, predict *service.PredictService, profiles *service.ProfileService) *LiveHandler {
	return &LiveHandler{feed: feed, alarm: alarm, predict: predict, profiles: profiles}
}

func (h *LiveHandler) WebSocket(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	ctx := r.Context()
	events, err := h.feed.Subscribe(ctx, matchID)
	if err != nil {
		return
	}

	for event := range events {
		state, _ := h.feed.GetState(matchID)
		ltsVal := lts.ComputeLTS(state)
		h.appendHistory(matchID, ltsVal*100)

		if lts.ShouldTrigger(ltsVal) || isHighEnergyEvent(event.Type) {
			h.alarm.TriggerFromLiveEvent(matchID, event, ltsVal)
		}

		payload := map[string]any{
			"event": event,
			"lts":   ltsVal,
			"state": state,
		}
		if err := conn.WriteJSON(payload); err != nil {
			return
		}
	}
}

func isHighEnergyEvent(t domain.LiveEventType) bool {
	switch t {
	case domain.EventPenalty, domain.EventVARReview, domain.EventMinute80, domain.EventExtraTime, domain.EventRedCard:
		return true
	default:
		return false
	}
}

func (h *LiveHandler) appendHistory(matchID string, ltsPercent float64) {
	val, _ := h.history.LoadOrStore(matchID, []float64{})
	hist := val.([]float64)
	hist = append(hist, ltsPercent)
	if len(hist) > 20 {
		hist = hist[len(hist)-20:]
	}
	h.history.Store(matchID, hist)
}

func (h *LiveHandler) SSE(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "SSE_UNSUPPORTED", "streaming unsupported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			state, _ := h.feed.GetState(matchID)
			ltsVal := lts.ComputeLTS(state)
			h.appendHistory(matchID, ltsVal*100)

			pred, _ := h.predict.Predict(r.Context(), matchID)
			histVal, _ := h.history.Load(matchID)
			hist, _ := histVal.([]float64)
			if hist == nil {
				hist = []float64{ltsVal * 100}
			}

			payload := domain.SSEPayload{
				MatchID:       matchID,
				EI:            pred.EI,
				LTS:           ltsVal,
				AlarmStatus:   domain.AlarmArmed,
				ThreatHistory: hist,
			}
			if trigger, ok := h.alarm.PopTrigger(matchID); ok {
				payload.AlarmStatus = domain.AlarmTriggered
				payload.AlarmTrigger = &trigger
			}

			data, _ := json.Marshal(payload)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}

func (h *LiveHandler) InjectEvent(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "id")
	var event domain.LiveEvent
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", err.Error())
		return
	}
	state := h.feed.UpdateState(matchID, event)
	ltsVal := lts.ComputeLTS(state)
	h.alarm.TriggerFromLiveEvent(matchID, event, ltsVal)
	writeJSON(w, http.StatusOK, map[string]any{"lts": ltsVal, "injected": true})
}
