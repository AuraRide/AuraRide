package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/auraride/auraride/apps/api/internal/models"
)

type stsBody struct {
	RideID      string `json:"rideId"      binding:"required"`
	ContentType string `json:"contentType"`
}

type stsResp struct {
	PhotoID   string `json:"photoId"`
	UploadURL string `json:"uploadUrl"`
	COSKey    string `json:"cosKey"`
	COSURL    string `json:"cosUrl"`
}

// PhotoSTS is step 1 of the 3-step upload flow (plan §6). Returns a presigned
// PUT URL the front end uploads to directly — bytes never touch our ECS.
func (a *API) PhotoSTS(c *gin.Context) {
	uid := userID(c)
	var body stsBody
	if err := c.ShouldBindJSON(&body); err != nil {
		sendError(c, http.StatusBadRequest, "bad_request", "invalid sts body: "+err.Error())
		return
	}
	// Verify the ride is the caller's.
	if _, err := a.Store.GetRide(c.Request.Context(), uid, body.RideID); err != nil {
		mapStoreErr(c, err)
		return
	}
	if a.COS == nil {
		sendError(c, http.StatusServiceUnavailable, "cos_unavailable", "COS client not configured")
		return
	}
	pid := uuid.NewString()
	key := "rides/" + body.RideID + "/" + pid + ".jpg"
	contentType := body.ContentType
	if contentType == "" {
		contentType = "image/jpeg"
	}
	uploadURL, err := a.COS.PresignPut(c.Request.Context(), key, contentType, 10*time.Minute)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "presign_failed", err.Error())
		return
	}
	c.JSON(http.StatusOK, stsResp{
		PhotoID: pid, UploadURL: uploadURL,
		COSKey: key, COSURL: a.COS.PublicURL(key),
	})
}

type commitBody struct {
	PhotoID       string  `json:"photoId"       binding:"required"`
	RideID        string  `json:"rideId"        binding:"required"`
	COSKey        string  `json:"cosKey"        binding:"required"`
	COSURL        string  `json:"cosUrl"        binding:"required"`
	TakenAt       int64   `json:"takenAt"`
	Caption       *string `json:"caption,omitempty"`
	FallbackColor string  `json:"fallbackColor"`
}

// PhotoCommit is step 3 of the 3-step upload flow: row goes into ride_photos
// with vlm_status='pending', then we LPUSH a job for the Python worker to
// re-colour it asynchronously. Returns the row as PhotoJSON so the front end
// can render immediately with the fallback colour.
func (a *API) PhotoCommit(c *gin.Context) {
	uid := userID(c)
	var body commitBody
	if err := c.ShouldBindJSON(&body); err != nil {
		sendError(c, http.StatusBadRequest, "bad_request", "invalid commit body: "+err.Error())
		return
	}
	// Auth scope check on the ride.
	ride, err := a.Store.GetRide(c.Request.Context(), uid, body.RideID)
	if err != nil {
		mapStoreErr(c, err)
		return
	}
	color := body.FallbackColor
	if color == "" {
		color = "#888888"
	}
	photo := models.Photo{
		ID:         body.PhotoID,
		RideID:     ride.ID,
		COSKey:     body.COSKey,
		COSURL:     body.COSURL,
		Color:      color,
		TakenAt:    body.TakenAt,
		Caption:    body.Caption,
		VLMStatus:  "pending",
		OrderIndex: len(ride.Photos),
	}
	if err := a.Store.InsertPhoto(c.Request.Context(), photo); err != nil {
		mapStoreErr(c, err)
		return
	}
	if a.Queue != nil {
		// Best-effort: a queue push failure shouldn't fail the upload — the
		// photo is already saved, we can re-queue later via a sweeper.
		_ = a.Queue.PushVLMJob(c.Request.Context(), photo.ID, photo.RideID, photo.COSURL)
	}
	c.JSON(http.StatusOK, gin.H{"ok": true, "photo": photo.ToJSON()})
}
