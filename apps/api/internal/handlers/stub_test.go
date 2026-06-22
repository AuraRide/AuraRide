package handlers_test

import (
	"context"
	"time"

	"github.com/auraride/auraride/apps/api/internal/cos"
	"github.com/auraride/auraride/apps/api/internal/handlers"
	"github.com/auraride/auraride/apps/api/internal/models"
	"github.com/auraride/auraride/apps/api/internal/queue"
	"github.com/auraride/auraride/apps/api/internal/store"
)

// stubStore implements handlers.Querier with in-memory state and per-method
// error injection knobs. One test = one stubStore literal — keep it dumb and
// explicit (no clever mocks).
type stubStore struct {
	rides     map[string]models.Ride // keyed by ride id
	users     map[string]models.User
	posts     map[string]models.Post
	published map[string]bool // rideID -> bool
	photos    []models.Photo

	// error knobs — set to a non-nil error to make the next call fail.
	errList, errGet, errUpsert, errDelete, errReplace error
	errUser, errPost, errFeed, errPublished           error
	errLike, errInsertPhoto                           error
}

func newStub() *stubStore {
	return &stubStore{
		rides:     map[string]models.Ride{},
		users:     map[string]models.User{},
		posts:     map[string]models.Post{},
		published: map[string]bool{},
	}
}

// — Querier interface —

func (s *stubStore) ListRides(_ context.Context, userID string) ([]models.Ride, error) {
	if s.errList != nil {
		return nil, s.errList
	}
	out := []models.Ride{}
	for _, r := range s.rides {
		if r.UserID == userID {
			out = append(out, r)
		}
	}
	return out, nil
}

func (s *stubStore) GetRide(_ context.Context, userID, id string) (*models.Ride, error) {
	if s.errGet != nil {
		return nil, s.errGet
	}
	r, ok := s.rides[id]
	if !ok || r.UserID != userID {
		return nil, store.ErrNotFound
	}
	return &r, nil
}

func (s *stubStore) UpsertRide(_ context.Context, userID string, r models.Ride) error {
	if s.errUpsert != nil {
		return s.errUpsert
	}
	r.UserID = userID
	s.rides[r.ID] = r
	return nil
}

func (s *stubStore) DeleteRide(_ context.Context, userID, id string) error {
	if s.errDelete != nil {
		return s.errDelete
	}
	r, ok := s.rides[id]
	if !ok || r.UserID != userID {
		return store.ErrNotFound
	}
	delete(s.rides, id)
	return nil
}

func (s *stubStore) ReplaceAll(_ context.Context, userID string, rs []models.Ride) error {
	if s.errReplace != nil {
		return s.errReplace
	}
	for id, r := range s.rides {
		if r.UserID == userID {
			delete(s.rides, id)
		}
	}
	for _, r := range rs {
		r.UserID = userID
		s.rides[r.ID] = r
	}
	return nil
}

func (s *stubStore) GetUser(_ context.Context, id string) (*models.User, error) {
	if s.errUser != nil {
		return nil, s.errUser
	}
	u, ok := s.users[id]
	if !ok {
		return nil, store.ErrNotFound
	}
	return &u, nil
}

func (s *stubStore) InsertPost(_ context.Context, p models.Post) error {
	if s.errPost != nil {
		return s.errPost
	}
	s.posts[p.ID] = p
	s.published[p.RideID] = true
	return nil
}

func (s *stubStore) GetPost(_ context.Context, _ /*viewerID*/, id string) (*models.Post, error) {
	if s.errPost != nil {
		return nil, s.errPost
	}
	p, ok := s.posts[id]
	if !ok {
		return nil, store.ErrNotFound
	}
	// fill author from users map if present, else leave blank
	if u, ok := s.users[p.AuthorID]; ok {
		p.Author = u.ToPublicJSON()
	}
	return &p, nil
}

func (s *stubStore) ListFeed(_ context.Context, _ string, _ store.FeedFilter) ([]models.Post, error) {
	if s.errFeed != nil {
		return nil, s.errFeed
	}
	out := []models.Post{}
	for _, p := range s.posts {
		if u, ok := s.users[p.AuthorID]; ok {
			p.Author = u.ToPublicJSON()
		}
		out = append(out, p)
	}
	return out, nil
}

func (s *stubStore) IsPublished(_ context.Context, rideID string) (bool, error) {
	if s.errPublished != nil {
		return false, s.errPublished
	}
	return s.published[rideID], nil
}

func (s *stubStore) ToggleLike(_ context.Context, _ /*userID*/, postID string) (*models.Post, error) {
	if s.errLike != nil {
		return nil, s.errLike
	}
	p, ok := s.posts[postID]
	if !ok {
		return nil, store.ErrNotFound
	}
	p.LikedByMe = !p.LikedByMe
	if p.LikedByMe {
		p.Likes++
	} else if p.Likes > 0 {
		p.Likes--
	}
	s.posts[postID] = p
	return &p, nil
}

func (s *stubStore) InsertPhoto(_ context.Context, p models.Photo) error {
	if s.errInsertPhoto != nil {
		return s.errInsertPhoto
	}
	s.photos = append(s.photos, p)
	return nil
}

// stubPusher records pushed jobs without touching Redis.
type stubPusher struct {
	count int
	err   error
}

func (p *stubPusher) PushVLMJob(_ context.Context, _, _, _ string) error {
	if p.err != nil {
		return p.err
	}
	p.count++
	return nil
}

// stubCOS implements cos.PresignClient.
type stubCOS struct {
	presignErr error
	url        string
}

func (s *stubCOS) PresignPut(_ context.Context, key, _ string, _ time.Duration) (string, error) {
	_ = key
	if s.presignErr != nil {
		return "", s.presignErr
	}
	if s.url == "" {
		return "https://example.com/upload", nil
	}
	return s.url, nil
}

func (s *stubCOS) PublicURL(key string) string {
	return "https://example.com/" + key
}

// ensure interface satisfaction at compile time (catches signature drift).
var _ handlers.Querier = (*stubStore)(nil)
var _ cos.PresignClient = (*stubCOS)(nil)
var _ queue.Pusher = (*stubPusher)(nil)
