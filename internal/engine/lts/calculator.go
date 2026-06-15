package lts

import (
	"math"

	"github.com/pxzlin/wc-pre/internal/domain"
)

const (
	kappa       = 0.15
	triggerThreshold = 0.82
)

var defaultXTGrid = buildDefaultXTGrid()

func buildDefaultXTGrid() [192]float64 {
	var grid [192]float64
	for i := range grid {
		row := i / 12
		col := i % 12
		attackProgress := float64(col) / 11
		centralBias := 1 - math.Abs(float64(row)-7.5)/7.5*0.3
		grid[i] = attackProgress * centralBias * 0.08
	}
	return grid
}

func Phi(state domain.LiveMatchState) float64 {
	const alpha, beta, gamma, delta = 0.02, 0.03, 0.04, 0.05
	return alpha*state.Attacks10m +
		beta*state.Corners10m +
		gamma*state.ShotsOnTarget10m +
		delta*state.DeltaXG10m
}

func TimeFactor(minute int) float64 {
	if minute <= 0 {
		return 0.5
	}
	if minute >= 90 {
		return 1.2
	}
	return 0.5 + float64(minute)/90*0.7
}

func ComputeLTS(state domain.LiveMatchState) float64 {
	phi := Phi(state)
	tau := TimeFactor(state.Minute)

	var sum float64
	activeStart := 96
	for i := activeStart; i < 192; i++ {
		sum += defaultXTGrid[i] * (1 + phi)
	}

	lts := kappa * sum * tau
	if lts > 1 {
		return 1
	}
	return lts
}

func ShouldTrigger(lts float64) bool {
	return lts > triggerThreshold
}

func TriggerThreshold() float64 {
	return triggerThreshold
}
