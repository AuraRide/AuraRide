package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/auraride/auraride/apps/api/internal/models"
)

// InsertPost writes a new post. RouteShape + PhotoURLs are stored as JSONB.
func (s *Store) InsertPost(ctx context.Context, p models.Post) error {
	ctx = ctxOrBackground(ctx)
	shape, err := json.Marshal(p.RouteShape)
	if err != nil {
		return fmt.Errorf("post shape: %w", err)
	}
	if p.PhotoURLs == nil {
		p.PhotoURLs = []string{}
	}
	urls, err := json.Marshal(p.PhotoURLs)
	if err != nil {
		return fmt.Errorf("post urls: %w", err)
	}
	const q = `INSERT INTO posts
	             (id, ride_id, author_id, color_id, city, distance_km, duration_min,
	              mood_text, caption, cover_color, route_shape, photo_urls, likes, published_at)
	           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
	           ON CONFLICT (id) DO UPDATE
	             SET city = EXCLUDED.city,
	                 caption = EXCLUDED.caption,
	                 cover_color = EXCLUDED.cover_color,
	                 route_shape = EXCLUDED.route_shape,
	                 photo_urls  = EXCLUDED.photo_urls`
	if _, err := s.DB.ExecContext(ctx, q,
		p.ID, p.RideID, p.AuthorID, p.ColorID, p.City, p.DistanceKm, p.DurationMin,
		strPtrToNull(p.MoodText), strPtrToNull(p.Caption), p.CoverColor,
		string(shape), string(urls), p.Likes, p.PublishedAt,
	); err != nil {
		return fmt.Errorf("insert post: %w", err)
	}
	return nil
}

// GetPost returns a single post enriched with author + likedByMe for viewerID.
func (s *Store) GetPost(ctx context.Context, viewerID, id string) (*models.Post, error) {
	ctx = ctxOrBackground(ctx)
	const q = `SELECT p.id, p.ride_id, p.author_id, p.color_id, p.city,
	                  p.distance_km, p.duration_min, p.mood_text, p.caption,
	                  p.cover_color, p.route_shape, p.photo_urls, p.likes,
	                  p.published_at, p.created_at,
	                  u.handle, u.avatar_color, u.dominant_color_id,
	                  CASE WHEN l.post_id IS NULL THEN false ELSE true END AS liked_by_me
	             FROM posts p
	             JOIN users u ON u.id = p.author_id
	             LEFT JOIN post_likes l ON l.post_id = p.id AND l.user_id = $2
	            WHERE p.id = $1`
	row := s.DB.QueryRowContext(ctx, q, id, viewerID)
	p, err := scanPost(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return p, nil
}

// DeletePost removes a post that userID owns. Returns ErrNotFound if the post
// doesn't exist OR isn't owned by userID — never leaks existence to a non-owner.
// Cascading deletes (post_likes, comments) happen via the FK ON DELETE CASCADE.
func (s *Store) DeletePost(ctx context.Context, userID, id string) error {
	ctx = ctxOrBackground(ctx)
	res, err := s.DB.ExecContext(ctx,
		`DELETE FROM posts WHERE id = $1 AND author_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete post: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete post rows: %w", err)
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// IsPublished checks whether a ride already has a post.
func (s *Store) IsPublished(ctx context.Context, rideID string) (bool, error) {
	ctx = ctxOrBackground(ctx)
	var exists bool
	err := s.DB.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM posts WHERE ride_id = $1)`, rideID,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("is published: %w", err)
	}
	return exists, nil
}

// ListFeed returns posts matching the filter, enriched with author + likedByMe.
func (s *Store) ListFeed(ctx context.Context, viewerID string, f FeedFilter) ([]models.Post, error) {
	ctx = ctxOrBackground(ctx)
	var where []string
	args := []any{viewerID}
	idx := 2
	if f.ColorID != "" {
		where = append(where, fmt.Sprintf("p.color_id = $%d", idx))
		args = append(args, f.ColorID)
		idx++
	}
	if f.City != "" {
		where = append(where, fmt.Sprintf("p.city ILIKE $%d", idx))
		args = append(args, "%"+f.City+"%")
		idx++
	}
	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}
	order := "p.published_at DESC"
	if f.Sort == "hot" {
		order = "p.likes DESC, p.published_at DESC"
	}
	q := `SELECT p.id, p.ride_id, p.author_id, p.color_id, p.city,
	             p.distance_km, p.duration_min, p.mood_text, p.caption,
	             p.cover_color, p.route_shape, p.photo_urls, p.likes,
	             p.published_at, p.created_at,
	             u.handle, u.avatar_color, u.dominant_color_id,
	             CASE WHEN l.post_id IS NULL THEN false ELSE true END AS liked_by_me
	        FROM posts p
	        JOIN users u ON u.id = p.author_id
	        LEFT JOIN post_likes l ON l.post_id = p.id AND l.user_id = $1
	        ` + whereSQL + `
	       ORDER BY ` + order + `
	       LIMIT 100`
	rows, err := s.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("list feed: %w", err)
	}
	defer rows.Close()
	var out []models.Post
	for rows.Next() {
		p, err := scanPost(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list feed rows: %w", err)
	}
	return out, nil
}

// rowScanner is satisfied by both *sql.Row and *sql.Rows.
type rowScanner interface {
	Scan(dest ...any) error
}

func scanPost(r rowScanner) (*models.Post, error) {
	var (
		p          models.Post
		mood, cap  sql.NullString
		shape, urls []byte
	)
	if err := r.Scan(
		&p.ID, &p.RideID, &p.AuthorID, &p.ColorID, &p.City,
		&p.DistanceKm, &p.DurationMin, &mood, &cap,
		&p.CoverColor, &shape, &urls, &p.Likes,
		&p.PublishedAt, &p.CreatedAt,
		&p.Author.Handle, &p.Author.AvatarColor, &p.Author.DominantColorID,
		&p.LikedByMe,
	); err != nil {
		return nil, err
	}
	p.Author.ID = p.AuthorID
	p.MoodText = nullableString(mood)
	p.Caption = nullableString(cap)
	if err := json.Unmarshal(shape, &p.RouteShape); err != nil {
		return nil, fmt.Errorf("decode route shape: %w", err)
	}
	if err := json.Unmarshal(urls, &p.PhotoURLs); err != nil {
		return nil, fmt.Errorf("decode photo urls: %w", err)
	}
	return &p, nil
}
