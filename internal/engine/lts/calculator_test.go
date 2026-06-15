package lts

import (
	"testing"

	"github.com/pxzlin/wc-pre/internal/domain"
)

func TestHighPressureLTS(t *testing.T) {
	low := ComputeLTS(domain.LiveMatchState{Minute: 30, Attacks10m: 2, Corners10m: 1, ShotsOnTarget10m: 1, DeltaXG10m: 0.1})
	high := ComputeLTS(domain.LiveMatchState{Minute: 85, Attacks10m: 20, Corners10m: 8, ShotsOnTarget10m: 10, DeltaXG10m: 1.5})
	if high <= low {
		t.Fatalf("high pressure LTS should exceed low: high=%v low=%v", high, low)
	}
}

func TestTriggerThreshold(t *testing.T) {
	if ShouldTrigger(0.9) != true {
		t.Fatal("expected trigger at 0.9")
	}
	if ShouldTrigger(0.5) != false {
		t.Fatal("expected no trigger at 0.5")
	}
}
