package handlers_test

import (
	"net/http"
	"testing"

	"github.com/auraride/auraride/apps/api/internal/models"
)

func TestMe_HappyFromStore(t *testing.T) {
	stub := newStub()
	stub.users["me"] = models.User{ID: "me", Handle: "我", AvatarColor: "#aaa", DominantColorID: "calm-green"}
	r, _ := buildAPI(t, stub)

	rec := doJSON(t, r, "GET", "/api/me", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	u := decode[models.PublicUserJSON](t, rec)
	if u.Handle != "我" || u.DominantColorID != "calm-green" {
		t.Errorf("unexpected user: %+v", u)
	}
}

func TestMe_FallbackWhenNotInStore(t *testing.T) {
	stub := newStub() // no users
	r, _ := buildAPI(t, stub)

	rec := doJSON(t, r, "GET", "/api/me", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	u := decode[models.PublicUserJSON](t, rec)
	if u.ID != "me" {
		t.Errorf("fallback id=%q want me", u.ID)
	}
}
