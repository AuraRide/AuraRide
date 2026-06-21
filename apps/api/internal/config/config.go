// Package config centralises env-var loading. Call MustLoad() once at startup;
// pass *Config around instead of calling os.Getenv elsewhere.
package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds every runtime knob the API needs. See plan §12 / ADR-003 §7.
type Config struct {
	Env             string // "development" | "production" | "test"
	Port            string // default "8080"
	PostgresURL     string // pgx-style URL, e.g. postgres://user:pass@host:5432/db?sslmode=disable
	RedisURL        string // redis://[:pass@]host:6379/0
	JWTSecret       string // HS256 secret for SignJWT / ParseJWT
	COSSecretID     string
	COSSecretKey    string
	COSBucket       string // bucket name with appid, e.g. auraride-photos-1315627382
	COSRegion       string // e.g. ap-shanghai
	DashscopeAPIKey string // forwarded to the Python worker (not used inside Go)
	LogLevel        string // "debug" | "info" | "warn" | "error"
	SeedEnabled     bool   // SEED_ENABLED=true triggers seed.RunIfEnabled
}

// MustLoad reads every env var. Required vars missing in production cause a panic;
// in development they fall back to safe locals so `go run ./cmd/api` Just Works.
func MustLoad() *Config {
	env := getOr("ENV", "development")
	cfg := &Config{
		Env:             env,
		Port:            getOr("PORT", "8080"),
		PostgresURL:     getOr("POSTGRES_URL", "postgres://postgres:postgres@localhost:5432/auraride?sslmode=disable"),
		RedisURL:        getOr("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret:       getOr("JWT_SECRET", "dev-secret-change-me"),
		COSSecretID:     os.Getenv("COS_SECRET_ID"),
		COSSecretKey:    os.Getenv("COS_SECRET_KEY"),
		COSBucket:       getOr("COS_BUCKET", "auraride-photos-1315627382"),
		COSRegion:       getOr("COS_REGION", "ap-shanghai"),
		DashscopeAPIKey: os.Getenv("DASHSCOPE_API_KEY"),
		LogLevel:        getOr("LOG_LEVEL", "info"),
		SeedEnabled:     getBool("SEED_ENABLED", false),
	}

	if cfg.Env == "production" {
		// In production these are non-negotiable; fail-fast beats mystery 500s.
		mustNonEmpty("POSTGRES_URL", cfg.PostgresURL)
		mustNonEmpty("REDIS_URL", cfg.RedisURL)
		mustNonEmpty("JWT_SECRET", cfg.JWTSecret)
		mustNonEmpty("COS_SECRET_ID", cfg.COSSecretID)
		mustNonEmpty("COS_SECRET_KEY", cfg.COSSecretKey)
		if cfg.JWTSecret == "dev-secret-change-me" {
			panic("JWT_SECRET must be overridden in production")
		}
	}

	return cfg
}

func getOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getBool(key string, def bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return def
	}
	return b
}

func mustNonEmpty(key, val string) {
	if val == "" {
		panic(fmt.Sprintf("config: required env var %s is empty (ENV=production)", key))
	}
}
