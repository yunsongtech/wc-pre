package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/pxzlin/wc-pre/internal/domain"
	"github.com/pxzlin/wc-pre/internal/notification/voice"
	"github.com/pxzlin/wc-pre/internal/service"
)

type AlarmHandler struct {
	alarm *service.AlarmService
}

func NewAlarmHandler(alarm *service.AlarmService) *AlarmHandler {
	return &AlarmHandler{alarm: alarm}
}

func (h *AlarmHandler) SleepGuard(w http.ResponseWriter, r *http.Request) {
	matchID := chi.URLParam(r, "matchId")
	advice, err := h.alarm.EvaluateSleepGuardNow(r.Context(), matchID)
	if err != nil {
		writeError(w, http.StatusNotFound, "SLEEP_GUARD_FAILED", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, advice)
}

func (h *AlarmHandler) Schedule(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "scheduled"})
}

type IoTHandler struct {
	voice voice.Notifier
}

func NewIoTHandler(v voice.Notifier) *IoTHandler {
	return &IoTHandler{voice: v}
}

func (h *IoTHandler) WakeupAction(w http.ResponseWriter, r *http.Request) {
	var req domain.IoTActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, domain.IoTActionResponse{
		Accepted: true,
		Devices:  []string{"tv", "light", "audio"},
	})
}

func (h *IoTHandler) GoalCelebration(w http.ResponseWriter, r *http.Request) {
	var req domain.IoTActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, domain.IoTActionResponse{
		Accepted: true,
		Devices:  []string{"light-strip", "soundbar"},
	})
}

// Legacy predict endpoint for backward compatibility with existing frontend
type LegacyPredictHandler struct {
	predict  *service.PredictService
	profiles *service.ProfileService
}

func NewLegacyPredictHandler(predict *service.PredictService, profiles *service.ProfileService) *LegacyPredictHandler {
	return &LegacyPredictHandler{predict: predict, profiles: profiles}
}

func (h *LegacyPredictHandler) Predict(w http.ResponseWriter, r *http.Request) {
	var body struct {
		MatchID  string `json:"matchId"`
		HomeTeam struct {
			Name string `json:"name"`
		} `json:"homeTeam"`
		AwayTeam struct {
			Name string `json:"name"`
		} `json:"awayTeam"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_BODY", err.Error())
		return
	}

	matchID := body.MatchID
	if matchID == "" {
		matchID = "wc-01"
	}

	result, err := h.predict.Predict(r.Context(), matchID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "PREDICT_FAILED", err.Error())
		return
	}

	legacy := map[string]any{
		"matchId": result.MatchID,
		"winnerProbability": map[string]float64{
			"home": result.WDL.Home * 100,
			"draw": result.WDL.Draw * 100,
			"away": result.WDL.Away * 100,
		},
		"excitementRating":   result.EI * 10,
		"tacticalAnalysis":   result.TacticalNarrative,
		"keyPlayers":         result.KeyPlayers,
		"boringMatchSafeguard": result.BoringMatchSafeguard,
		"top3Scores":         result.Top3Scores,
		"semantic":           result.Semantic,
	}
	writeJSON(w, http.StatusOK, legacy)
}
