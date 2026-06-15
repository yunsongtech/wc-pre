package elo

import "testing"

func TestFromFifaRank(t *testing.T) {
	tests := []struct {
		rank int
		want float64
	}{
		{1, 2100},
		{32, 1325},
		{10, 1875},
	}
	for _, tc := range tests {
		got := FromFifaRank(tc.rank)
		if got != tc.want {
			t.Fatalf("rank %d: got %v want %v", tc.rank, got, tc.want)
		}
	}
}

func TestValidateRank(t *testing.T) {
	if err := ValidateRank(0); err == nil {
		t.Fatal("expected error for rank 0")
	}
}
