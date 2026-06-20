package seed

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"

	"github.com/auraride/auraride/apps/api/internal/config"
	"github.com/auraride/auraride/apps/api/internal/models"
	"github.com/auraride/auraride/apps/api/internal/store"
)

const markerKey = "v1"

// RunIfEnabled inserts the demo dataset once per database. Subsequent calls
// notice the marker row and return immediately.
//
// The whole load runs in a single transaction so a partial failure (network
// blip mid-load) leaves the DB clean.
func RunIfEnabled(ctx context.Context, s *store.Store, cfg *config.Config) error {
	if s == nil || s.DB == nil {
		return errors.New("seed: store has no DB handle")
	}

	// Atomically claim the marker — if INSERT touches 0 rows the seed already ran.
	res, err := s.DB.ExecContext(ctx,
		`INSERT INTO seed_marker (key) VALUES ($1) ON CONFLICT DO NOTHING`, markerKey)
	if err != nil {
		return fmt.Errorf("seed: claim marker: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("seed: marker rows: %w", err)
	}
	if n == 0 {
		log.Print("seed: marker already present — skipping")
		return nil
	}

	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("seed: begin tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	if err = seedUsers(ctx, tx); err != nil {
		return err
	}
	if err = seedRides(ctx, tx, cfg); err != nil {
		return err
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("seed: commit: %w", err)
	}
	log.Printf("seed: inserted %d users + %d rides", len(Users), len(Rides))
	return nil
}

func seedUsers(ctx context.Context, tx *sql.Tx) error {
	for _, u := range Users {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO users (id, handle, avatar_color, dominant_color_id)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (id) DO NOTHING`,
			u.ID, u.Handle, u.AvatarColor, u.DominantColorID,
		); err != nil {
			return fmt.Errorf("seed user %s: %w", u.ID, err)
		}
	}
	return nil
}

func seedRides(ctx context.Context, tx *sql.Tx, cfg *config.Config) error {
	for i, r := range Rides {
		mood := r.MoodText
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO rides (id, user_id, color_id, started_at, ended_at,
			                    distance_km, duration_sec, mood_text, dominant_color)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			 ON CONFLICT (id) DO NOTHING`,
			r.ID, r.UserID, r.ColorID,
			r.StartedAt, r.StartedAt+int64(r.DurationSec*1000),
			r.Distance, r.DurationSec, mood, r.DominantColor,
		); err != nil {
			return fmt.Errorf("seed ride %s: %w", r.ID, err)
		}

		// Photos — 5–6 per ride.
		photoURLs := make([]string, 0, r.PhotoCount)
		for _, p := range buildPhotos(r, cfg.COSBucket, cfg.COSRegion) {
			cap := p.Caption
			if _, err := tx.ExecContext(ctx,
				`INSERT INTO ride_photos
				   (id, ride_id, cos_key, cos_url, color, taken_at, caption, vlm_status, order_index)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
				 ON CONFLICT (id) DO NOTHING`,
				p.ID, p.RideID, p.COSKey, p.COSURL, p.Color, p.TakenAt,
				nullableCap(cap), p.VLMStatus, p.OrderIndex,
			); err != nil {
				return fmt.Errorf("seed photo %s: %w", p.ID, err)
			}
			photoURLs = append(photoURLs, p.COSURL)
		}

		// Post — every seed ride is also published, so 广场 is non-empty out of the box.
		post := models.Post{
			ID:          "post-" + r.ID,
			RideID:      r.ID,
			AuthorID:    r.UserID,
			ColorID:     r.ColorID,
			City:        r.City,
			DistanceKm:  r.Distance,
			DurationMin: r.DurationSec / 60,
			MoodText:    &mood,
			Caption:     &mood,
			CoverColor:  r.DominantColor,
			RouteShape:  shapeFromSeed(int64(97+i*53), 14),
			PhotoURLs:   photoURLs,
			Likes:       12 + i*27,
			PublishedAt: r.StartedAt + 3_600_000,
		}
		if err := insertPostTx(ctx, tx, post); err != nil {
			return err
		}
	}
	return nil
}

// nullableCap mirrors store.strPtrToNull but kept local so seed doesn't reach
// into store internals.
func nullableCap(s *string) any {
	if s == nil {
		return nil
	}
	return *s
}

func insertPostTx(ctx context.Context, tx *sql.Tx, p models.Post) error {
	shape, err := marshalJSON(p.RouteShape)
	if err != nil {
		return err
	}
	urls, err := marshalJSON(p.PhotoURLs)
	if err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO posts
		   (id, ride_id, author_id, color_id, city, distance_km, duration_min,
		    mood_text, caption, cover_color, route_shape, photo_urls, likes, published_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		 ON CONFLICT (id) DO NOTHING`,
		p.ID, p.RideID, p.AuthorID, p.ColorID, p.City, p.DistanceKm, p.DurationMin,
		nullableCap(p.MoodText), nullableCap(p.Caption), p.CoverColor,
		shape, urls, p.Likes, p.PublishedAt,
	); err != nil {
		return fmt.Errorf("seed post %s: %w", p.ID, err)
	}
	return nil
}
