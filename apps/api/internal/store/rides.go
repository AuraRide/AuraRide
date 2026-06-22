package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/auraride/auraride/apps/api/internal/models"
)

// ListRides returns every ride owned by userID, newest first, with photos
// pre-loaded via a single secondary query (keeps the surface flat — no
// JOIN-and-deduplicate work in the handler).
func (s *Store) ListRides(ctx context.Context, userID string) ([]models.Ride, error) {
	ctx = ctxOrBackground(ctx)
	const q = `SELECT id, user_id, color_id, started_at, ended_at,
	                  distance_km, duration_sec, mood_text, dominant_color,
	                  created_at, updated_at
	             FROM rides
	            WHERE user_id = $1
	            ORDER BY started_at DESC`
	rows, err := s.DB.QueryContext(ctx, q, userID)
	if err != nil {
		return nil, fmt.Errorf("list rides: %w", err)
	}
	defer rows.Close()

	var rides []models.Ride
	ids := []string{}
	for rows.Next() {
		var r models.Ride
		var mood sql.NullString
		if err := rows.Scan(&r.ID, &r.UserID, &r.ColorID, &r.StartedAt, &r.EndedAt,
			&r.Distance, &r.Duration, &mood, &r.DominantColor,
			&r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, fmt.Errorf("list rides scan: %w", err)
		}
		r.MoodText = nullableString(mood)
		rides = append(rides, r)
		ids = append(ids, r.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list rides rows: %w", err)
	}

	if len(rides) == 0 {
		return rides, nil
	}

	photos, err := s.photosForRides(ctx, ids)
	if err != nil {
		return nil, err
	}
	for i := range rides {
		rides[i].Photos = photos[rides[i].ID]
	}
	return rides, nil
}

// GetRide loads a single ride + its photos, scoped to userID. ErrNotFound when
// either the ride doesn't exist or belongs to someone else (same outcome to
// avoid leaking existence).
func (s *Store) GetRide(ctx context.Context, userID, id string) (*models.Ride, error) {
	ctx = ctxOrBackground(ctx)
	const q = `SELECT id, user_id, color_id, started_at, ended_at,
	                  distance_km, duration_sec, mood_text, dominant_color,
	                  created_at, updated_at
	             FROM rides
	            WHERE id = $1 AND user_id = $2`
	row := s.DB.QueryRowContext(ctx, q, id, userID)
	var r models.Ride
	var mood sql.NullString
	if err := row.Scan(&r.ID, &r.UserID, &r.ColorID, &r.StartedAt, &r.EndedAt,
		&r.Distance, &r.Duration, &mood, &r.DominantColor,
		&r.CreatedAt, &r.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get ride: %w", err)
	}
	r.MoodText = nullableString(mood)

	photos, err := s.photosForRides(ctx, []string{r.ID})
	if err != nil {
		return nil, err
	}
	r.Photos = photos[r.ID]
	return &r, nil
}

// UpsertRide writes/updates a ride row. The plan says photos are written via
// the 3-step upload flow, but we also accept inline photos here so the
// front-end's existing localStorage-shaped saveRide() keeps working without
// the new endpoints — useful for the dev path.
func (s *Store) UpsertRide(ctx context.Context, userID string, r models.Ride) (err error) {
	ctx = ctxOrBackground(ctx)
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("upsert ride begin: %w", err)
	}
	defer txClose(tx, &err)

	const q = `INSERT INTO rides (id, user_id, color_id, started_at, ended_at,
	                              distance_km, duration_sec, mood_text, dominant_color)
	                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	           ON CONFLICT (id) DO UPDATE
	                SET color_id       = EXCLUDED.color_id,
	                    started_at     = EXCLUDED.started_at,
	                    ended_at       = EXCLUDED.ended_at,
	                    distance_km    = EXCLUDED.distance_km,
	                    duration_sec   = EXCLUDED.duration_sec,
	                    mood_text      = EXCLUDED.mood_text,
	                    dominant_color = EXCLUDED.dominant_color,
	                    updated_at     = now()
	           WHERE rides.user_id = $2`
	if _, err = tx.ExecContext(ctx, q,
		r.ID, userID, r.ColorID, r.StartedAt, r.EndedAt,
		r.Distance, r.Duration, strPtrToNull(r.MoodText), r.DominantColor,
	); err != nil {
		return fmt.Errorf("upsert ride exec: %w", err)
	}

	// Replace photos en bloc — small N, simpler than diffing.
	if _, err = tx.ExecContext(ctx, `DELETE FROM ride_photos WHERE ride_id = $1`, r.ID); err != nil {
		return fmt.Errorf("upsert ride clear photos: %w", err)
	}
	for i, p := range r.Photos {
		if _, err = tx.ExecContext(ctx,
			`INSERT INTO ride_photos (id, ride_id, cos_key, cos_url, color, taken_at, caption, vlm_status, order_index)
			      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			p.ID, r.ID, p.COSKey, p.COSURL, p.Color, p.TakenAt,
			strPtrToNull(p.Caption), p.VLMStatus, i,
		); err != nil {
			return fmt.Errorf("upsert ride insert photo: %w", err)
		}
	}
	return nil
}

// DeleteRide removes a ride owned by userID. Photos cascade.
func (s *Store) DeleteRide(ctx context.Context, userID, id string) error {
	ctx = ctxOrBackground(ctx)
	res, err := s.DB.ExecContext(ctx,
		`DELETE FROM rides WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete ride: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete ride rows: %w", err)
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ReplaceAll wipes the user's rides and inserts the new set in a single tx.
// Used by the local-to-remote sync (`replaceAllRides` on the front end).
func (s *Store) ReplaceAll(ctx context.Context, userID string, rides []models.Ride) (err error) {
	ctx = ctxOrBackground(ctx)
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("replace all begin: %w", err)
	}
	defer txClose(tx, &err)

	if _, err = tx.ExecContext(ctx, `DELETE FROM rides WHERE user_id = $1`, userID); err != nil {
		return fmt.Errorf("replace all delete: %w", err)
	}
	for _, r := range rides {
		if _, err = tx.ExecContext(ctx,
			`INSERT INTO rides (id, user_id, color_id, started_at, ended_at,
			                    distance_km, duration_sec, mood_text, dominant_color)
			      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			r.ID, userID, r.ColorID, r.StartedAt, r.EndedAt,
			r.Distance, r.Duration, strPtrToNull(r.MoodText), r.DominantColor,
		); err != nil {
			return fmt.Errorf("replace all insert ride: %w", err)
		}
		for i, p := range r.Photos {
			if _, err = tx.ExecContext(ctx,
				`INSERT INTO ride_photos (id, ride_id, cos_key, cos_url, color, taken_at, caption, vlm_status, order_index)
				      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
				p.ID, r.ID, p.COSKey, p.COSURL, p.Color, p.TakenAt,
				strPtrToNull(p.Caption), p.VLMStatus, i,
			); err != nil {
				return fmt.Errorf("replace all insert photo: %w", err)
			}
		}
	}
	return nil
}

// photosForRides fetches every ride_photos row for a set of ride ids, returning
// them grouped by ride id. Single query, single round trip.
func (s *Store) photosForRides(ctx context.Context, ids []string) (map[string][]models.Photo, error) {
	out := map[string][]models.Photo{}
	if len(ids) == 0 {
		return out, nil
	}
	// build $1,$2,... placeholders. Tiny helper; pgx supports ANY($1::text[])
	// but the placeholder form keeps this driver-agnostic.
	args := make([]any, len(ids))
	ph := ""
	for i, id := range ids {
		if i > 0 {
			ph += ","
		}
		ph += fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	q := `SELECT id, ride_id, cos_key, cos_url, color, taken_at, caption,
	             vlm_status, order_index, created_at
	        FROM ride_photos
	       WHERE ride_id IN (` + ph + `)
	       ORDER BY ride_id, order_index`
	rows, err := s.DB.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("photos for rides: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var p models.Photo
		var cap sql.NullString
		if err := rows.Scan(&p.ID, &p.RideID, &p.COSKey, &p.COSURL, &p.Color,
			&p.TakenAt, &cap, &p.VLMStatus, &p.OrderIndex, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("photos scan: %w", err)
		}
		p.Caption = nullableString(cap)
		out[p.RideID] = append(out[p.RideID], p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("photos rows: %w", err)
	}
	return out, nil
}
