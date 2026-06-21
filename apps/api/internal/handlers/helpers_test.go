package handlers_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/auraride/auraride/apps/api/internal/config"
	"github.com/auraride/auraride/apps/api/internal/handlers"
)

func init() { gin.SetMode(gin.TestMode) }

// buildAPI wires a fresh API + engine for a test, optionally with a stub COS
// and stub queue.
func buildAPI(t *testing.T, store *stubStore, opts ...buildOpt) (*gin.Engine, *handlers.API) {
	t.Helper()
	api := &handlers.API{
		Store: store,
		Cfg:   testConfig(),
		Clock: func() time.Time { return time.UnixMilli(1_718_500_000_000) },
	}
	for _, o := range opts {
		o(api)
	}
	r := gin.New()
	api.Register(r)
	return r, api
}

type buildOpt func(*handlers.API)

func withCOS(c *stubCOS) buildOpt    { return func(a *handlers.API) { a.COS = c } }
func withQueue(q *stubPusher) buildOpt { return func(a *handlers.API) { a.Queue = q } }

func testConfig() *config.Config {
	return &config.Config{
		Env: "test", Port: "0", JWTSecret: "test",
		COSBucket: "auraride-test", COSRegion: "ap-shanghai",
	}
}

func doJSON(t *testing.T, r http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal req body: %v", err)
		}
		bodyReader = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, bodyReader)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

func decode[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(rec.Body.Bytes(), &v); err != nil {
		t.Fatalf("decode response: %v (body=%s)", err, rec.Body.String())
	}
	return v
}
