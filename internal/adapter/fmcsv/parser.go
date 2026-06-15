package fmcsv

import (
	"encoding/csv"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"
)

var ErrMissingColumn = errors.New("fmcsv: missing required column")

type ColumnMapping struct {
	Columns map[string][]string `yaml:"columns"`
}

type RawTeam struct {
	ID         string
	NameZH     string
	NameEN     string
	ISO2       string
	FifaRank   int
	Attack     float64
	Defense    float64
	Midfield   float64
	Pace       float64
	Technique  float64
	Mentality  float64
	Formation  string
}

type Parser struct {
	teams map[string]RawTeam
}

func NewParser(dataDir string) (*Parser, error) {
	mappingPath := filepath.Join(dataDir, "mapping", "fm_columns.yaml")
	csvPath := filepath.Join(dataDir, "teams.csv")

	mapping, err := loadMapping(mappingPath)
	if err != nil {
		return nil, err
	}

	teams, err := parseTeamsCSV(csvPath, mapping)
	if err != nil {
		return nil, err
	}

	return &Parser{teams: teams}, nil
}

func loadMapping(path string) (ColumnMapping, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return ColumnMapping{}, fmt.Errorf("load mapping: %w", err)
	}
	var m ColumnMapping
	if err := yaml.Unmarshal(data, &m); err != nil {
		return ColumnMapping{}, fmt.Errorf("parse mapping yaml: %w", err)
	}
	return m, nil
}

func parseTeamsCSV(path string, mapping ColumnMapping) (map[string]RawTeam, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open teams csv: %w", err)
	}
	defer f.Close()

	r := csv.NewReader(f)
	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("read teams csv: %w", err)
	}
	if len(records) < 2 {
		return nil, errors.New("teams csv: no data rows")
	}

	header := records[0]
	colIndex, err := resolveColumns(header, mapping)
	if err != nil {
		return nil, err
	}

	teams := make(map[string]RawTeam)
	for _, row := range records[1:] {
		team, err := rowToTeam(row, colIndex)
		if err != nil {
			return nil, err
		}
		teams[team.ID] = team
	}
	return teams, nil
}

type colIndex struct {
	teamID, nameZH, nameEN, iso2, formation int
	fifaRank                                  int
	attack, defense, midfield                 int
	pace, technique, mentality                int
}

func resolveColumns(header []string, mapping ColumnMapping) (colIndex, error) {
	normalized := make(map[string]int)
	for i, h := range header {
		normalized[strings.ToLower(strings.TrimSpace(h))] = i
	}

	resolve := func(field string) (int, error) {
		for _, alias := range mapping.Columns[field] {
			if idx, ok := normalized[strings.ToLower(alias)]; ok {
				return idx, nil
			}
		}
		return -1, fmt.Errorf("%w: %s", ErrMissingColumn, field)
	}

	var idx colIndex
	var err error
	if idx.teamID, err = resolve("team_id"); err != nil {
		return colIndex{}, err
	}
	if idx.nameZH, err = resolve("name_zh"); err != nil {
		return colIndex{}, err
	}
	if idx.nameEN, err = resolve("name_en"); err != nil {
		return colIndex{}, err
	}
	if idx.iso2, err = resolve("iso2"); err != nil {
		return colIndex{}, err
	}
	if idx.fifaRank, err = resolve("fifa_rank"); err != nil {
		return colIndex{}, err
	}
	if idx.attack, err = resolve("attack"); err != nil {
		return colIndex{}, err
	}
	if idx.defense, err = resolve("defense"); err != nil {
		return colIndex{}, err
	}
	if idx.midfield, err = resolve("midfield"); err != nil {
		return colIndex{}, err
	}
	if idx.pace, err = resolve("pace"); err != nil {
		return colIndex{}, err
	}
	if idx.technique, err = resolve("technique"); err != nil {
		return colIndex{}, err
	}
	if idx.mentality, err = resolve("mentality"); err != nil {
		return colIndex{}, err
	}
	if idx.formation, err = resolve("formation"); err != nil {
		return colIndex{}, err
	}
	return idx, nil
}

func rowToTeam(row []string, idx colIndex) (RawTeam, error) {
	get := func(i int) string {
		if i < len(row) {
			return strings.TrimSpace(row[i])
		}
		return ""
	}
	parseFloat := func(field string, i int) (float64, error) {
		v, err := strconv.ParseFloat(get(i), 64)
		if err != nil {
			return 0, fmt.Errorf("parse %s: %w", field, err)
		}
		return v, nil
	}

	rank, err := strconv.Atoi(get(idx.fifaRank))
	if err != nil {
		return RawTeam{}, fmt.Errorf("parse fifa_rank: %w", err)
	}

	attack, err := parseFloat("attack", idx.attack)
	if err != nil {
		return RawTeam{}, err
	}
	defense, err := parseFloat("defense", idx.defense)
	if err != nil {
		return RawTeam{}, err
	}
	midfield, err := parseFloat("midfield", idx.midfield)
	if err != nil {
		return RawTeam{}, err
	}
	pace, err := parseFloat("pace", idx.pace)
	if err != nil {
		return RawTeam{}, err
	}
	technique, err := parseFloat("technique", idx.technique)
	if err != nil {
		return RawTeam{}, err
	}
	mentality, err := parseFloat("mentality", idx.mentality)
	if err != nil {
		return RawTeam{}, err
	}

	return RawTeam{
		ID:        get(idx.teamID),
		NameZH:    get(idx.nameZH),
		NameEN:    get(idx.nameEN),
		ISO2:      strings.ToUpper(get(idx.iso2)),
		FifaRank:  rank,
		Attack:    attack,
		Defense:   defense,
		Midfield:  midfield,
		Pace:      pace,
		Technique: technique,
		Mentality: mentality,
		Formation: get(idx.formation),
	}, nil
}

func (p *Parser) GetTeam(id string) (RawTeam, bool) {
	t, ok := p.teams[id]
	return t, ok
}

func (p *Parser) AllTeams() []RawTeam {
	out := make([]RawTeam, 0, len(p.teams))
	for _, t := range p.teams {
		out = append(out, t)
	}
	return out
}

type PlayerParser struct {
	byTeam map[string][]PlayerRow
}

type PlayerRow struct {
	ID       string
	TeamID   string
	Name     string
	Position string
}

func NewPlayerParser(dataDir string) (*PlayerParser, error) {
	path := filepath.Join(dataDir, "players.csv")
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	r := csv.NewReader(f)
	records, err := r.ReadAll()
	if err != nil {
		return nil, err
	}

	byTeam := make(map[string][]PlayerRow)
	for _, row := range records[1:] {
		if len(row) < 4 {
			continue
		}
		p := PlayerRow{
			ID:       row[0],
			TeamID:   row[1],
			Name:     row[2],
			Position: row[3],
		}
		byTeam[p.TeamID] = append(byTeam[p.TeamID], p)
	}
	return &PlayerParser{byTeam: byTeam}, nil
}

func (p *PlayerParser) PlayersForTeam(teamID string) []PlayerRow {
	return p.byTeam[teamID]
}
