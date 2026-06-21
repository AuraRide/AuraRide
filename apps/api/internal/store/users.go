package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/auraride/auraride/apps/api/internal/models"
)

// GetUser fetches a single user by id; ErrNotFound if absent.
func (s *Store) GetUser(ctx context.Context, id string) (*models.User, error) {
	ctx = ctxOrBackground(ctx)
	const q = `SELECT id, handle, avatar_color, dominant_color_id, created_at
	             FROM users WHERE id = $1`
	row := s.DB.QueryRowContext(ctx, q, id)
	var u models.User
	if err := row.Scan(&u.ID, &u.Handle, &u.AvatarColor, &u.DominantColorID, &u.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get user: %w", err)
	}
	return &u, nil
}

// GetUserByHandle is convenient for tests / future login flows.
func (s *Store) GetUserByHandle(ctx context.Context, handle string) (*models.User, error) {
	ctx = ctxOrBackground(ctx)
	const q = `SELECT id, handle, avatar_color, dominant_color_id, created_at
	             FROM users WHERE handle = $1`
	row := s.DB.QueryRowContext(ctx, q, handle)
	var u models.User
	if err := row.Scan(&u.ID, &u.Handle, &u.AvatarColor, &u.DominantColorID, &u.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get user by handle: %w", err)
	}
	return &u, nil
}

// InsertUser upserts; mainly used by seed and the (future) Apple Sign-In path.
func (s *Store) InsertUser(ctx context.Context, u models.User) error {
	ctx = ctxOrBackground(ctx)
	const q = `INSERT INTO users (id, handle, avatar_color, dominant_color_id)
	                VALUES ($1, $2, $3, $4)
	           ON CONFLICT (id) DO UPDATE
	                SET handle = EXCLUDED.handle,
	                    avatar_color = EXCLUDED.avatar_color,
	                    dominant_color_id = EXCLUDED.dominant_color_id`
	if _, err := s.DB.ExecContext(ctx, q, u.ID, u.Handle, u.AvatarColor, u.DominantColorID); err != nil {
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}
