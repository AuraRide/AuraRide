package models

import "time"

// PostLike is the DB row for `post_likes`.
type PostLike struct {
	UserID    string
	PostID    string
	CreatedAt time.Time
}
