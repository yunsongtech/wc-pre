package config

import (
	"os"
	"strconv"
)

type Config struct {
	Addr              string
	DataDir           string
	DeepSeekAPIKey    string
	DeepSeekBaseURL   string
	DeepSeekModel     string
	MockLive          bool
	AlarmDebugClock   string
	HAWebhookURL      string
	HAToken           string
	AliyunAccessKeyID string
	AliyunAccessSecret string
	CORSOrigins       []string
}

func Load() Config {
	mockLive := true
	if v := os.Getenv("MOCK_LIVE"); v == "false" {
		mockLive = false
	}

	return Config{
		Addr:              envOr("ADDR", ":8080"),
		DataDir:           envOr("DATA_DIR", "data"),
		DeepSeekAPIKey:    os.Getenv("DEEPSEEK_API_KEY"),
		DeepSeekBaseURL:   envOr("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
		DeepSeekModel:     envOr("DEEPSEEK_MODEL", "deepseek-chat"),
		MockLive:          mockLive,
		AlarmDebugClock:   os.Getenv("ALARM_DEBUG_CLOCK"),
		HAWebhookURL:      os.Getenv("HA_WEBHOOK_URL"),
		HAToken:           os.Getenv("HA_TOKEN"),
		AliyunAccessKeyID: os.Getenv("ALIYUN_ACCESS_KEY_ID"),
		AliyunAccessSecret: os.Getenv("ALIYUN_ACCESS_KEY_SECRET"),
		CORSOrigins:       []string{"http://localhost:3000", "http://127.0.0.1:3000"},
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func ParsePort(addr string) int {
	if len(addr) > 0 && addr[0] == ':' {
		if p, err := strconv.Atoi(addr[1:]); err == nil {
			return p
		}
	}
	return 8080
}
