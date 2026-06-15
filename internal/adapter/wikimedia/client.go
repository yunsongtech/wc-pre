package wikimedia

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

const (
	searchBase = "https://en.wikipedia.org/w/rest.php/v1/search/page"
	userAgent  = "wc-pre/1.0 (pxzlin@qq.com)"
	cacheTTL   = 7 * 24 * time.Hour
)

type Client struct {
	httpClient *http.Client
	cache      sync.Map
}

type cacheEntry struct {
	flagURL     string
	wikiSummary string
	expiresAt   time.Time
}

type searchResponse struct {
	Pages []searchPage `json:"pages"`
}

type searchPage struct {
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Thumbnail   *thumbnail `json:"thumbnail"`
}

type thumbnail struct {
	URL string `json:"url"`
}

func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) FetchTeamMedia(ctx context.Context, nameEN string) (flagURL, summary string, err error) {
	key := strings.ToLower(nameEN)
	if entry, ok := c.cache.Load(key); ok {
		e := entry.(cacheEntry)
		if time.Now().Before(e.expiresAt) {
			return e.flagURL, e.wikiSummary, nil
		}
	}

	query := url.Values{}
	query.Set("q", nameEN+" national football team")
	query.Set("limit", "1")

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, searchBase+"?"+query.Encode(), nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("User-Agent", userAgent)

	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
			time.Sleep(time.Duration(attempt+1) * 200 * time.Millisecond)
			continue
		}

		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			lastErr = readErr
			continue
		}

		if resp.StatusCode == 429 || resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("wikimedia status %d", resp.StatusCode)
			time.Sleep(time.Duration(attempt+1) * 300 * time.Millisecond)
			continue
		}

		var data searchResponse
		if err := json.Unmarshal(body, &data); err != nil {
			return "", "", err
		}
		if len(data.Pages) == 0 {
			c.cache.Store(key, cacheEntry{expiresAt: time.Now().Add(cacheTTL)})
			return "", "", nil
		}

		page := data.Pages[0]
		if page.Thumbnail != nil {
			flagURL = page.Thumbnail.URL
		}
		summary = page.Description

		c.cache.Store(key, cacheEntry{
			flagURL:     flagURL,
			wikiSummary: summary,
			expiresAt:   time.Now().Add(cacheTTL),
		})
		return flagURL, summary, nil
	}
	return "", "", lastErr
}
