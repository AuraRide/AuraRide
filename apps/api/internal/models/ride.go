package models

import "time"

// Ride is the DB row for `rides`.
type Ride struct {
	ID            string
	UserID        string
	ColorID       string
	StartedAt     int64 // unix ms
	EndedAt       int64 // unix ms
	Distance      float64
	Duration      int // seconds
	MoodText      *string
	DominantColor string
	CreatedAt     time.Time
	UpdatedAt     time.Time

	// Photos is populated by Store.GetRide / Store.ListRides — not a column.
	Photos []Photo
}

// Photo is the DB row for `ride_photos`.
type Photo struct {
	ID         string
	RideID     string
	COSKey     string
	COSURL     string
	Color      string
	TakenAt    int64 // unix ms
	Caption    *string
	VLMStatus  string // "pending" | "done" | "failed"
	OrderIndex int
	CreatedAt  time.Time
}

// PhotoJSON mirrors apps/web/src/app/lib/journal.ts > RidePhoto.
// Note: front-end calls the URL field `dataUrl` (history: data URLs in local
// mode). We keep the same key so the front end ships with zero changes.
type PhotoJSON struct {
	DataURL string  `json:"dataUrl"`
	Color   string  `json:"color"`
	TakenAt int64   `json:"takenAt"`
	Caption *string `json:"caption,omitempty"`
}

// RideJSON mirrors apps/web/src/app/lib/journal.ts > RideRecord.
type RideJSON struct {
	ID            string      `json:"id"`
	ColorID       string      `json:"colorId"`
	StartedAt     int64       `json:"startedAt"`
	EndedAt       int64       `json:"endedAt"`
	Distance      float64     `json:"distance"`
	Duration      int         `json:"duration"`
	MoodText      *string     `json:"moodText,omitempty"`
	Photos        []PhotoJSON `json:"photos"`
	DominantColor string      `json:"dominantColor"`
}

func (p Photo) ToJSON() PhotoJSON {
	return PhotoJSON{
		DataURL: p.COSURL,
		Color:   p.Color,
		TakenAt: p.TakenAt,
		Caption: p.Caption,
	}
}

func (r Ride) ToJSON() RideJSON {
	photos := make([]PhotoJSON, len(r.Photos))
	for i, p := range r.Photos {
		photos[i] = p.ToJSON()
	}
	return RideJSON{
		ID: r.ID, ColorID: r.ColorID,
		StartedAt: r.StartedAt, EndedAt: r.EndedAt,
		Distance: r.Distance, Duration: r.Duration,
		MoodText: r.MoodText, Photos: photos,
		DominantColor: r.DominantColor,
	}
}

// FromRideJSON inflates a wire DTO into a row + nested photos. The photo COS
// fields are filled with the wire `dataUrl` as a fallback for tests/seed; in
// production photos arrive via the 3-step upload flow and the SaveRide
// handler ignores the embedded photos array.
func FromRideJSON(j RideJSON, userID string) Ride {
	photos := make([]Photo, len(j.Photos))
	for i, p := range j.Photos {
		photos[i] = Photo{
			ID:         j.ID + "-p" + itoa(i),
			RideID:     j.ID,
			COSKey:     "",
			COSURL:     p.DataURL,
			Color:      p.Color,
			TakenAt:    p.TakenAt,
			Caption:    p.Caption,
			VLMStatus:  "done",
			OrderIndex: i,
		}
	}
	return Ride{
		ID: j.ID, UserID: userID, ColorID: j.ColorID,
		StartedAt: j.StartedAt, EndedAt: j.EndedAt,
		Distance: j.Distance, Duration: j.Duration,
		MoodText: j.MoodText, DominantColor: j.DominantColor,
		Photos: photos,
	}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
