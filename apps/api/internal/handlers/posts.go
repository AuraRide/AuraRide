package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/auraride/auraride/apps/api/internal/models"
	"github.com/auraride/auraride/apps/api/internal/store"
)

type publishBody struct {
	RideID  string `json:"rideId" binding:"required"`
	City    string `json:"city"   binding:"required"`
	Caption string `json:"caption"`
}

// PublishRide turns one of the caller's rides into a public post. The cover
// colour, route shape, photo URLs and basic stats come from the ride itself —
// the body only carries the social-context bits (city + caption).
func (a *API) PublishRide(c *gin.Context) {
	uid := userID(c)
	var body publishBody
	if err := c.ShouldBindJSON(&body); err != nil {
		sendError(c, http.StatusBadRequest, "bad_request", "invalid publish body: "+err.Error())
		return
	}
	ride, err := a.Store.GetRide(c.Request.Context(), uid, body.RideID)
	if err != nil {
		mapStoreErr(c, err)
		return
	}

	photoURLs := make([]string, 0, len(ride.Photos))
	for _, p := range ride.Photos {
		if p.COSURL != "" {
			photoURLs = append(photoURLs, p.COSURL)
		}
		if len(photoURLs) >= 6 {
			break
		}
	}

	var cap *string
	if body.Caption != "" {
		s := body.Caption
		cap = &s
	}
	durMin := ride.Duration / 60
	if durMin < 1 {
		durMin = 1
	}

	post := models.Post{
		ID:          "post-" + ride.ID,
		RideID:      ride.ID,
		AuthorID:    uid,
		ColorID:     ride.ColorID,
		City:        body.City,
		DistanceKm:  ride.Distance,
		DurationMin: durMin,
		MoodText:    ride.MoodText,
		Caption:     cap,
		CoverColor:  ride.DominantColor,
		RouteShape:  shapeFromSeed(seedFromID(ride.ID), 14),
		PhotoURLs:   photoURLs,
		Likes:       0,
		PublishedAt: a.now().UnixMilli(),
	}
	if err := a.Store.InsertPost(c.Request.Context(), post); err != nil {
		mapStoreErr(c, err)
		return
	}
	// Re-fetch so author + likedByMe are filled the same way GetPost would.
	out, err := a.Store.GetPost(c.Request.Context(), uid, post.ID)
	if err != nil {
		mapStoreErr(c, err)
		return
	}
	c.JSON(http.StatusOK, out.ToJSON())
}

// IsPublished → {"published": bool}.
func (a *API) IsPublished(c *gin.Context) {
	rideID := c.Param("rideId")
	ok, err := a.Store.IsPublished(c.Request.Context(), rideID)
	if mapStoreErr(c, err) {
		return
	}
	c.JSON(http.StatusOK, gin.H{"published": ok})
}

// ListFeed → []PostJSON, optionally filtered.
func (a *API) ListFeed(c *gin.Context) {
	uid := userID(c)
	filter := store.FeedFilter{
		ColorID: c.Query("colorId"),
		City:    c.Query("city"),
		Sort:    c.Query("sort"),
	}
	posts, err := a.Store.ListFeed(c.Request.Context(), uid, filter)
	if mapStoreErr(c, err) {
		return
	}
	out := make([]models.PostJSON, len(posts))
	for i, p := range posts {
		out[i] = p.ToJSON()
	}
	c.JSON(http.StatusOK, out)
}

// GetPost → PostJSON / 404.
func (a *API) GetPost(c *gin.Context) {
	uid := userID(c)
	id := c.Param("id")
	p, err := a.Store.GetPost(c.Request.Context(), uid, id)
	if err != nil {
		mapStoreErr(c, err)
		return
	}
	c.JSON(http.StatusOK, p.ToJSON())
}

// DeletePost removes one of the caller's own posts. Returns 204 on success
// or 404 when the post isn't found OR isn't owned by the caller (no leak).
func (a *API) DeletePost(c *gin.Context) {
	uid := userID(c)
	id := c.Param("id")
	if err := a.Store.DeletePost(c.Request.Context(), uid, id); err != nil {
		mapStoreErr(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// ToggleLike flips the like state and returns the resulting post (front end
// expects the full PostJSON back — see rideRepo.ts).
func (a *API) ToggleLike(c *gin.Context) {
	uid := userID(c)
	id := c.Param("id")
	p, err := a.Store.ToggleLike(c.Request.Context(), uid, id)
	if err != nil {
		mapStoreErr(c, err)
		return
	}
	c.JSON(http.StatusOK, p.ToJSON())
}

// ── shape helpers ────────────────────────────────────────────────────
// shapeFromSeed is a port of the front-end function (rideRepo.ts §107) so
// posts published via the API look identical to the ones the offline-demo
// flow draws.

func shapeFromSeed(seed int64, n int) [][2]float64 {
	pts := make([][2]float64, 0, n)
	a := uint32(seed)
	rnd := func() float64 {
		a = a*1664525 + 1013904223
		return float64(a) / 4294967296.0
	}
	x := 0.18 + rnd()*0.1
	y := 0.9
	for i := 0; i < n; i++ {
		pts = append(pts, [2]float64{x, y})
		x += (rnd() - 0.45) * 0.16
		y -= 0.86 / float64(n)
		if x < 0.08 {
			x = 0.08
		} else if x > 0.92 {
			x = 0.92
		}
	}
	return pts
}

// seedFromID derives a stable int seed from an arbitrary ride id (the front
// end uses parseInt(id.slice(-6)) — we mimic that with a tail-digit walk).
func seedFromID(id string) int64 {
	var n int64
	for i := len(id); i > 0 && i > len(id)-6; i-- {
		ch := id[i-1]
		if ch >= '0' && ch <= '9' {
			n = n*10 + int64(ch-'0')
		}
	}
	if n == 0 {
		return 7
	}
	return n
}
