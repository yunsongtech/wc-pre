package deepseek

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"strings"

	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
	"github.com/openai/openai-go/v2/shared"

	"github.com/pxzlin/wc-pre/internal/domain"
)

//go:embed fallback.json
var fallbackJSON []byte

//go:embed prompts/tactical.txt
var tacticalPrompt string

type Client struct {
	openai    openai.Client
	model     string
	hasAPIKey bool
}

type semanticResponse struct {
	LineupTheta         float64 `json:"lineupTheta"`
	ExcitementAdj       float64 `json:"excitementAdj"`
	NarrativeConfidence float64 `json:"narrativeConfidence"`
	TacticalNarrative   string  `json:"tacticalNarrative"`
}

func NewClient(apiKey, baseURL, model string) *Client {
	opts := []option.RequestOption{
		option.WithBaseURL(baseURL),
	}
	if apiKey != "" {
		opts = append(opts, option.WithAPIKey(apiKey))
	}
	return &Client{
		openai:    openai.NewClient(opts...),
		model:     model,
		hasAPIKey: apiKey != "",
	}
}

func (c *Client) Analyze(ctx context.Context, match domain.MatchContext, preEI float64, wdl domain.WDLProb, keyPlayers []string) (domain.SemanticAdjustments, string, error) {
	if !c.hasAPIKey {
		return loadFallback()
	}

	prompt := buildPrompt(match, preEI, wdl, keyPlayers)
	resp, err := c.openai.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: shared.ChatModel(c.model),
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.SystemMessage("You are a football tactical analyst. Output ONLY valid JSON with fields: lineupTheta (float 0.85-1.15), excitementAdj (float -1.5 to 1.5), narrativeConfidence (float 0-1), tacticalNarrative (string in Chinese)."),
			openai.UserMessage(prompt),
		},
		ResponseFormat: openai.ChatCompletionNewParamsResponseFormatUnion{
			OfJSONObject: &shared.ResponseFormatJSONObjectParam{
				Type: "json_object",
			},
		},
	})
	if err != nil {
		return loadFallback()
	}

	if len(resp.Choices) == 0 {
		return loadFallback()
	}

	content := resp.Choices[0].Message.Content
	if content == "" {
		return loadFallback()
	}

	var parsed semanticResponse
	if err := json.Unmarshal([]byte(content), &parsed); err != nil {
		return loadFallback()
	}

	adj, narrative := validateAndClamp(parsed)
	return adj, narrative, nil
}

func buildPrompt(match domain.MatchContext, preEI float64, wdl domain.WDLProb, keyPlayers []string) string {
	players := strings.Join(keyPlayers, ", ")
	return fmt.Sprintf(tacticalPrompt,
		match.Home.Name, match.Away.Name,
		match.Home.Formation, match.Away.Formation,
		preEI,
		wdl.Home*100, wdl.Draw*100, wdl.Away*100,
		players,
	)
}

func validateAndClamp(r semanticResponse) (domain.SemanticAdjustments, string) {
	theta := clamp(r.LineupTheta, 0.85, 1.15)
	adj := clamp(r.ExcitementAdj, -1.5, 1.5)
	conf := clamp(r.NarrativeConfidence, 0, 1)
	narrative := r.TacticalNarrative
	if narrative == "" {
		narrative = "战术分析暂不可用。"
	}
	return domain.SemanticAdjustments{
		LineupTheta:         theta,
		ExcitementAdj:       adj,
		NarrativeConfidence: conf,
	}, narrative
}

func clamp(v, min, max float64) float64 {
	return math.Max(min, math.Min(max, v))
}

func loadFallback() (domain.SemanticAdjustments, string, error) {
	var r semanticResponse
	if err := json.Unmarshal(fallbackJSON, &r); err != nil {
		return domain.SemanticAdjustments{
			LineupTheta:         1.0,
			ExcitementAdj:       0,
			NarrativeConfidence: 0.75,
		}, "系统使用本地战术引擎分析，关键对位均处于均势。", nil
	}
	adj, narrative := validateAndClamp(r)
	return adj, narrative, nil
}

func FallbackFromEnv() bool {
	return os.Getenv("DEEPSEEK_API_KEY") == ""
}
