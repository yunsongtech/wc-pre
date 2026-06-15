package ei

import (
	"math"
	"strings"

	"github.com/pxzlin/wc-pre/internal/domain"
	"github.com/pxzlin/wc-pre/internal/engine/poisson"
)

func DefensiveCoefficient(formation string) float64 {
	f := strings.ReplaceAll(formation, " ", "")
	switch {
	case strings.HasPrefix(f, "5-4-1"), strings.HasPrefix(f, "5-3-2"), strings.HasPrefix(f, "5-2-3"):
		return 0.8
	case strings.HasPrefix(f, "4-5-1"), strings.HasPrefix(f, "4-4-2"):
		return 0.6
	case strings.HasPrefix(f, "4-3-3"), strings.HasPrefix(f, "3-4-3"):
		return 0.2
	default:
		return 0.5
	}
}

func PressureLambda(isKnockout bool) float64 {
	if isKnockout {
		return 0.2
	}
	return 0
}

func Compute(pBoring float64, home, away domain.TeamProfile, isKnockout bool) float64 {
	cDef := (DefensiveCoefficient(home.Formation) + DefensiveCoefficient(away.Formation)) / 2
	lambda := PressureLambda(isKnockout)
	ei := 10 * (1 - pBoring) * (1 - cDef) * math.Exp(-lambda)
	if ei < 0 {
		return 0
	}
	if ei > 10 {
		return 10
	}
	return ei
}

func IsBoringMatch(ei, p00 float64) bool {
	return ei < 3.5 && p00 > 0.60
}

func ComputeFromMatch(home, away domain.TeamProfile, thetaHome, thetaAway float64, isKnockout bool) (ei float64, pBoring, p00 float64, boring bool) {
	mu, nu := poisson.ComputeRates(home, away, thetaHome, thetaAway)
	out := poisson.Simulate(poisson.Params{HomeMu: mu, AwayNu: nu, MaxGoals: poisson.DefaultMaxGoals})
	ei = Compute(out.PBoring, home, away, isKnockout)
	return ei, out.PBoring, out.P00, IsBoringMatch(ei, out.P00)
}
