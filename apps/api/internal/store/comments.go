package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/auraride/auraride/apps/api/internal/models"
)

// ListComments returns all comments on a post, oldest-first(陈娟 UI 是上下铺
// 时间序而不是 collapse),enriched with the author handle/avatar so the row
// renders without a second round-trip.
func (s *Store) ListComments(ctx context.Context, postID string) ([]models.Comment, error) {
	ctx = ctxOrBackground(ctx)
	const q = `SELECT c.id, c.post_id, c.author_id, c.text, c.created_at,
	                  u.handle, u.avatar_color, u.dominant_color_id
	             FROM comments c
	             JOIN users u ON u.id = c.author_id
	            WHERE c.post_id = $1
	            ORDER BY c.created_at ASC
	            LIMIT 200`
	rows, err := s.DB.QueryContext(ctx, q, postID)
	if err != nil {
		return nil, fmt.Errorf("list comments: %w", err)
	}
	defer rows.Close()
	var out []models.Comment
	for rows.Next() {
		var c models.Comment
		if err := rows.Scan(
			&c.ID, &c.PostID, &c.AuthorID, &c.Text, &c.CreatedAt,
			&c.Author.Handle, &c.Author.AvatarColor, &c.Author.DominantColorID,
		); err != nil {
			return nil, fmt.Errorf("scan comment: %w", err)
		}
		c.Author.ID = c.AuthorID
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list comments rows: %w", err)
	}
	return out, nil
}

// InsertComment writes one comment row. Returns the row enriched with the
// author so the handler can echo a full CommentJSON to the front end.
func (s *Store) InsertComment(ctx context.Context, c models.Comment) (*models.Comment, error) {
	ctx = ctxOrBackground(ctx)
	// FK enforces post + user existence; we surface ErrNotFound on missing post
	// to keep the handler 404-clean instead of leaking pg error strings.
	var postExists bool
	if err := s.DB.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1)`, c.PostID,
	).Scan(&postExists); err != nil {
		return nil, fmt.Errorf("comment post check: %w", err)
	}
	if !postExists {
		return nil, ErrNotFound
	}
	if _, err := s.DB.ExecContext(ctx,
		`INSERT INTO comments (id, post_id, author_id, text, created_at)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (id) DO NOTHING`,
		c.ID, c.PostID, c.AuthorID, c.Text, c.CreatedAt,
	); err != nil {
		return nil, fmt.Errorf("insert comment: %w", err)
	}
	// Re-read so the author is populated consistently with ListComments.
	const q = `SELECT c.id, c.post_id, c.author_id, c.text, c.created_at,
	                  u.handle, u.avatar_color, u.dominant_color_id
	             FROM comments c JOIN users u ON u.id = c.author_id
	            WHERE c.id = $1`
	var out models.Comment
	if err := s.DB.QueryRowContext(ctx, q, c.ID).Scan(
		&out.ID, &out.PostID, &out.AuthorID, &out.Text, &out.CreatedAt,
		&out.Author.Handle, &out.Author.AvatarColor, &out.Author.DominantColorID,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("read back comment: %w", err)
	}
	out.Author.ID = out.AuthorID
	return &out, nil
}

// CommentCounts returns postID → count for all posts that have ≥1 comment.
// Posts with 0 are omitted so the wire payload stays small; the front end
// treats a missing key as 0.
func (s *Store) CommentCounts(ctx context.Context) (map[string]int, error) {
	ctx = ctxOrBackground(ctx)
	rows, err := s.DB.QueryContext(ctx,
		`SELECT post_id, COUNT(*) FROM comments GROUP BY post_id`)
	if err != nil {
		return nil, fmt.Errorf("comment counts: %w", err)
	}
	defer rows.Close()
	out := map[string]int{}
	for rows.Next() {
		var postID string
		var n int
		if err := rows.Scan(&postID, &n); err != nil {
			return nil, fmt.Errorf("scan count: %w", err)
		}
		out[postID] = n
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("comment counts rows: %w", err)
	}
	return out, nil
}
