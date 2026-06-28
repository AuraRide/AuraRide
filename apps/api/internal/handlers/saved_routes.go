package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/auraride/auraride/apps/api/internal/models"
)

type saveFromPostBody struct {
	PostID string `json:"postId" binding:"required"`
}

// ListSavedRoutes → []SavedRouteJSON for the current user.
func (a *API) ListSavedRoutes(c *gin.Context) {
	uid := userID(c)
	rows, err := a.Store.ListSavedRoutes(c.Request.Context(), uid)
	if mapStoreErr(c, err) {
		return
	}
	out := make([]models.SavedRouteJSON, len(rows))
	for i, r := range rows {
		out[i] = r.ToJSON()
	}
	c.JSON(http.StatusOK, out)
}

// SaveRouteFromPost copies one 广场 post into the user's 待出行路线 list. The
// route-shape + cover + city come from the source post; the front end will
// replan a fresh real route of that length at ride-time.
func (a *API) SaveRouteFromPost(c *gin.Context) {
	uid := userID(c)
	var body saveFromPostBody
	if err := c.ShouldBindJSON(&body); err != nil {
		sendError(c, http.StatusBadRequest, "bad_request", "invalid body: "+err.Error())
		return
	}
	post, err := a.Store.GetPost(c.Request.Context(), uid, body.PostID)
	if err != nil {
		mapStoreErr(c, err)
		return
	}
	fromID := post.ID
	sr := models.SavedRoute{
		ID:          "sr-" + randomID(),
		UserID:      uid,
		FromPostID:  &fromID,
		ColorID:     post.ColorID,
		City:        post.City,
		DistanceKm:  post.DistanceKm,
		DurationMin: post.DurationMin,
		RouteShape:  post.RouteShape,
		CoverColor:  post.CoverColor,
		Caption:     post.Caption,
		SavedAt:     a.now().UnixMilli(),
	}
	saved, err := a.Store.InsertSavedRoute(c.Request.Context(), sr)
	if err != nil {
		mapStoreErr(c, err)
		return
	}
	c.JSON(http.StatusOK, saved.ToJSON())
}

// RemoveSavedRoute → 204 / 404.
func (a *API) RemoveSavedRoute(c *gin.Context) {
	uid := userID(c)
	id := c.Param("id")
	if err := a.Store.DeleteSavedRoute(c.Request.Context(), uid, id); err != nil {
		mapStoreErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// SavedRouteIds → []string — the from_post_id list for marking 已收藏 badges
// on post cards. Cheap to call on every Plaza render.
func (a *API) SavedRouteIds(c *gin.Context) {
	uid := userID(c)
	ids, err := a.Store.ListSavedPostIds(c.Request.Context(), uid)
	if mapStoreErr(c, err) {
		return
	}
	if ids == nil {
		ids = []string{}
	}
	c.JSON(http.StatusOK, ids)
}
