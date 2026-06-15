package domain

type TeamAttributes struct {
	Attack    float64 `json:"attack"`
	Defense   float64 `json:"defense"`
	Midfield  float64 `json:"midfield"`
	Pace      float64 `json:"pace"`
	Technique float64 `json:"technique"`
	Mentality float64 `json:"mentality"`
}

type MacroIndicators struct {
	GDPUsd     float64 `json:"gdpUsd"`
	Population float64 `json:"population"`
	MacroScore float64 `json:"macroScore"`
}

type TeamMedia struct {
	FlagURL     string `json:"flagUrl"`
	WikiSummary string `json:"wikiSummary"`
}

type TeamProfile struct {
	ID         string          `json:"id"`
	Name       string          `json:"name"`
	NameEN     string          `json:"nameEn,omitempty"`
	ISO2       string          `json:"iso2"`
	FifaRank   int             `json:"fifaRank"`
	Elo        float64         `json:"elo"`
	Formation  string          `json:"formation,omitempty"`
	Attributes TeamAttributes  `json:"attributes"`
	Macro      MacroIndicators `json:"macro"`
	Media      TeamMedia       `json:"media"`
}

type HomeAway struct {
	Home int `json:"home"`
	Away int `json:"away"`
}

type MatchStatus string

const (
	MatchLive      MatchStatus = "LIVE"
	MatchScheduled MatchStatus = "SCHEDULED"
	MatchFinished  MatchStatus = "FINISHED"
)

type MatchRecord struct {
	ID          string      `json:"id"`
	Group       string      `json:"group"`
	Status      MatchStatus `json:"status"`
	KickoffISO  string      `json:"kickoffISO"`
	HomeTeamID  string      `json:"homeTeamId"`
	AwayTeamID  string      `json:"awayTeamId"`
	Score       HomeAway    `json:"score"`
	TimeElapsed string      `json:"timeElapsed,omitempty"`
	IsKnockout  bool        `json:"isKnockout"`
}

type MatchContext struct {
	ID         string      `json:"id"`
	Group      string      `json:"group"`
	Status     MatchStatus `json:"status"`
	KickoffISO string      `json:"kickoffISO"`
	Home       TeamProfile `json:"home"`
	Away       TeamProfile `json:"away"`
	Score      HomeAway    `json:"score"`
}

type PlayerRecord struct {
	ID       string `json:"id"`
	TeamID   string `json:"teamId"`
	Name     string `json:"name"`
	Position string `json:"position"`
}
