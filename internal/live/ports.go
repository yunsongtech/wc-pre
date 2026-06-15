package live

import (
	"context"
	"errors"

	"github.com/pxzlin/wc-pre/internal/domain"
)

var ErrNotConfigured = errors.New("live feed adapter not configured")

type LiveFeedAdapter interface {
	Subscribe(ctx context.Context, matchID string) (<-chan domain.LiveEvent, error)
}

type NanoDataFeed struct{}

func (n *NanoDataFeed) Subscribe(ctx context.Context, matchID string) (<-chan domain.LiveEvent, error) {
	return nil, ErrNotConfigured
}
