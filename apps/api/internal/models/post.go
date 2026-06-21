package models

import "time"

// Post is the DB row for `posts`.
type Post struct {
	ID          string
	RideID      string
	AuthorID    string
	ColorID     string
	City        string
	DistanceKm  float64
	DurationMin int
	MoodText    *string
	Caption     *string
	CoverColor  string
	RouteShape  [][2]float64 // JSONB column
	PhotoURLs   []string     // JSONB column
	Likes       int
	PublishedAt int64 // unix ms
	CreatedAt   time.Time

	// Author + LikedByMe are joined in at read time, never stored on this row.
	Author     PublicUserJSON
	LikedByMe  bool
}

// PostJSON mirrors apps/web/src/app/lib/rideRepo.ts > Post.
type PostJSON struct {
	ID          string         `json:"id"`
	Author      PublicUserJSON `json:"author"`
	ColorID     string         `json:"colorId"`
	City        string         `json:"city"`
	DistanceKm  float64        `json:"distanceKm"`
	DurationMin int            `json:"durationMin"`
	MoodText    *string        `json:"moodText,omitempty"`
	Caption     *string        `json:"caption,omitempty"`
	CoverColor  string         `json:"coverColor"`
	RouteShape  [][2]float64   `json:"routeShape"`
	PhotoURLs   []string       `json:"photoUrls"`
	Likes       int            `json:"likes"`
	LikedByMe   bool           `json:"likedByMe"`
	PublishedAt int64          `json:"publishedAt"`
}

func (p Post) ToJSON() PostJSON {
	urls := p.PhotoURLs
	if urls == nil {
		urls = []string{}
	}
	shape := p.RouteShape
	if shape == nil {
		shape = [][2]float64{}
	}
	return PostJSON{
		ID: p.ID, Author: p.Author, ColorID: p.ColorID,
		City: p.City, DistanceKm: p.DistanceKm, DurationMin: p.DurationMin,
		MoodText: p.MoodText, Caption: p.Caption,
		CoverColor: p.CoverColor, RouteShape: shape, PhotoURLs: urls,
		Likes: p.Likes, LikedByMe: p.LikedByMe, PublishedAt: p.PublishedAt,
	}
}
