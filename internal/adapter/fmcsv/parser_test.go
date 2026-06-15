package fmcsv

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParserCanonical(t *testing.T) {
	dir := filepath.Join("..", "..", "..", "data")
	if _, err := os.Stat(dir); err != nil {
		t.Skip("data dir not available")
	}
	p, err := NewParser(dir)
	if err != nil {
		t.Fatal(err)
	}
	team, ok := p.GetTeam("ARG")
	if !ok {
		t.Fatal("ARG not found")
	}
	if team.FifaRank != 1 {
		t.Fatalf("fifa rank = %d", team.FifaRank)
	}
}

func TestParserColumnMapping(t *testing.T) {
	dir := t.TempDir()
	mappingDir := filepath.Join(dir, "mapping")
	if err := os.MkdirAll(mappingDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(mappingDir, "fm_columns.yaml"), []byte(`columns:
  team_id: ["Team ID"]
  name_zh: ["Name"]
  name_en: ["English Name"]
  iso2: ["ISO2"]
  fifa_rank: ["World Ranking"]
  attack: ["Att"]
  defense: ["Def"]
  midfield: ["Mid"]
  pace: ["Pac"]
  technique: ["Tec"]
  mentality: ["Men"]
  formation: ["Formation"]
`), 0o644); err != nil {
		t.Fatal(err)
	}
	csv := `Team ID,Name,English Name,ISO2,World Ranking,Att,Def,Mid,Pac,Tec,Men,Formation
TST,测试,Testland,TL,5,80,80,80,80,80,80,4-4-2
`
	if err := os.WriteFile(filepath.Join(dir, "teams.csv"), []byte(csv), 0o644); err != nil {
		t.Fatal(err)
	}
	p, err := NewParser(dir)
	if err != nil {
		t.Fatal(err)
	}
	team, ok := p.GetTeam("TST")
	if !ok || team.NameZH != "测试" {
		t.Fatalf("unexpected team: %+v ok=%v", team, ok)
	}
}

func TestMissingColumn(t *testing.T) {
	dir := t.TempDir()
	mappingDir := filepath.Join(dir, "mapping")
	_ = os.MkdirAll(mappingDir, 0o755)
	_ = os.WriteFile(filepath.Join(mappingDir, "fm_columns.yaml"), []byte("columns:\n  team_id: [\"id\"]\n"), 0o644)
	_ = os.WriteFile(filepath.Join(dir, "teams.csv"), []byte("id,name\nX,Y\n"), 0o644)
	_, err := NewParser(dir)
	if err == nil {
		t.Fatal("expected missing column error")
	}
}
