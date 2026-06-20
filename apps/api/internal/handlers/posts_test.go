package handlers_test

import (
	"net/http"
	"testing"

	"github.com/auraride/auraride/apps/api/internal/models"
)

func TestPublishRide_Happy(t *testing.T) {
	stub := newStub()
	stub.users["me"] = models.User{ID: "me", Handle: "我", AvatarColor: "#aaa", DominantColorID: "calm-green"}
	stub.rides["r1"] = seedRide("r1")
	r, _ := buildAPI(t, stub)

	body := map[string]string{"rideId": "r1", "city": "上海", "caption": "傍晚的江堤"}
	rec := doJSON(t, r, "POST", "/api/posts", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	out := decode[models.PostJSON](t, rec)
	if out.ID != "post-r1" {
		t.Errorf("id=%q want post-r1", out.ID)
	}
	if out.City != "上海" {
		t.Errorf("city=%q want 上海", out.City)
	}
}

func TestPublishRide_BadBody(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "POST", "/api/posts", map[string]string{"rideId": "r1"}) // missing city
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want 400", rec.Code)
	}
}

func TestIsPublished_True(t *testing.T) {
	stub := newStub()
	stub.published["r1"] = true
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/api/posts/published/r1", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d", rec.Code)
	}
	out := decode[struct {
		Published bool `json:"published"`
	}](t, rec)
	if !out.Published {
		t.Error("expected published=true")
	}
}

func TestListFeed_Happy(t *testing.T) {
	stub := newStub()
	stub.users["u1"] = models.User{ID: "u1", Handle: "拾光的人", AvatarColor: "#3a9b4e", DominantColorID: "calm-green"}
	stub.posts["post-1"] = models.Post{
		ID: "post-1", RideID: "r1", AuthorID: "u1", ColorID: "calm-green",
		City: "上海", DistanceKm: 4.5, DurationMin: 27, CoverColor: "#34E89E",
		RouteShape: [][2]float64{{0.2, 0.8}}, PhotoURLs: []string{},
		Likes: 12, PublishedAt: 1_718_500_000_000,
	}
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/api/posts", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	out := decode[[]models.PostJSON](t, rec)
	if len(out) != 1 || out[0].Author.Handle != "拾光的人" {
		t.Errorf("unexpected feed: %+v", out)
	}
}

func TestGetPost_NotFound(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/api/posts/nope", nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status=%d want 404", rec.Code)
	}
}

func TestToggleLike_FlipsState(t *testing.T) {
	stub := newStub()
	stub.posts["p1"] = models.Post{
		ID: "p1", RideID: "r1", AuthorID: "u1", Likes: 5, LikedByMe: false,
		RouteShape: [][2]float64{}, PhotoURLs: []string{},
	}
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "POST", "/api/posts/p1/like", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	out := decode[models.PostJSON](t, rec)
	if !out.LikedByMe || out.Likes != 6 {
		t.Errorf("expected likedByMe=true likes=6, got %+v", out)
	}
}
