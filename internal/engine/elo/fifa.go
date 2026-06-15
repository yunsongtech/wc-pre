package elo

import "fmt"

func FromFifaRank(rank int) float64 {
	if rank < 1 {
		return 0
	}
	return 2100 - 25*float64(rank-1)
}

func ValidateRank(rank int) error {
	if rank < 1 {
		return fmt.Errorf("invalid fifa rank: %d", rank)
	}
	return nil
}
