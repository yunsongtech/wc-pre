package main

import (
	"log"
	"net/http"

	"github.com/pxzlin/wc-pre/internal/adapter"
	"github.com/pxzlin/wc-pre/internal/api"
	"github.com/pxzlin/wc-pre/internal/config"
	"github.com/pxzlin/wc-pre/internal/live/mock"
	"github.com/pxzlin/wc-pre/internal/semantic/deepseek"
	"github.com/pxzlin/wc-pre/internal/service"
)

func main() {
	cfg := config.Load()

	registry, err := adapter.NewRegistry(cfg.DataDir)
	if err != nil {
		log.Fatalf("adapter registry: %v", err)
	}

	matches, err := adapter.NewMatchStore(cfg.DataDir)
	if err != nil {
		log.Fatalf("match store: %v", err)
	}

	profiles := service.NewProfileService(registry, matches)
	semantic := deepseek.NewClient(cfg.DeepSeekAPIKey, cfg.DeepSeekBaseURL, cfg.DeepSeekModel)
	predict := service.NewPredictService(profiles, semantic)
	alarm := service.NewAlarmService(predict, profiles, cfg.AlarmDebugClock)
	feed := mock.NewFeed(cfg.DataDir)

	srv := api.NewServer(cfg)
	handler := srv.Router(profiles, predict, alarm, feed)

	log.Printf("WorldCup Oracle API listening on %s", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, handler); err != nil {
		log.Fatal(err)
	}
}
