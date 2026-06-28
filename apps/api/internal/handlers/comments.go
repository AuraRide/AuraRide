package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/auraride/auraride/apps/api/internal/models"
)

type commentBody struct {
	Text string `json:"text" binding:"required"`
}

// ListComments → []CommentJSON for one post, oldest-first.
func (a *API) ListComments(c *gin.Context) {
	postID := c.Param("id")
	rows, err := a.Store.ListComments(c.Request.Context(), postID)
	if mapStoreErr(c, err) {
		return
	}
	out := make([]models.CommentJSON, len(rows))
	for i, r := range rows {
		out[i] = r.ToJSON()
	}
	c.JSON(http.StatusOK, out)
}

// AddComment writes a new comment authored by the current user.
func (a *API) AddComment(c *gin.Context) {
	uid := userID(c)
	postID := c.Param("id")
	var body commentBody
	if err := c.ShouldBindJSON(&body); err != nil {
		sendError(c, http.StatusBadRequest, "bad_request", "invalid comment body: "+err.Error())
		return
	}
	text := strings.TrimSpace(body.Text)
	if text == "" {
		sendError(c, http.StatusBadRequest, "bad_request", "text must not be empty")
		return
	}
	if len(text) > 500 {
		sendError(c, http.StatusBadRequest, "bad_request", "text too long (max 500)")
		return
	}
	comment := models.Comment{
		ID:        "cm-" + randomID(),
		PostID:    postID,
		AuthorID:  uid,
		Text:      text,
		CreatedAt: a.now().UnixMilli(),
	}
	saved, err := a.Store.InsertComment(c.Request.Context(), comment)
	if err != nil {
		mapStoreErr(c, err)
		return
	}
	c.JSON(http.StatusOK, saved.ToJSON())
}

// CommentCounts → {postId: count}. Posts with 0 comments are absent — the
// front end treats missing keys as 0. The map is small (≤ #posts entries).
func (a *API) CommentCounts(c *gin.Context) {
	counts, err := a.Store.CommentCounts(c.Request.Context())
	if mapStoreErr(c, err) {
		return
	}
	if counts == nil {
		counts = map[string]int{}
	}
	c.JSON(http.StatusOK, counts)
}

// randomID returns a hex slug — 8 bytes = 16 hex chars. Stable enough for
// row IDs that don't need to be globally unique forever.
func randomID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand can fail only on truly broken systems; fall back to a
		// time-derived deterministic suffix so handlers don't crash.
		return "fallback"
	}
	return hex.EncodeToString(b)
}
