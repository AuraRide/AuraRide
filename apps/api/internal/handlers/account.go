package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/auraride/auraride/apps/api/internal/models"
)

// Me returns the current user's public profile. Falls back to a synthetic "me"
// row when the user record is absent (dev / first run before seed) so the
// front end never sees a 404 from /api/me.
func (a *API) Me(c *gin.Context) {
	uid := userID(c)
	u, err := a.Store.GetUser(c.Request.Context(), uid)
	if err != nil {
		// soft fallback — front end expects a body, not an error.
		c.JSON(http.StatusOK, models.PublicUserJSON{
			ID: uid, Handle: "我",
			AvatarColor: "#3a2817", DominantColorID: "explore-yellow",
		})
		return
	}
	c.JSON(http.StatusOK, u.ToPublicJSON())
}
