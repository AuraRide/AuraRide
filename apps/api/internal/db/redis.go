package db

import (
	"fmt"

	"github.com/redis/go-redis/v9"
)

// OpenRedis parses redis://host:port/db URLs and returns a configured client.
// Caller is responsible for Ping + Close.
func OpenRedis(url string) *redis.Client {
	if url == "" {
		// go-redis would panic on empty url; surface a clearer error via a stub
		// client that errors on every command (caller's Ping will fail fast).
		panic(fmt.Errorf("redis: empty REDIS_URL"))
	}
	opt, err := redis.ParseURL(url)
	if err != nil {
		panic(fmt.Errorf("redis: parse url: %w", err))
	}
	return redis.NewClient(opt)
}
