package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/pxzlin/wc-pre/internal/api/handlers"
	"github.com/pxzlin/wc-pre/internal/config"
	"github.com/pxzlin/wc-pre/internal/live/mock"
	"github.com/pxzlin/wc-pre/internal/notification/voice"
	"github.com/pxzlin/wc-pre/internal/service"
)

type Server struct {
	cfg config.Config
}

func NewServer(cfg config.Config) *Server {
	return &Server{cfg: cfg}
}

func (s *Server) Router(
	profiles *service.ProfileService,
	predict *service.PredictService,
	alarm *service.AlarmService,
	feed *mock.Feed,
) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	matchH := handlers.NewMatchHandler(profiles, predict)
	teamH := handlers.NewTeamHandler(profiles)
	debugH := handlers.NewDebugHandler(profiles)
	liveH := handlers.NewLiveHandler(feed, alarm, predict, profiles)
	alarmH := handlers.NewAlarmHandler(alarm)
	voiceNotifier := voice.NewAliyunNotifier(s.cfg.AliyunAccessKeyID, s.cfg.AliyunAccessSecret)
	iotH := handlers.NewIoTHandler(voiceNotifier)
	legacyH := handlers.NewLegacyPredictHandler(predict, profiles)

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/matches", matchH.List)
		r.Get("/matches/{id}", matchH.Get)
		r.Post("/matches/{id}/predict", matchH.Predict)
		r.Get("/matches/{id}/radar", matchH.Radar)
		r.Get("/teams/{id}/profile", teamH.Profile)

		r.Get("/sse/matches/{id}", liveH.SSE)
		r.Get("/ws/matches/{id}/live", liveH.WebSocket)

		r.Get("/alarms/sleep-guard/{matchId}", alarmH.SleepGuard)
		r.Post("/alarms/schedule", alarmH.Schedule)

		r.Post("/iot/wakeup-action", iotH.WakeupAction)
		r.Post("/iot/goal-celebration", iotH.GoalCelebration)
	})

	r.Get("/debug/team/{id}", debugH.Team)
	r.Post("/debug/inject-event/{id}", liveH.InjectEvent)

	// Legacy route for existing frontend during migration
	r.Post("/api/predict", legacyH.Predict)

	return r
}
