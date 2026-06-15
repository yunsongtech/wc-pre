package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/pxzlin/wc-pre/internal/service"
)

type MatchHandler struct {
	profiles *service.ProfileService
	predict  *service.PredictService
}

func NewMatchHandler(profiles *service.ProfileService, predict *service.PredictService) *MatchHandler {
	return &MatchHandler{profiles: profiles, predict: predict}
}

func (h *MatchHandler) List(w http.ResponseWriter, r *http.Request) {
	matches, err := h.profiles.ListMatches(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "LIST_MATCHES_FAILED", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, matches)
}

func (h *MatchHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	match, err := h.profiles.GetMatch(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "MATCH_NOT_FOUND", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, match)
}

func (h *MatchHandler) Predict(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	result, err := h.predict.Predict(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "PREDICT_FAILED", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *MatchHandler) Radar(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	radar, err := h.predict.Radar(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "RADAR_FAILED", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, radar)
}

type TeamHandler struct {
	profiles *service.ProfileService
}

func NewTeamHandler(profiles *service.ProfileService) *TeamHandler {
	return &TeamHandler{profiles: profiles}
}

func (h *TeamHandler) Profile(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	profile, err := h.profiles.GetTeamProfile(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "TEAM_NOT_FOUND", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, profile)
}

type DebugHandler struct {
	profiles *service.ProfileService
}

func NewDebugHandler(profiles *service.ProfileService) *DebugHandler {
	return &DebugHandler{profiles: profiles}
}

func (h *DebugHandler) Team(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	profile, err := h.profiles.GetTeamProfile(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "TEAM_NOT_FOUND", err.Error())
		return
	}
	writeJSON(w, http.StatusOK, profile)
}
