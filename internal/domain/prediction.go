package domain

type WDLProb struct {
	Home float64 `json:"home"`
	Draw float64 `json:"draw"`
	Away float64 `json:"away"`
}

type ScoreLine struct {
	Home int     `json:"home"`
	Away int     `json:"away"`
	Prob float64 `json:"prob"`
}

type SemanticAdjustments struct {
	LineupTheta         float64 `json:"lineupTheta"`
	ExcitementAdj       float64 `json:"excitementAdj"`
	NarrativeConfidence float64 `json:"narrativeConfidence"`
}

type PredictionResult struct {
	MatchID           string              `json:"matchId"`
	WDL               WDLProb             `json:"wdl"`
	Top3Scores        []ScoreLine         `json:"top3Scores"`
	EI                float64             `json:"ei"`
	EIRaw             float64             `json:"eiRaw,omitempty"`
	PBoring           float64             `json:"pBoring"`
	P00               float64             `json:"p00"`
	Mu                float64             `json:"mu"`
	Nu                float64             `json:"nu"`
	IsBoringMatch     bool                `json:"isBoringMatch"`
	Semantic          SemanticAdjustments `json:"semantic"`
	TacticalNarrative string              `json:"tacticalNarrative"`
	KeyPlayers        []string            `json:"keyPlayers,omitempty"`
	BoringMatchSafeguard *BoringSafeguard `json:"boringMatchSafeguard,omitempty"`
}

type BoringSafeguard struct {
	IsBoringPossible bool   `json:"isBoringPossible"`
	Reason           string `json:"reason"`
	ActionAdvice     string `json:"actionAdvice"`
}
