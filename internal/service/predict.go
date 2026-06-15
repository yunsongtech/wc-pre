package service

import (
	"context"
	"fmt"
	"math"

	"github.com/pxzlin/wc-pre/internal/domain"
	"github.com/pxzlin/wc-pre/internal/engine/ei"
	"github.com/pxzlin/wc-pre/internal/engine/poisson"
	"github.com/pxzlin/wc-pre/internal/semantic/deepseek"
)

type PredictService struct {
	profiles *ProfileService
	semantic *deepseek.Client
}

func NewPredictService(profiles *ProfileService, semantic *deepseek.Client) *PredictService {
	return &PredictService{profiles: profiles, semantic: semantic}
}

func (s *PredictService) Predict(ctx context.Context, matchID string) (domain.PredictionResult, error) {
	match, err := s.profiles.GetMatch(ctx, matchID)
	if err != nil {
		return domain.PredictionResult{}, err
	}

	record, ok := s.profiles.GetMatchRecord(matchID)
	if !ok {
		return domain.PredictionResult{}, fmt.Errorf("match record not found")
	}

	mu, nu := poisson.ComputeRates(match.Home, match.Away, 1.0, 1.0)
	preOutcome := poisson.Simulate(poisson.Params{HomeMu: mu, AwayNu: nu, MaxGoals: poisson.DefaultMaxGoals})
	preEI := ei.Compute(preOutcome.PBoring, match.Home, match.Away, record.IsKnockout)

	keyPlayers := s.keyPlayers(match)

	semantic, narrative, err := s.semantic.Analyze(ctx, match, preEI, preOutcome.WDL, keyPlayers)
	if err != nil {
		return domain.PredictionResult{}, err
	}

	mu, nu = poisson.ComputeRates(match.Home, match.Away, semantic.LineupTheta, 1.0)
	outcome := poisson.Simulate(poisson.Params{HomeMu: mu, AwayNu: nu, MaxGoals: poisson.DefaultMaxGoals})
	eiRaw := ei.Compute(outcome.PBoring, match.Home, match.Away, record.IsKnockout)
	eiFinal := clampEI(eiRaw + semantic.ExcitementAdj)
	boring := ei.IsBoringMatch(eiFinal, outcome.P00)

	result := domain.PredictionResult{
		MatchID:    matchID,
		WDL:        outcome.WDL,
		Top3Scores: outcome.Top3Scores,
		EI:         eiFinal,
		EIRaw:      eiRaw,
		PBoring:    outcome.PBoring,
		P00:        outcome.P00,
		Mu:         mu,
		Nu:         nu,
		IsBoringMatch: boring,
		Semantic:   semantic,
		TacticalNarrative: narrative,
		KeyPlayers: keyPlayers,
		BoringMatchSafeguard: buildSafeguard(boring, match, eiFinal),
	}
	return result, nil
}

func (s *PredictService) Radar(ctx context.Context, matchID string) (domain.RadarComparison, error) {
	pred, err := s.Predict(ctx, matchID)
	if err != nil {
		return domain.RadarComparison{}, err
	}
	match, err := s.profiles.GetMatch(ctx, matchID)
	if err != nil {
		return domain.RadarComparison{}, err
	}

	sem := pred.Semantic.NarrativeConfidence
	return domain.RadarComparison{
		Home: domain.BuildRadarPayload(match.Home, pred.EI, sem),
		Away: domain.BuildRadarPayload(match.Away, pred.EI, sem),
	}, nil
}

func (s *PredictService) keyPlayers(match domain.MatchContext) []string {
	reg := s.profiles.Registry()
	homePlayers := reg.PlayersForTeam(match.Home.ID)
	awayPlayers := reg.PlayersForTeam(match.Away.ID)

	var keys []string
	for i := 0; i < len(homePlayers) && i < 2; i++ {
		keys = append(keys, homePlayers[i].Name)
	}
	for i := 0; i < len(awayPlayers) && i < 2; i++ {
		keys = append(keys, awayPlayers[i].Name)
	}
	return keys
}

func clampEI(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 10 {
		return 10
	}
	return v
}

func buildSafeguard(boring bool, match domain.MatchContext, ei float64) *domain.BoringSafeguard {
	if boring {
		return &domain.BoringSafeguard{
			IsBoringPossible: true,
			Reason:           fmt.Sprintf("%s 与 %s 阵型偏防守，0-0 概率偏高。", match.Home.Name, match.Away.Name),
			ActionAdvice:     "建议开启睡眠保护模式，明早推送无剧透3分钟集锦。",
		}
	}
	return &domain.BoringSafeguard{
		IsBoringPossible: false,
		Reason:           fmt.Sprintf("精彩指数 %.1f，预计对攻节奏较快。", ei),
		ActionAdvice:     "建议开启高能触发模式，关键节点自动唤醒。",
	}
}

func WDLToPercent(wdl domain.WDLProb) domain.WDLProb {
	return domain.WDLProb{
		Home: math.Round(wdl.Home * 1000) / 10,
		Draw: math.Round(wdl.Draw * 1000) / 10,
		Away: math.Round(wdl.Away * 1000) / 10,
	}
}
