package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/pxzlin/wc-pre/internal/adapter"
	"github.com/pxzlin/wc-pre/internal/config"
	"github.com/pxzlin/wc-pre/internal/semantic/deepseek"
	"github.com/pxzlin/wc-pre/internal/service"
)

func main() {
	matchID := flag.String("match", "wc-01", "match id")
	dataDir := flag.String("data", "data", "data directory")
	flag.Parse()

	cfg := config.Config{DataDir: *dataDir, DeepSeekAPIKey: os.Getenv("DEEPSEEK_API_KEY"), DeepSeekBaseURL: "https://api.deepseek.com", DeepSeekModel: "deepseek-chat"}

	registry, err := adapter.NewRegistry(cfg.DataDir)
	if err != nil {
		log.Fatal(err)
	}
	matches, err := adapter.NewMatchStore(cfg.DataDir)
	if err != nil {
		log.Fatal(err)
	}

	profiles := service.NewProfileService(registry, matches)
	semantic := deepseek.NewClient(cfg.DeepSeekAPIKey, cfg.DeepSeekBaseURL, cfg.DeepSeekModel)
	predict := service.NewPredictService(profiles, semantic)

	result, err := predict.Predict(context.Background(), *matchID)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Match: %s\n", result.MatchID)
	fmt.Printf("WDL: home=%.2f draw=%.2f away=%.2f\n", result.WDL.Home, result.WDL.Draw, result.WDL.Away)
	fmt.Printf("EI: %.2f (raw %.2f)\n", result.EI, result.EIRaw)
	fmt.Printf("Mu/Nu: %.3f / %.3f\n", result.Mu, result.Nu)
	fmt.Printf("Semantic: theta=%.3f adj=%.3f conf=%.3f\n",
		result.Semantic.LineupTheta, result.Semantic.ExcitementAdj, result.Semantic.NarrativeConfidence)
	for i, s := range result.Top3Scores {
		fmt.Printf("Top%d: %d-%d (%.3f)\n", i+1, s.Home, s.Away, s.Prob)
	}
}
