// Package testutil holds shared helpers for the handler test suite.
package testutil

import (
	"net/http/httptest"

	"github.com/gin-gonic/gin"

	"github.com/auraride/auraride/apps/api/internal/config"
	"github.com/auraride/auraride/apps/api/internal/handlers"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// Config returns a minimal config suitable for handler tests.
func Config() *config.Config {
	return &config.Config{
		Env:       "test",
		Port:      "0",
		JWTSecret: "test-secret",
		COSBucket: "auraride-test",
		COSRegion: "ap-shanghai",
	}
}

// Engine builds a gin engine wired up with the supplied API. It does NOT
// install CORS / Logger middleware — those are exercised separately if at all.
func Engine(api *handlers.API) *gin.Engine {
	r := gin.New()
	api.Register(r)
	return r
}

// Record is a one-line shortcut for httptest recorder.
func Record() *httptest.ResponseRecorder { return httptest.NewRecorder() }
