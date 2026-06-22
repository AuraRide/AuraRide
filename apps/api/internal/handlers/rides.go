package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/auraride/auraride/apps/api/internal/models"
)

// ListRides → []RideJSON. Empty list (not null) when the user has no rides.
func (a *API) ListRides(c *gin.Context) {
	uid := userID(c)
	rides, err := a.Store.ListRides(c.Request.Context(), uid)
	if mapStoreErr(c, err) {
		return
	}
	out := make([]models.RideJSON, len(rides))
	for i, r := range rides {
		out[i] = r.ToJSON()
	}
	c.JSON(http.StatusOK, out)
}

// GetRide → RideJSON / 404.
func (a *API) GetRide(c *gin.Context) {
	uid := userID(c)
	id := c.Param("id")
	r, err := a.Store.GetRide(c.Request.Context(), uid, id)
	if mapStoreErr(c, err) {
		return
	}
	c.JSON(http.StatusOK, r.ToJSON())
}

// SaveRide accepts a full RideJSON body. Used by both the legacy
// (localStorage-shaped) save path and the new server-first path.
func (a *API) SaveRide(c *gin.Context) {
	uid := userID(c)
	var body models.RideJSON
	if err := c.ShouldBindJSON(&body); err != nil {
		sendError(c, http.StatusBadRequest, "bad_request", "invalid ride body: "+err.Error())
		return
	}
	if body.ID == "" {
		sendError(c, http.StatusBadRequest, "bad_request", "ride.id is required")
		return
	}
	ride := models.FromRideJSON(body, uid)
	if err := a.Store.UpsertRide(c.Request.Context(), uid, ride); err != nil {
		mapStoreErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "id": body.ID})
}

// DeleteRide → 204.
func (a *API) DeleteRide(c *gin.Context) {
	uid := userID(c)
	id := c.Param("id")
	if err := a.Store.DeleteRide(c.Request.Context(), uid, id); err != nil {
		mapStoreErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ReplaceAll body = []RideJSON; tx-replaces the user's whole ride list.
func (a *API) ReplaceAll(c *gin.Context) {
	uid := userID(c)
	var body []models.RideJSON
	if err := c.ShouldBindJSON(&body); err != nil {
		sendError(c, http.StatusBadRequest, "bad_request", "invalid rides body: "+err.Error())
		return
	}
	rides := make([]models.Ride, len(body))
	for i, j := range body {
		rides[i] = models.FromRideJSON(j, uid)
	}
	if err := a.Store.ReplaceAll(c.Request.Context(), uid, rides); err != nil {
		mapStoreErr(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "count": len(rides)})
}
