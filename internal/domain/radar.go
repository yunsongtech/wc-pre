package domain

type RadarPayload struct {
	Attack    float64 `json:"attack"`
	Defense   float64 `json:"defense"`
	Midfield  float64 `json:"midfield"`
	Pace      float64 `json:"pace"`
	Technique float64 `json:"technique"`
	Mentality float64 `json:"mentality"`
	MacroGDP  float64 `json:"macroGdp"`
	Elo       float64 `json:"elo"`
	EI        float64 `json:"ei"`
	Semantic  float64 `json:"semantic"`
}

type RadarComparison struct {
	Home RadarPayload `json:"home"`
	Away RadarPayload `json:"away"`
}

func EloToRadarScore(elo float64) float64 {
	const minElo, maxElo = 1325.0, 2100.0
	if elo <= minElo {
		return 0
	}
	if elo >= maxElo {
		return 100
	}
	return (elo - minElo) / (maxElo - minElo) * 100
}

func BuildRadarPayload(team TeamProfile, ei float64, semantic float64) RadarPayload {
	return RadarPayload{
		Attack:    team.Attributes.Attack,
		Defense:   team.Attributes.Defense,
		Midfield:  team.Attributes.Midfield,
		Pace:      team.Attributes.Pace,
		Technique: team.Attributes.Technique,
		Mentality: team.Attributes.Mentality,
		MacroGDP:  team.Macro.MacroScore,
		Elo:       EloToRadarScore(team.Elo),
		EI:        ei / 10 * 100,
		Semantic:  semantic * 100,
	}
}
