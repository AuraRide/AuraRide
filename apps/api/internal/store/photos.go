package store

import (
	"context"
	"fmt"

	"github.com/auraride/auraride/apps/api/internal/models"
)

// InsertPhoto adds a photo to an existing ride. Used by POST /api/photos/commit
// (step 3 of the 3-step upload flow) and by seed.
func (s *Store) InsertPhoto(ctx context.Context, p models.Photo) error {
	ctx = ctxOrBackground(ctx)
	const q = `INSERT INTO ride_photos
	             (id, ride_id, cos_key, cos_url, color, taken_at, caption, vlm_status, order_index)
	           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	           ON CONFLICT (id) DO UPDATE
	             SET cos_url = EXCLUDED.cos_url,
	                 color   = EXCLUDED.color,
	                 caption = EXCLUDED.caption,
	                 vlm_status = EXCLUDED.vlm_status`
	if _, err := s.DB.ExecContext(ctx, q,
		p.ID, p.RideID, p.COSKey, p.COSURL, p.Color, p.TakenAt,
		strPtrToNull(p.Caption), p.VLMStatus, p.OrderIndex,
	); err != nil {
		return fmt.Errorf("insert photo: %w", err)
	}
	return nil
}

// UpdatePhotoColor is the Python worker's callback path — VLM returned a colour,
// row gets stamped + vlm_status flipped to "done".
func (s *Store) UpdatePhotoColor(ctx context.Context, photoID, color string) error {
	ctx = ctxOrBackground(ctx)
	res, err := s.DB.ExecContext(ctx,
		`UPDATE ride_photos SET color = $1, vlm_status = 'done' WHERE id = $2`,
		color, photoID)
	if err != nil {
		return fmt.Errorf("update photo color: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("update photo rows: %w", err)
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// CountPhotosByRide is used by tests and the (future) feed cover-photo logic.
func (s *Store) CountPhotosByRide(ctx context.Context, rideID string) (int, error) {
	ctx = ctxOrBackground(ctx)
	var n int
	if err := s.DB.QueryRowContext(ctx,
		`SELECT count(*) FROM ride_photos WHERE ride_id = $1`, rideID,
	).Scan(&n); err != nil {
		return 0, fmt.Errorf("count photos: %w", err)
	}
	return n, nil
}
