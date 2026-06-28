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
	rides       map[string]models.Ride // keyed by ride id
	users       map[string]models.User
	posts       map[string]models.Post
	published   map[string]bool // rideID -> bool
	photos      []models.Photo
	comments    map[string][]models.Comment    // postID -> ordered list (oldest first)
	savedRoutes map[string][]models.SavedRoute // userID -> list

	// error knobs — set to a non-nil error to make the next call fail.
	errList, errGet, errUpsert, errDelete, errReplace error
	errUser, errPost, errFeed, errPublished           error
	errLike, errInsertPhoto                           error
	errDeletePost                                     error
	errListComments, errInsertComment, errCounts      error
	errListSaved, errInsertSaved, errDeleteSaved      error
	errListSavedIds                                   error
}

func newStub() *stubStore {
	return &stubStore{
		rides:       map[string]models.Ride{},
		users:       map[string]models.User{},
		posts:       map[string]models.Post{},
		published:   map[string]bool{},
		comments:    map[string][]models.Comment{},
		savedRoutes: map[string][]models.SavedRoute{},
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

// — comments / saved_routes / deletePost (cj 色彩游记改版 新增的契约) —

func (s *stubStore) DeletePost(_ context.Context, userID, id string) error {
	if s.errDeletePost != nil {
		return s.errDeletePost
	}
	p, ok := s.posts[id]
	if !ok || p.AuthorID != userID {
		return store.ErrNotFound
	}
	delete(s.posts, id)
	delete(s.comments, id)
	delete(s.published, p.RideID)
	// cascade saved_routes referencing this post (set fromPostID to nil) — the
	// real DB does ON DELETE SET NULL.
	for uid, list := range s.savedRoutes {
		for i := range list {
			if list[i].FromPostID != nil && *list[i].FromPostID == id {
				list[i].FromPostID = nil
			}
		}
		s.savedRoutes[uid] = list
	}
	return nil
}

func (s *stubStore) ListComments(_ context.Context, postID string) ([]models.Comment, error) {
	if s.errListComments != nil {
		return nil, s.errListComments
	}
	out := make([]models.Comment, 0, len(s.comments[postID]))
	for _, c := range s.comments[postID] {
		if u, ok := s.users[c.AuthorID]; ok {
			c.Author = u.ToPublicJSON()
		}
		out = append(out, c)
	}
	return out, nil
}

func (s *stubStore) InsertComment(_ context.Context, c models.Comment) (*models.Comment, error) {
	if s.errInsertComment != nil {
		return nil, s.errInsertComment
	}
	if _, ok := s.posts[c.PostID]; !ok {
		return nil, store.ErrNotFound
	}
	if u, ok := s.users[c.AuthorID]; ok {
		c.Author = u.ToPublicJSON()
	}
	s.comments[c.PostID] = append(s.comments[c.PostID], c)
	return &c, nil
}

func (s *stubStore) CommentCounts(_ context.Context) (map[string]int, error) {
	if s.errCounts != nil {
		return nil, s.errCounts
	}
	out := map[string]int{}
	for postID, list := range s.comments {
		if len(list) > 0 {
			out[postID] = len(list)
		}
	}
	return out, nil
}

func (s *stubStore) ListSavedRoutes(_ context.Context, userID string) ([]models.SavedRoute, error) {
	if s.errListSaved != nil {
		return nil, s.errListSaved
	}
	out := append([]models.SavedRoute(nil), s.savedRoutes[userID]...)
	return out, nil
}

func (s *stubStore) InsertSavedRoute(_ context.Context, r models.SavedRoute) (*models.SavedRoute, error) {
	if s.errInsertSaved != nil {
		return nil, s.errInsertSaved
	}
	if r.FromPostID != nil {
		if _, ok := s.posts[*r.FromPostID]; !ok {
			return nil, store.ErrNotFound
		}
		// dedupe (user_id, from_post_id) — return existing instead of inserting
		for _, ex := range s.savedRoutes[r.UserID] {
			if ex.FromPostID != nil && *ex.FromPostID == *r.FromPostID {
				return &ex, nil
			}
		}
	}
	s.savedRoutes[r.UserID] = append(s.savedRoutes[r.UserID], r)
	return &r, nil
}

func (s *stubStore) DeleteSavedRoute(_ context.Context, userID, id string) error {
	if s.errDeleteSaved != nil {
		return s.errDeleteSaved
	}
	list := s.savedRoutes[userID]
	for i, r := range list {
		if r.ID == id {
			s.savedRoutes[userID] = append(list[:i], list[i+1:]...)
			return nil
		}
	}
	return store.ErrNotFound
}

func (s *stubStore) ListSavedPostIds(_ context.Context, userID string) ([]string, error) {
	if s.errListSavedIds != nil {
		return nil, s.errListSavedIds
	}
	out := []string{}
	for _, r := range s.savedRoutes[userID] {
		if r.FromPostID != nil {
			out = append(out, *r.FromPostID)
		}
	}
	return out, nil
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
