package models

import "time"

// Comment is the DB row for `comments`.
type Comment struct {
	ID        string
	PostID    string
	AuthorID  string
	Text      string
	CreatedAt int64 // unix ms — wire format
	CreatedTS time.Time

	// Joined in at read time, never stored on this row.
	Author PublicUserJSON
}

// CommentJSON mirrors apps/web/src/app/lib/rideRepo.ts > Comment.
type CommentJSON struct {
	ID        string         `json:"id"`
	PostID    string         `json:"postId"`
	Author    PublicUserJSON `json:"author"`
	Text      string         `json:"text"`
	CreatedAt int64          `json:"createdAt"`
}

func (c Comment) ToJSON() CommentJSON {
	return CommentJSON{
		ID: c.ID, PostID: c.PostID, Author: c.Author,
		Text: c.Text, CreatedAt: c.CreatedAt,
	}
}
