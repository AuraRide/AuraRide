package handlers_test

import (
	"net/http"
	"testing"
)

func TestHealthz(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/healthz", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestReadyz(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/readyz", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d", rec.Code)
	}
}
