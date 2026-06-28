package handlers_test

import (
	"errors"
	"net/http"
	"testing"

	"github.com/auraride/auraride/apps/api/internal/models"
)

func seedSavedFixture(s *stubStore) {
	s.users["me"] = models.User{ID: "me", Handle: "我", AvatarColor: "#3a2817", DominantColorID: "explore-yellow"}
	s.users["u4"] = models.User{ID: "u4", Handle: "直道燃尽", AvatarColor: "#d23b2c", DominantColorID: "release-red"}
	s.posts["post-r-yangpu"] = models.Post{
		ID: "post-r-yangpu", AuthorID: "u4", RideID: "r-yangpu",
		ColorID: "release-red", City: "上海 · 杨浦滨江",
		DistanceKm: 6.7, DurationMin: 40, CoverColor: "#FF3344",
	}
}

func TestListSavedRoutes_Empty(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/api/saved-routes", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d", rec.Code)
	}
	if rec.Body.String() != "[]" {
		t.Fatalf("expected [], got %s", rec.Body.String())
	}
}

func TestSaveRouteFromPost_Happy(t *testing.T) {
	stub := newStub()
	seedSavedFixture(stub)
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "POST", "/api/saved-routes", map[string]string{"postId": "post-r-yangpu"})
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d, body=%s", rec.Code, rec.Body.String())
	}
	got := decode[models.SavedRouteJSON](t, rec)
	if got.FromPostID == nil || *got.FromPostID != "post-r-yangpu" {
		t.Fatalf("fromPostId wrong: %+v", got)
	}
	if got.ColorID != "release-red" || got.City != "上海 · 杨浦滨江" {
		t.Fatalf("color/city copied wrong: %+v", got)
	}
	if got.DistanceKm != 6.7 || got.CoverColor != "#FF3344" {
		t.Fatalf("distance/cover wrong: %+v", got)
	}
	if len(stub.savedRoutes["me"]) != 1 {
		t.Fatalf("expected 1 stored saved route, got %d", len(stub.savedRoutes["me"]))
	}
}

func TestSaveRouteFromPost_Duplicate_ReturnsExisting(t *testing.T) {
	stub := newStub()
	seedSavedFixture(stub)
	r, _ := buildAPI(t, stub)
	rec1 := doJSON(t, r, "POST", "/api/saved-routes", map[string]string{"postId": "post-r-yangpu"})
	if rec1.Code != http.StatusOK {
		t.Fatalf("first save: got %d", rec1.Code)
	}
	got1 := decode[models.SavedRouteJSON](t, rec1)
	rec2 := doJSON(t, r, "POST", "/api/saved-routes", map[string]string{"postId": "post-r-yangpu"})
	if rec2.Code != http.StatusOK {
		t.Fatalf("second save (dupe): got %d, body=%s", rec2.Code, rec2.Body.String())
	}
	got2 := decode[models.SavedRouteJSON](t, rec2)
	if got1.ID != got2.ID {
		t.Fatalf("dupe should return same row, got different ids: %s vs %s", got1.ID, got2.ID)
	}
	if len(stub.savedRoutes["me"]) != 1 {
		t.Fatalf("dupe must not insert a 2nd row, got %d", len(stub.savedRoutes["me"]))
	}
}

func TestSaveRouteFromPost_NonexistentPost_404(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "POST", "/api/saved-routes", map[string]string{"postId": "missing"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status: got %d, expected 404; body=%s", rec.Code, rec.Body.String())
	}
}

func TestSaveRouteFromPost_MissingBody_400(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "POST", "/api/saved-routes", map[string]string{})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status: got %d, expected 400", rec.Code)
	}
}

func TestRemoveSavedRoute_Happy(t *testing.T) {
	stub := newStub()
	postID := "post-x"
	stub.savedRoutes["me"] = []models.SavedRoute{{ID: "sr-1", UserID: "me", FromPostID: &postID}}
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "DELETE", "/api/saved-routes/sr-1", nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status: got %d, expected 204", rec.Code)
	}
	if len(stub.savedRoutes["me"]) != 0 {
		t.Fatalf("expected 0 rows after delete, got %d", len(stub.savedRoutes["me"]))
	}
}

func TestRemoveSavedRoute_NotOwner_404(t *testing.T) {
	stub := newStub()
	postID := "post-x"
	stub.savedRoutes["u1"] = []models.SavedRoute{{ID: "sr-1", UserID: "u1", FromPostID: &postID}}
	r, _ := buildAPI(t, stub)
	// caller is "me", row belongs to "u1" → must be 404 (never leak existence).
	rec := doJSON(t, r, "DELETE", "/api/saved-routes/sr-1", nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status: got %d, expected 404", rec.Code)
	}
	if len(stub.savedRoutes["u1"]) != 1 {
		t.Fatalf("u1's row must remain, got %d", len(stub.savedRoutes["u1"]))
	}
}

func TestSavedRouteIds_Happy(t *testing.T) {
	stub := newStub()
	a, b := "post-a", "post-b"
	stub.savedRoutes["me"] = []models.SavedRoute{
		{ID: "sr-1", UserID: "me", FromPostID: &a},
		{ID: "sr-2", UserID: "me", FromPostID: &b},
		{ID: "sr-3", UserID: "me", FromPostID: nil}, // handrolled (no fromPostID)
	}
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/api/saved-routes/ids", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d", rec.Code)
	}
	got := decode[[]string](t, rec)
	if len(got) != 2 {
		t.Fatalf("expected 2 ids (handrolled excluded), got %v", got)
	}
	if got[0] != "post-a" || got[1] != "post-b" {
		t.Fatalf("ids wrong: %v", got)
	}
}

func TestSavedRouteIds_Empty(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/api/saved-routes/ids", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d", rec.Code)
	}
	if rec.Body.String() != "[]" {
		t.Fatalf("expected [], got %s", rec.Body.String())
	}
}

func TestListSavedRoutes_StoreError_500(t *testing.T) {
	stub := newStub()
	stub.errListSaved = errors.New("boom")
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/api/saved-routes", nil)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status: got %d", rec.Code)
	}
}
