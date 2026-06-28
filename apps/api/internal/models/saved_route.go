package models

import "time"

// SavedRoute is the DB row for `saved_routes`.
// 待出行路线 — a normalised shape + distance copied from a 广场 post, planned
// but not yet ridden.
type SavedRoute struct {
	ID          string
	UserID      string
	FromPostID  *string // nullable — null if hand-rolled (not yet a feature)
	ColorID     string
	City        string
	DistanceKm  float64
	DurationMin int
	RouteShape  [][2]float64 // JSONB column
	CoverColor  string
	Caption     *string
	SavedAt     int64 // unix ms
	CreatedTS   time.Time
}

// SavedRouteJSON mirrors apps/web/src/app/lib/rideRepo.ts > SavedRoute.
type SavedRouteJSON struct {
	ID          string       `json:"id"`
	FromPostID  *string      `json:"fromPostId,omitempty"`
	ColorID     string       `json:"colorId"`
	City        string       `json:"city"`
	DistanceKm  float64      `json:"distanceKm"`
	DurationMin int          `json:"durationMin"`
	RouteShape  [][2]float64 `json:"routeShape"`
	CoverColor  string       `json:"coverColor"`
	Caption     *string      `json:"caption,omitempty"`
	SavedAt     int64        `json:"savedAt"`
}

func (s SavedRoute) ToJSON() SavedRouteJSON {
	shape := s.RouteShape
	if shape == nil {
		shape = [][2]float64{}
	}
	return SavedRouteJSON{
		ID: s.ID, FromPostID: s.FromPostID, ColorID: s.ColorID,
		City: s.City, DistanceKm: s.DistanceKm, DurationMin: s.DurationMin,
		RouteShape: shape, CoverColor: s.CoverColor,
		Caption: s.Caption, SavedAt: s.SavedAt,
	}
}
