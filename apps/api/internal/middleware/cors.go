// Package middleware groups cross-cutting gin handlers. Auth lives on the API
// struct (handlers.handlers.go) because it needs cfg.JWTSecret.
package middleware

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// CORS returns a permissive policy in dev (so Vite on :5173 can hit :8080)
// and a strict allow-list in production.
func CORS(env string) gin.HandlerFunc {
	if env == "production" {
		return cors.New(cors.Config{
			AllowOrigins:     []string{"https://auraride.cn", "https://www.auraride.cn"},
			AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowHeaders:     []string{"Authorization", "Content-Type"},
			AllowCredentials: true,
			MaxAge:           12 * time.Hour,
		})
	}
	return cors.New(cors.Config{
		AllowOriginFunc:  func(string) bool { return true },
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	})
}
