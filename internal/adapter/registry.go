package adapter

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/pxzlin/wc-pre/internal/adapter/fmcsv"
	"github.com/pxzlin/wc-pre/internal/adapter/wikimedia"
	"github.com/pxzlin/wc-pre/internal/adapter/worldbank"
	"github.com/pxzlin/wc-pre/internal/domain"
	"github.com/pxzlin/wc-pre/internal/engine/elo"
)

type TeamProfileProvider interface {
	BuildTeamProfile(ctx context.Context, teamID string) (domain.TeamProfile, error)
}

type Registry struct {
	fm       *fmcsv.Parser
	players  *fmcsv.PlayerParser
	worldbank *worldbank.Client
	wiki     *wikimedia.Client
	macroScores map[string]float64
}

func NewRegistry(dataDir string) (*Registry, error) {
	fm, err := fmcsv.NewParser(dataDir)
	if err != nil {
		return nil, fmt.Errorf("fmcsv: %w", err)
	}
	players, err := fmcsv.NewPlayerParser(dataDir)
	if err != nil {
		return nil, fmt.Errorf("players: %w", err)
	}

	fixtureDir := filepath.Join(dataDir, "fixtures", "worldbank")
	wb := worldbank.NewClient(fixtureDir)

	reg := &Registry{
		fm:       fm,
		players:  players,
		worldbank: wb,
		wiki:     wikimedia.NewClient(),
	}

	if err := reg.computeMacroScores(context.Background()); err != nil {
		return nil, err
	}
	return reg, nil
}

func (r *Registry) computeMacroScores(ctx context.Context) error {
	teams := r.fm.AllTeams()
	gdps := make([]float64, len(teams))
	ids := make([]string, len(teams))

	for i, t := range teams {
		gdp, _, err := r.worldbank.FetchMacro(ctx, t.ISO2)
		if err != nil {
			gdp = 0
		}
		gdps[i] = gdp
		ids[i] = t.ID
	}

	scores := worldbank.NormalizeMacroScores(gdps)
	r.macroScores = make(map[string]float64)
	for i, id := range ids {
		r.macroScores[id] = scores[i]
	}
	return nil
}

func (r *Registry) BuildTeamProfile(ctx context.Context, teamID string) (domain.TeamProfile, error) {
	raw, ok := r.fm.GetTeam(teamID)
	if !ok {
		return domain.TeamProfile{}, fmt.Errorf("team not found: %s", teamID)
	}

	gdp, pop, err := r.worldbank.FetchMacro(ctx, raw.ISO2)
	if err != nil {
		gdp, pop = 0, 0
	}

	flagURL, summary, _ := r.wiki.FetchTeamMedia(ctx, raw.NameEN)

	return domain.TeamProfile{
		ID:       raw.ID,
		Name:     raw.NameZH,
		NameEN:   raw.NameEN,
		ISO2:     raw.ISO2,
		FifaRank: raw.FifaRank,
		Elo:      elo.FromFifaRank(raw.FifaRank),
		Formation: raw.Formation,
		Attributes: domain.TeamAttributes{
			Attack:    raw.Attack,
			Defense:   raw.Defense,
			Midfield:  raw.Midfield,
			Pace:      raw.Pace,
			Technique: raw.Technique,
			Mentality: raw.Mentality,
		},
		Macro: domain.MacroIndicators{
			GDPUsd:     gdp,
			Population: pop,
			MacroScore: r.macroScores[raw.ID],
		},
		Media: domain.TeamMedia{
			FlagURL:     flagURL,
			WikiSummary: summary,
		},
	}, nil
}

func (r *Registry) PlayersForTeam(teamID string) []fmcsv.PlayerRow {
	return r.players.PlayersForTeam(teamID)
}

type MatchStore struct {
	matches []domain.MatchRecord
}

func NewMatchStore(dataDir string) (*MatchStore, error) {
	path := filepath.Join(dataDir, "matches.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var matches []domain.MatchRecord
	if err := json.Unmarshal(data, &matches); err != nil {
		return nil, err
	}
	return &MatchStore{matches: matches}, nil
}

func (s *MatchStore) All() []domain.MatchRecord {
	return s.matches
}

func (s *MatchStore) Get(id string) (domain.MatchRecord, bool) {
	for _, m := range s.matches {
		if m.ID == id {
			return m, true
		}
	}
	return domain.MatchRecord{}, false
}

func (r *Registry) BuildMatchContext(ctx context.Context, record domain.MatchRecord) (domain.MatchContext, error) {
	home, err := r.BuildTeamProfile(ctx, record.HomeTeamID)
	if err != nil {
		return domain.MatchContext{}, err
	}
	away, err := r.BuildTeamProfile(ctx, record.AwayTeamID)
	if err != nil {
		return domain.MatchContext{}, err
	}
	return domain.MatchContext{
		ID:         record.ID,
		Group:      record.Group,
		Status:     record.Status,
		KickoffISO: record.KickoffISO,
		Home:       home,
		Away:       away,
		Score:      record.Score,
	}, nil
}
