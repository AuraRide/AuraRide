// Package models holds the row structs + JSON DTOs.
//
// The JSON tags are the **wire contract** with the front end. They mirror
// apps/web/src/app/lib/rideRepo.ts (PublicUser / Post) and journal.ts
// (RideRecord / RidePhoto). Changing a JSON tag here breaks the front end.
package models

import "time"

// User is the DB row for `users`.
type User struct {
	ID              string    `json:"id"`
	Handle          string    `json:"handle"`
	AvatarColor     string    `json:"avatarColor"`
	DominantColorID string    `json:"dominantColorId"`
	CreatedAt       time.Time `json:"-"`
}

// PublicUserJSON is the shape returned by GET /api/me — must match
// rideRepo.ts > PublicUser exactly.
type PublicUserJSON struct {
	ID              string `json:"id"`
	Handle          string `json:"handle"`
	AvatarColor     string `json:"avatarColor"`
	DominantColorID string `json:"dominantColorId"`
}

func (u User) ToPublicJSON() PublicUserJSON {
	return PublicUserJSON{
		ID: u.ID, Handle: u.Handle,
		AvatarColor: u.AvatarColor, DominantColorID: u.DominantColorID,
	}
}
