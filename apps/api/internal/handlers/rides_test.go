package handlers_test

import (
	"errors"
	"net/http"
	"testing"

	"github.com/auraride/auraride/apps/api/internal/models"
)

func seedRide(id string) models.Ride {
	mood := "傍晚的江堤"
	return models.Ride{
		ID: id, UserID: "me", ColorID: "calm-green",
		StartedAt: 1_718_500_000_000, EndedAt: 1_718_502_400_000,
		Distance: 4.5, Duration: 2400, MoodText: &mood, DominantColor: "#34E89E",
		Photos: []models.Photo{{
			ID: "p1", RideID: id, COSURL: "https://example.com/p1.jpg",
			Color: "#34E89E", TakenAt: 1_718_501_000_000, VLMStatus: "done", OrderIndex: 0,
		}},
	}
}

func TestListRides_Happy(t *testing.T) {
	stub := newStub()
	stub.rides[seedRide("r1").ID] = seedRide("r1")
	stub.rides[seedRide("r2").ID] = seedRide("r2")
	r, _ := buildAPI(t, stub)

	rec := doJSON(t, r, "GET", "/api/rides", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rec.Code, rec.Body.String())
	}
	out := decode[[]models.RideJSON](t, rec)
	if len(out) != 2 {
		t.Fatalf("len(out)=%d, want 2", len(out))
	}
	// JSON shape contract: photo URL is exposed as "dataUrl"
	if got := out[0].Photos[0].DataURL; got != "https://example.com/p1.jpg" {
		t.Errorf("photos[0].dataUrl=%q, want example.com/p1.jpg", got)
	}
}

func TestListRides_StoreError(t *testing.T) {
	stub := newStub()
	stub.errList = errors.New("boom")
	r, _ := buildAPI(t, stub)

	rec := doJSON(t, r, "GET", "/api/rides", nil)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
}

func TestGetRide_Happy(t *testing.T) {
	stub := newStub()
	stub.rides["r1"] = seedRide("r1")
	r, _ := buildAPI(t, stub)

	rec := doJSON(t, r, "GET", "/api/rides/r1", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	out := decode[models.RideJSON](t, rec)
	if out.ID != "r1" {
		t.Errorf("id=%q want r1", out.ID)
	}
	if out.ColorID != "calm-green" {
		t.Errorf("colorId=%q want calm-green", out.ColorID)
	}
}

func TestGetRide_NotFound(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub)

	rec := doJSON(t, r, "GET", "/api/rides/nope", nil)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status=%d, want 404", rec.Code)
	}
}

func TestSaveRide_Happy(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub)
	body := seedRide("r-new").ToJSON()

	rec := doJSON(t, r, "POST", "/api/rides", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	if _, ok := stub.rides["r-new"]; !ok {
		t.Fatal("ride was not stored in stub")
	}
}

func TestSaveRide_MissingID(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub)
	body := seedRide("").ToJSON() // empty id

	rec := doJSON(t, r, "POST", "/api/rides", body)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d, want 400", rec.Code)
	}
}

func TestDeleteRide_Happy(t *testing.T) {
	stub := newStub()
	stub.rides["r1"] = seedRide("r1")
	r, _ := buildAPI(t, stub)

	rec := doJSON(t, r, "DELETE", "/api/rides/r1", nil)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status=%d, want 204", rec.Code)
	}
	if _, ok := stub.rides["r1"]; ok {
		t.Fatal("ride not deleted from stub")
	}
}

func TestReplaceAll_Happy(t *testing.T) {
	stub := newStub()
	stub.rides["old"] = seedRide("old")
	r, _ := buildAPI(t, stub)
	body := []models.RideJSON{seedRide("a").ToJSON(), seedRide("b").ToJSON()}

	rec := doJSON(t, r, "PUT", "/api/rides", body)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	if _, ok := stub.rides["old"]; ok {
		t.Fatal("old ride should have been replaced")
	}
	if len(stub.rides) != 2 {
		t.Fatalf("expected 2 rides after replace, got %d", len(stub.rides))
	}
}
