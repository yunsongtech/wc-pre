package domain

type LiveEventType string

const (
	EventGoal      LiveEventType = "GOAL"
	EventPenalty   LiveEventType = "PENALTY"
	EventVARReview LiveEventType = "VAR_REVIEW"
	EventRedCard   LiveEventType = "RED_CARD"
	EventMinute80  LiveEventType = "MINUTE_80"
	EventExtraTime LiveEventType = "EXTRA_TIME"
)

type LiveEvent struct {
	Type      LiveEventType `json:"type"`
	Minute    int           `json:"minute"`
	HomeScore int           `json:"homeScore"`
	AwayScore int           `json:"awayScore"`
	Message   string        `json:"message"`
}

type LiveMatchState struct {
	MatchID          string  `json:"matchId"`
	Minute           int     `json:"minute"`
	HomeScore        int     `json:"homeScore"`
	AwayScore        int     `json:"awayScore"`
	Attacks10m       float64 `json:"attacks10m"`
	Corners10m       float64 `json:"corners10m"`
	ShotsOnTarget10m float64 `json:"shotsOnTarget10m"`
	DeltaXG10m       float64 `json:"deltaXG10m"`
}

type AlarmMode string

const (
	AlarmAITactical AlarmMode = "AI_TACTICAL"
	AlarmHardcore   AlarmMode = "HARDCORE_DND"
	AlarmHighEnergy AlarmMode = "HIGH_ENERGY"
)

type AlarmStatus string

const (
	AlarmOff       AlarmStatus = "OFF"
	AlarmArmed     AlarmStatus = "ARMED"
	AlarmTriggered AlarmStatus = "TRIGGERED"
	AlarmSleepGuard AlarmStatus = "SLEEP_GUARD"
)

type SSEPayload struct {
	MatchID       string        `json:"matchId"`
	EI            float64       `json:"ei"`
	LTS           float64       `json:"lts"`
	AlarmStatus   AlarmStatus   `json:"alarmStatus"`
	ThreatHistory []float64     `json:"threatHistory"`
	AlarmTrigger  *AlarmTrigger `json:"alarmTrigger,omitempty"`
}

type AlarmTrigger struct {
	Type        string `json:"type"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type IoTActionRequest struct {
	UserID  string `json:"userId"`
	MatchID string `json:"matchId"`
	Action  string `json:"action"`
}

type IoTActionResponse struct {
	Accepted bool     `json:"accepted"`
	Devices  []string `json:"devices"`
}

type SleepGuardAdvice struct {
	MatchID              string  `json:"matchId"`
	ShouldEnableSleepGuard bool    `json:"shouldEnableSleepGuard"`
	EI                   float64 `json:"ei"`
	P00                  float64 `json:"p00"`
	Message              string  `json:"message"`
}

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error APIError `json:"error"`
}
