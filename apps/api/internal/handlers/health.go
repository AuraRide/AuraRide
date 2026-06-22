package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/auraride/auraride/apps/api/internal/version"
)

// Healthz is a liveness probe: process is up, that's all it asserts.
func (a *API) Healthz(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"version": version.Version,
	})
}

// Readyz is a readiness probe: can we serve traffic? For MVP we only check
// that we're built and configured — adding a DB ping here is a TODO.
// TODO(post-mvp): ping Postgres + Redis with a 200ms timeout.
func (a *API) Readyz(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"ready": true})
}
