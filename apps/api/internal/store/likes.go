package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/auraride/auraride/apps/api/internal/models"
)

// ToggleLike flips the like state for (userID, postID) and updates the
// denormalised posts.likes counter in the same transaction. Returns the post
// in its post-toggle state so the handler can send the full PostJSON back.
func (s *Store) ToggleLike(ctx context.Context, userID, postID string) (*models.Post, error) {
	ctx = ctxOrBackground(ctx)
	if err := s.toggleLikeTx(ctx, userID, postID); err != nil {
		return nil, err
	}
	// Re-read post once the toggle has committed so callers get the live counters.
	return s.GetPost(ctx, userID, postID)
}

// toggleLikeTx runs the actual toggle inside a single transaction so a crash
// between the like row write and the counter update can't leave them inconsistent.
func (s *Store) toggleLikeTx(ctx context.Context, userID, postID string) (err error) {
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("toggle like begin: %w", err)
	}
	defer txClose(tx, &err)

	var exists bool
	if err = tx.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM post_likes WHERE user_id=$1 AND post_id=$2)`,
		userID, postID,
	).Scan(&exists); err != nil {
		return fmt.Errorf("toggle like probe: %w", err)
	}

	if exists {
		if _, err = tx.ExecContext(ctx,
			`DELETE FROM post_likes WHERE user_id=$1 AND post_id=$2`, userID, postID); err != nil {
			return fmt.Errorf("toggle like delete: %w", err)
		}
		if _, err = tx.ExecContext(ctx,
			`UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = $1`, postID); err != nil {
			return fmt.Errorf("toggle like dec: %w", err)
		}
		return nil
	}

	// Liking: verify the post exists before inserting; FK error messages are
	// uglier than a clean 404.
	var postExists bool
	if err = tx.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1)`, postID,
	).Scan(&postExists); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			err = ErrNotFound
		}
		return fmt.Errorf("toggle like check post: %w", err)
	}
	if !postExists {
		err = ErrNotFound
		return err
	}
	if _, err = tx.ExecContext(ctx,
		`INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)
		 ON CONFLICT DO NOTHING`, userID, postID); err != nil {
		return fmt.Errorf("toggle like insert: %w", err)
	}
	if _, err = tx.ExecContext(ctx,
		`UPDATE posts SET likes = likes + 1 WHERE id = $1`, postID); err != nil {
		return fmt.Errorf("toggle like inc: %w", err)
	}
	return nil
}
