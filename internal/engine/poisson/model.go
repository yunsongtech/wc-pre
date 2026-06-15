package poisson

import (
	"math"
	"sort"

	"github.com/pxzlin/wc-pre/internal/domain"
)

const (
	DefaultMu0     = 1.35
	DefaultMaxGoals = 8
)

type Params struct {
	HomeMu float64
	AwayNu float64
	MaxGoals int
}

type Outcome struct {
	WDL        domain.WDLProb
	Top3Scores []domain.ScoreLine
	ScoreMatrix map[[2]int]float64
	P00        float64
	PBoring    float64
}

func AttackIndex(attr float64, elo float64) float64 {
	return (attr / 50) * (elo / 2000)
}

func DefenseFactor(defense float64) float64 {
	return 1.2 - (defense / 200)
}

func ComputeRates(home, away domain.TeamProfile, thetaHome, thetaAway float64) (mu, nu float64) {
	mu0 := DefaultMu0
	alphaH := AttackIndex(home.Attributes.Attack, home.Elo)
	betaA := DefenseFactor(away.Attributes.Defense)
	alphaA := AttackIndex(away.Attributes.Attack, away.Elo)
	betaH := DefenseFactor(home.Attributes.Defense)

	mu = mu0 * alphaH * betaA * thetaHome
	nu = mu0 * alphaA * betaH * thetaAway
	if mu < 0.01 {
		mu = 0.01
	}
	if nu < 0.01 {
		nu = 0.01
	}
	return mu, nu
}

func PoissonPMF(lambda float64, k int) float64 {
	if k < 0 {
		return 0
	}
	return math.Exp(-lambda) * math.Pow(lambda, float64(k)) / factorial(k)
}

func factorial(n int) float64 {
	if n <= 1 {
		return 1
	}
	result := 1.0
	for i := 2; i <= n; i++ {
		result *= float64(i)
	}
	return result
}

func Simulate(params Params) Outcome {
	maxG := params.MaxGoals
	if maxG <= 0 {
		maxG = DefaultMaxGoals
	}

	matrix := make(map[[2]int]float64)
	var homeWin, draw, awayWin, p00, pBoring float64

	for x := 0; x <= maxG; x++ {
		px := PoissonPMF(params.HomeMu, x)
		for y := 0; y <= maxG; y++ {
			py := PoissonPMF(params.AwayNu, y)
			p := px * py
			matrix[[2]int{x, y}] = p

			if x > y {
				homeWin += p
			} else if x == y {
				draw += p
			} else {
				awayWin += p
			}
			if x == 0 && y == 0 {
				p00 = p
			}
			if x+y <= 1 {
				pBoring += p
			}
		}
	}

	type scoreProb struct {
		home, away int
		prob       float64
	}
	var scores []scoreProb
	for k, p := range matrix {
		scores = append(scores, scoreProb{k[0], k[1], p})
	}
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].prob > scores[j].prob
	})

	top3 := make([]domain.ScoreLine, 0, 3)
	for i := 0; i < len(scores) && i < 3; i++ {
		top3 = append(top3, domain.ScoreLine{
			Home: scores[i].home,
			Away: scores[i].away,
			Prob: scores[i].prob,
		})
	}

	return Outcome{
		WDL: domain.WDLProb{
			Home: homeWin,
			Draw: draw,
			Away: awayWin,
		},
		Top3Scores:  top3,
		ScoreMatrix: matrix,
		P00:         p00,
		PBoring:     pBoring,
	}
}
