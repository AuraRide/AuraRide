// Package handlers wires HTTP -> Store. Each handler is small and only does
// JSON in / call store / JSON out + error mapping. No business logic lives here
// beyond auth scoping (taking userID from context).
package handlers

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/auraride/auraride/apps/api/internal/auth"
	"github.com/auraride/auraride/apps/api/internal/config"
	"github.com/auraride/auraride/apps/api/internal/cos"
	"github.com/auraride/auraride/apps/api/internal/models"
	"github.com/auraride/auraride/apps/api/internal/queue"
	"github.com/auraride/auraride/apps/api/internal/store"
)

// Querier is the data-access surface the API needs. It is satisfied by *store.Store
// and by test stubs — that is why every handler depends on Querier (not Store)
// and we can run the full handler suite without Postgres.
type Querier interface {
	// rides
	ListRides(ctx context.Context, userID string) ([]models.Ride, error)
	GetRide(ctx context.Context, userID, id string) (*models.Ride, error)
	UpsertRide(ctx context.Context, userID string, r models.Ride) error
	DeleteRide(ctx context.Context, userID, id string) error
	ReplaceAll(ctx context.Context, userID string, rides []models.Ride) error

	// account
	GetUser(ctx context.Context, id string) (*models.User, error)

	// posts
	InsertPost(ctx context.Context, p models.Post) error
	GetPost(ctx context.Context, viewerID, id string) (*models.Post, error)
	ListFeed(ctx context.Context, viewerID string, filter store.FeedFilter) ([]models.Post, error)
	IsPublished(ctx context.Context, rideID string) (bool, error)
	ToggleLike(ctx context.Context, userID, postID string) (*models.Post, error)
	DeletePost(ctx context.Context, userID, id string) error

	// comments
	ListComments(ctx context.Context, postID string) ([]models.Comment, error)
	InsertComment(ctx context.Context, c models.Comment) (*models.Comment, error)
	CommentCounts(ctx context.Context) (map[string]int, error)

	// saved_routes (待出行路线 — routes copied from posts, planned but not ridden)
	ListSavedRoutes(ctx context.Context, userID string) ([]models.SavedRoute, error)
	InsertSavedRoute(ctx context.Context, r models.SavedRoute) (*models.SavedRoute, error)
	DeleteSavedRoute(ctx context.Context, userID, id string) error
	ListSavedPostIds(ctx context.Context, userID string) ([]string, error)

	// photos
	InsertPhoto(ctx context.Context, p models.Photo) error
}

// API is the handler container. Construct once at startup, hand its Register
// method a *gin.Engine.
type API struct {
	Store  Querier
	Cfg    *config.Config
	COS    cos.PresignClient
	Queue  queue.Pusher
	// Clock lets tests fix time. Default = time.Now.
	Clock func() time.Time
}

// New constructs an API with the standard wall-clock and a real RedisPusher
// from the underlying Store if it has one.
func New(s *store.Store, cfg *config.Config, c cos.PresignClient) *API {
	return &API{
		Store: s, Cfg: cfg, COS: c,
		Queue: queue.NewRedisPusher(s.RDB),
		Clock: time.Now,
	}
}

// now is the only time source handlers should use.
func (a *API) now() time.Time {
	if a.Clock == nil {
		return time.Now()
	}
	return a.Clock()
}

// userID extracts the auth-injected user id; safety net returns "me".
func userID(c *gin.Context) string {
	if v, ok := c.Get("userID"); ok {
		if s, ok := v.(string); ok && s != "" {
			return s
		}
	}
	return "me"
}

// errorJSON shapes the response body. Plan §5: {"error":"code","message":"..."}.
type errorJSON struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

func sendError(c *gin.Context, status int, code, msg string) {
	c.JSON(status, errorJSON{Error: code, Message: msg})
}

func mapStoreErr(c *gin.Context, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, store.ErrNotFound) {
		sendError(c, http.StatusNotFound, "not_found", "resource not found")
		return true
	}
	sendError(c, http.StatusInternalServerError, "internal", err.Error())
	return true
}

// Register attaches every endpoint to r. Health endpoints stay outside the
// /api group (no auth middleware) so load balancers can probe cheaply.
func (a *API) Register(r *gin.Engine) {
	r.GET("/healthz", a.Healthz)
	r.GET("/readyz", a.Readyz)

	api := r.Group("/api")
	api.Use(a.AuthMiddleware())
	{
		api.GET("/rides", a.ListRides)
		api.GET("/rides/:id", a.GetRide)
		api.POST("/rides", a.SaveRide)
		api.DELETE("/rides/:id", a.DeleteRide)
		api.PUT("/rides", a.ReplaceAll)

		api.GET("/me", a.Me)

		api.POST("/posts", a.PublishRide)
		api.GET("/posts/published/:rideId", a.IsPublished)
		api.GET("/posts/comment-counts", a.CommentCounts) // BEFORE /posts/:id so gin doesn't bind "comment-counts" as :id
		api.GET("/posts", a.ListFeed)
		api.GET("/posts/:id", a.GetPost)
		api.DELETE("/posts/:id", a.DeletePost)
		api.POST("/posts/:id/like", a.ToggleLike)

		api.GET("/posts/:id/comments", a.ListComments)
		api.POST("/posts/:id/comments", a.AddComment)

		api.GET("/saved-routes", a.ListSavedRoutes)
		api.POST("/saved-routes", a.SaveRouteFromPost)
		api.GET("/saved-routes/ids", a.SavedRouteIds)
		api.DELETE("/saved-routes/:id", a.RemoveSavedRoute)

		api.POST("/photos/sts", a.PhotoSTS)
		api.POST("/photos/commit", a.PhotoCommit)
	}
}

// AuthMiddleware extracts JWT or falls back to the "me" user (plan §7).
// Kept on API so handlers can read a.Cfg.JWTSecret.
func (a *API) AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		hdr := c.GetHeader("Authorization")
		if len(hdr) > 7 && hdr[:7] == "Bearer " {
			if claims, err := auth.ParseJWT(hdr[7:], a.Cfg.JWTSecret); err == nil {
				c.Set("userID", claims.UserID)
				c.Next()
				return
			}
			// Bad token → unauthenticated, but keep going as "me" so the front
			// end (which doesn't auth yet) isn't blocked.
			// TODO(post-mvp): return 401 once login is real.
		}
		c.Set("userID", "me")
		c.Next()
	}
}
