package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/auraride/auraride/apps/api/internal/models"
)

// ListSavedRoutes returns one user's 待出行路线, most-recently-saved first.
func (s *Store) ListSavedRoutes(ctx context.Context, userID string) ([]models.SavedRoute, error) {
	ctx = ctxOrBackground(ctx)
	const q = `SELECT id, user_id, from_post_id, color_id, city,
	                  distance_km, duration_min, route_shape, cover_color,
	                  caption, saved_at, created_ts
	             FROM saved_routes
	            WHERE user_id = $1
	            ORDER BY saved_at DESC
	            LIMIT 100`
	rows, err := s.DB.QueryContext(ctx, q, userID)
	if err != nil {
		return nil, fmt.Errorf("list saved routes: %w", err)
	}
	defer rows.Close()
	var out []models.SavedRoute
	for rows.Next() {
		r, err := scanSavedRoute(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list saved routes rows: %w", err)
	}
	return out, nil
}

// InsertSavedRoute writes a new 待出行 row, or returns the existing one when
// (user_id, from_post_id) already exists (UNIQUE index) — front end shows a
// "已收藏" toast instead of a 500.
func (s *Store) InsertSavedRoute(ctx context.Context, r models.SavedRoute) (*models.SavedRoute, error) {
	ctx = ctxOrBackground(ctx)
	if r.FromPostID != nil {
		// Verify the source post exists so we don't FK-fail later.
		var exists bool
		if err := s.DB.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM posts WHERE id = $1)`, *r.FromPostID,
		).Scan(&exists); err != nil {
			return nil, fmt.Errorf("saved route post check: %w", err)
		}
		if !exists {
			return nil, ErrNotFound
		}
	}
	shape, err := json.Marshal(r.RouteShape)
	if err != nil {
		return nil, fmt.Errorf("saved route shape: %w", err)
	}
	if _, err := s.DB.ExecContext(ctx,
		`INSERT INTO saved_routes
		   (id, user_id, from_post_id, color_id, city, distance_km, duration_min,
		    route_shape, cover_color, caption, saved_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		 ON CONFLICT (user_id, from_post_id) WHERE from_post_id IS NOT NULL DO NOTHING`,
		r.ID, r.UserID, r.FromPostID, r.ColorID, r.City, r.DistanceKm, r.DurationMin,
		string(shape), r.CoverColor, strPtrToNull(r.Caption), r.SavedAt,
	); err != nil {
		return nil, fmt.Errorf("insert saved route: %w", err)
	}
	// Re-read by (user_id, from_post_id) — handles both the inserted-now case
	// and the already-existed case the same way.
	return s.getSavedRouteByPair(ctx, r.UserID, r.FromPostID, r.ID)
}

// DeleteSavedRoute removes a row scoped to userID — returns ErrNotFound if
// the row doesn't exist OR belongs to someone else (no existence leak).
func (s *Store) DeleteSavedRoute(ctx context.Context, userID, id string) error {
	ctx = ctxOrBackground(ctx)
	res, err := s.DB.ExecContext(ctx,
		`DELETE FROM saved_routes WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete saved route: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("delete saved route rows: %w", err)
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// ListSavedPostIds returns the from_post_id values for one user — front end
// uses this to mark "已收藏" on each post card without listing every full row.
func (s *Store) ListSavedPostIds(ctx context.Context, userID string) ([]string, error) {
	ctx = ctxOrBackground(ctx)
	rows, err := s.DB.QueryContext(ctx,
		`SELECT from_post_id FROM saved_routes
		  WHERE user_id = $1 AND from_post_id IS NOT NULL
		  ORDER BY saved_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list saved ids: %w", err)
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var id sql.NullString
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan saved id: %w", err)
		}
		if id.Valid {
			out = append(out, id.String)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list saved ids rows: %w", err)
	}
	return out, nil
}

// getSavedRouteByPair fetches a SavedRoute row for one user. Used after insert
// to read back whatever ended up in the DB (could be the new row or the
// pre-existing one if the user double-tapped 收藏).
func (s *Store) getSavedRouteByPair(ctx context.Context, userID string, fromPostID *string, fallbackID string) (*models.SavedRoute, error) {
	var (
		row     *sql.Row
		baseSQL = `SELECT id, user_id, from_post_id, color_id, city,
		                  distance_km, duration_min, route_shape, cover_color,
		                  caption, saved_at, created_ts
		             FROM saved_routes
		            WHERE user_id = $1 AND `
	)
	if fromPostID != nil {
		row = s.DB.QueryRowContext(ctx, baseSQL+`from_post_id = $2`, userID, *fromPostID)
	} else {
		row = s.DB.QueryRowContext(ctx, baseSQL+`id = $2`, userID, fallbackID)
	}
	r, err := scanSavedRoute(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return r, nil
}

// scanSavedRoute reads either *sql.Row or *sql.Rows into a SavedRoute.
func scanSavedRoute(r rowScanner) (*models.SavedRoute, error) {
	var (
		sr      models.SavedRoute
		fromPID sql.NullString
		cap     sql.NullString
		shape   []byte
	)
	if err := r.Scan(
		&sr.ID, &sr.UserID, &fromPID, &sr.ColorID, &sr.City,
		&sr.DistanceKm, &sr.DurationMin, &shape, &sr.CoverColor,
		&cap, &sr.SavedAt, &sr.CreatedTS,
	); err != nil {
		return nil, err
	}
	sr.FromPostID = nullableString(fromPID)
	sr.Caption = nullableString(cap)
	if len(shape) > 0 {
		if err := json.Unmarshal(shape, &sr.RouteShape); err != nil {
			return nil, fmt.Errorf("decode saved route shape: %w", err)
		}
	}
	return &sr, nil
}

