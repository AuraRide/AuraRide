package handlers_test

import (
	"errors"
	"net/http"
	"testing"

	"github.com/auraride/auraride/apps/api/internal/models"
)

// post + user fixtures shared by every test in this file.
func seedPostFixture(s *stubStore) {
	s.users["me"] = models.User{ID: "me", Handle: "我", AvatarColor: "#3a2817", DominantColorID: "explore-yellow"}
	s.users["u1"] = models.User{ID: "u1", Handle: "拾光的人", AvatarColor: "#3a9b4e", DominantColorID: "calm-green"}
	s.posts["post-1"] = models.Post{ID: "post-1", AuthorID: "u1", RideID: "r-1", City: "上海", ColorID: "calm-green"}
}

func TestListComments_Happy(t *testing.T) {
	stub := newStub()
	seedPostFixture(stub)
	stub.comments["post-1"] = []models.Comment{
		{ID: "c-1", PostID: "post-1", AuthorID: "u1", Text: "好赞", CreatedAt: 1000},
		{ID: "c-2", PostID: "post-1", AuthorID: "me", Text: "+1", CreatedAt: 2000},
	}
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/api/posts/post-1/comments", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d, body=%s", rec.Code, rec.Body.String())
	}
	got := decode[[]models.CommentJSON](t, rec)
	if len(got) != 2 {
		t.Fatalf("expected 2 comments, got %d", len(got))
	}
	if got[0].ID != "c-1" || got[0].Author.Handle != "拾光的人" {
		t.Fatalf("comment 0 wrong: %+v", got[0])
	}
}

func TestListComments_EmptyPost_ReturnsEmptyArray(t *testing.T) {
	stub := newStub()
	seedPostFixture(stub)
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/api/posts/post-1/comments", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d", rec.Code)
	}
	if rec.Body.String() != "[]" {
		t.Fatalf("expected [], got %s", rec.Body.String())
	}
}

func TestAddComment_Happy(t *testing.T) {
	stub := newStub()
	seedPostFixture(stub)
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "POST", "/api/posts/post-1/comments", map[string]string{"text": "first comment"})
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d, body=%s", rec.Code, rec.Body.String())
	}
	got := decode[models.CommentJSON](t, rec)
	if got.Text != "first comment" || got.PostID != "post-1" || got.Author.ID != "me" {
		t.Fatalf("comment wrong: %+v", got)
	}
	if len(stub.comments["post-1"]) != 1 {
		t.Fatalf("expected 1 stored comment, got %d", len(stub.comments["post-1"]))
	}
}

func TestAddComment_EmptyText_400(t *testing.T) {
	stub := newStub()
	seedPostFixture(stub)
	r, _ := buildAPI(t, stub)
	// "   " trims to empty — handler must reject before storage.
	rec := doJSON(t, r, "POST", "/api/posts/post-1/comments", map[string]string{"text": "   "})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status: got %d, expected 400; body=%s", rec.Code, rec.Body.String())
	}
}

func TestAddComment_MissingBody_400(t *testing.T) {
	stub := newStub()
	seedPostFixture(stub)
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "POST", "/api/posts/post-1/comments", map[string]string{}) // no `text`
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status: got %d, expected 400", rec.Code)
	}
}

func TestAddComment_NonexistentPost_404(t *testing.T) {
	stub := newStub()
	seedPostFixture(stub)
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "POST", "/api/posts/missing-post/comments", map[string]string{"text": "hi"})
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status: got %d, expected 404", rec.Code)
	}
}

func TestAddComment_StoreError_500(t *testing.T) {
	stub := newStub()
	seedPostFixture(stub)
	stub.errInsertComment = errors.New("boom")
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "POST", "/api/posts/post-1/comments", map[string]string{"text": "hi"})
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status: got %d", rec.Code)
	}
}

func TestCommentCounts_Happy(t *testing.T) {
	stub := newStub()
	seedPostFixture(stub)
	stub.comments["post-1"] = []models.Comment{{ID: "a"}, {ID: "b"}}
	stub.posts["post-2"] = models.Post{ID: "post-2", AuthorID: "u1"}
	stub.comments["post-2"] = []models.Comment{{ID: "c"}}
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/api/posts/comment-counts", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d, body=%s", rec.Code, rec.Body.String())
	}
	got := decode[map[string]int](t, rec)
	if got["post-1"] != 2 || got["post-2"] != 1 {
		t.Fatalf("counts wrong: %+v", got)
	}
}

func TestCommentCounts_Empty(t *testing.T) {
	stub := newStub()
	r, _ := buildAPI(t, stub)
	rec := doJSON(t, r, "GET", "/api/posts/comment-counts", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d", rec.Code)
	}
	if rec.Body.String() != "{}" {
		t.Fatalf("expected {}, got %s", rec.Body.String())
	}
}
