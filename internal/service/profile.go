package service

import (
	"context"
	"fmt"

	"github.com/pxzlin/wc-pre/internal/adapter"
	"github.com/pxzlin/wc-pre/internal/domain"
)

type ProfileService struct {
	registry *adapter.Registry
	matches  *adapter.MatchStore
}

func NewProfileService(registry *adapter.Registry, matches *adapter.MatchStore) *ProfileService {
	return &ProfileService{registry: registry, matches: matches}
}

func (s *ProfileService) GetTeamProfile(ctx context.Context, teamID string) (domain.TeamProfile, error) {
	return s.registry.BuildTeamProfile(ctx, teamID)
}

func (s *ProfileService) ListMatches(ctx context.Context) ([]domain.MatchContext, error) {
	records := s.matches.All()
	out := make([]domain.MatchContext, 0, len(records))
	for _, rec := range records {
		ctxMatch, err := s.registry.BuildMatchContext(ctx, rec)
		if err != nil {
			return nil, err
		}
		out = append(out, ctxMatch)
	}
	return out, nil
}

func (s *ProfileService) GetMatch(ctx context.Context, matchID string) (domain.MatchContext, error) {
	rec, ok := s.matches.Get(matchID)
	if !ok {
		return domain.MatchContext{}, fmt.Errorf("match not found: %s", matchID)
	}
	return s.registry.BuildMatchContext(ctx, rec)
}

func (s *ProfileService) GetMatchRecord(matchID string) (domain.MatchRecord, bool) {
	return s.matches.Get(matchID)
}

func (s *ProfileService) Registry() *adapter.Registry {
	return s.registry
}
