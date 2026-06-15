package poisson

import (
	"math"
	"testing"

	"github.com/pxzlin/wc-pre/internal/domain"
)

func TestSimulateProbabilitiesSum(t *testing.T) {
	home := domain.TeamProfile{
		Elo: 2000,
		Attributes: domain.TeamAttributes{Attack: 85, Defense: 80},
	}
	away := domain.TeamProfile{
		Elo: 1900,
		Attributes: domain.TeamAttributes{Attack: 80, Defense: 85},
	}
	mu, nu := ComputeRates(home, away, 1.0, 1.0)
	out := Simulate(Params{HomeMu: mu, AwayNu: nu, MaxGoals: DefaultMaxGoals})

	sum := out.WDL.Home + out.WDL.Draw + out.WDL.Away
	if math.Abs(sum-1) > 0.01 {
		t.Fatalf("wdl sum = %v", sum)
	}
}

func TestStrongHomeTeam(t *testing.T) {
	home := domain.TeamProfile{
		Elo: 2100,
		Attributes: domain.TeamAttributes{Attack: 95, Defense: 90},
	}
	away := domain.TeamProfile{
		Elo: 1400,
		Attributes: domain.TeamAttributes{Attack: 70, Defense: 75},
	}
	mu, nu := ComputeRates(home, away, 1.0, 1.0)
	out := Simulate(Params{HomeMu: mu, AwayNu: nu, MaxGoals: DefaultMaxGoals})
	if out.WDL.Home <= out.WDL.Away {
		t.Fatalf("expected home win > away win, got home=%v away=%v", out.WDL.Home, out.WDL.Away)
	}
}
