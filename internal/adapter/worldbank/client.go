package worldbank

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const (
	baseURL       = "https://api.worldbank.org/v2"
	userAgent     = "wc-pre/1.0 (pxzlin@qq.com)"
	gdpIndicator  = "NY.GDP.MKTP.CD"
	popIndicator  = "SP.POP.TOTL"
	cacheTTL      = 24 * time.Hour
)

type Client struct {
	httpClient *http.Client
	fixtureDir string
	cache      sync.Map
}

type cacheEntry struct {
	gdp        float64
	population float64
	expiresAt  time.Time
}

type indicatorResponse []json.RawMessage

type indicatorMeta struct {
	Page    int `json:"page"`
	Pages   int `json:"pages"`
	PerPage int `json:"per_page"`
	Total   int `json:"total"`
}

type indicatorValue struct {
	Value float64 `json:"value"`
	Date  string  `json:"date"`
}

func NewClient(fixtureDir string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 10 * time.Second},
		fixtureDir: fixtureDir,
	}
}

func (c *Client) FetchMacro(ctx context.Context, iso2 string) (gdp, population float64, err error) {
	key := strings.ToUpper(iso2)
	if entry, ok := c.cache.Load(key); ok {
		e := entry.(cacheEntry)
		if time.Now().Before(e.expiresAt) {
			return e.gdp, e.population, nil
		}
	}

	gdp, err = c.fetchIndicator(ctx, iso2, gdpIndicator, "gdp")
	if err != nil {
		return 0, 0, err
	}
	population, err = c.fetchIndicator(ctx, iso2, popIndicator, "pop")
	if err != nil {
		return 0, 0, err
	}

	c.cache.Store(key, cacheEntry{
		gdp:        gdp,
		population: population,
		expiresAt:  time.Now().Add(cacheTTL),
	})
	return gdp, population, nil
}

func (c *Client) fetchIndicator(ctx context.Context, iso2, indicator, fixtureSuffix string) (float64, error) {
	if c.fixtureDir != "" {
		fixturePath := filepath.Join(c.fixtureDir, fmt.Sprintf("%s_%s.json", strings.ToUpper(iso2), fixtureSuffix))
		if data, err := os.ReadFile(fixturePath); err == nil {
			return parseIndicatorValue(data)
		}
	}

	url := fmt.Sprintf("%s/country/%s/indicator/%s?format=json&date=2024:2024&per_page=1",
		baseURL, strings.ToLower(iso2), indicator)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	req.Header.Set("User-Agent", userAgent)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}
	if resp.StatusCode >= 400 {
		return 0, fmt.Errorf("worldbank status %d", resp.StatusCode)
	}
	return parseIndicatorValue(body)
}

func parseIndicatorValue(body []byte) (float64, error) {
	var raw indicatorResponse
	if err := json.Unmarshal(body, &raw); err != nil {
		return 0, err
	}
	if len(raw) < 2 {
		return 0, fmt.Errorf("worldbank: unexpected response")
	}
	var values []indicatorValue
	if err := json.Unmarshal(raw[1], &values); err != nil {
		return 0, err
	}
	if len(values) == 0 || values[0].Value == 0 {
		return 0, fmt.Errorf("worldbank: no value")
	}
	return values[0].Value, nil
}

func NormalizeMacroScores(gdps []float64) []float64 {
	if len(gdps) == 0 {
		return nil
	}
	min, max := gdps[0], gdps[0]
	for _, g := range gdps {
		if g < min {
			min = g
		}
		if g > max {
			max = g
		}
	}
	out := make([]float64, len(gdps))
	if max == min {
		for i := range out {
			out[i] = 50
		}
		return out
	}
	for i, g := range gdps {
		out[i] = (g - min) / (max - min) * 100
	}
	return out
}
