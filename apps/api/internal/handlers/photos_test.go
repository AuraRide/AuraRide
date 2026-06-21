package handlers_test

import (
	"net/http"
	"testing"
)

func TestPhotoSTS_Happy(t *testing.T) {
	stub := newStub()
	stub.rides["r1"] = seedRide("r1")
	cosStub := &stubCOS{url: "https://example.com/upload?sig=abc"}
	r, _ := buildAPI(t, stub, withCOS(cosStub))

	body := map[string]string{"rideId": "r1", "contentType": "image/jpeg"}
	rec := doJSON(t, r, "POST", "/api/photos/sts", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	out := decode[struct {
		PhotoID   string `json:"photoId"`
		UploadURL string `json:"uploadUrl"`
		COSKey    string `json:"cosKey"`
		COSURL    string `json:"cosUrl"`
	}](t, rec)
	if out.PhotoID == "" || out.UploadURL == "" {
		t.Fatalf("missing fields in sts response: %+v", out)
	}
}

func TestPhotoSTS_RideNotFound(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub, withCOS(&stubCOS{}))
	body := map[string]string{"rideId": "ghost", "contentType": "image/jpeg"}
	rec := doJSON(t, r, "POST", "/api/photos/sts", body)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status=%d, want 404", rec.Code)
	}
}

func TestPhotoCommit_QueuesJob(t *testing.T) {
	stub := newStub()
	stub.rides["r1"] = seedRide("r1")
	pusher := &stubPusher{}
	r, _ := buildAPI(t, stub, withCOS(&stubCOS{}), withQueue(pusher))

	body := map[string]any{
		"photoId": "new-uuid", "rideId": "r1",
		"cosKey":  "rides/r1/new-uuid.jpg",
		"cosUrl":  "https://example.com/rides/r1/new-uuid.jpg",
		"takenAt": 1_718_501_000_000,
		"fallbackColor": "#34E89E",
	}
	rec := doJSON(t, r, "POST", "/api/photos/commit", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	if pusher.count != 1 {
		t.Errorf("queue.PushVLMJob called %d times, want 1", pusher.count)
	}
	if len(stub.photos) != 1 {
		t.Errorf("photo not inserted: %+v", stub.photos)
	}
}
