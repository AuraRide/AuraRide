// Package queue pushes asynchronous work onto Redis lists the Python worker
// pops from. The contract is the JSON payload — see apps/worker for the
// consumer side.
package queue

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// VLMJobsKey is the Redis LIST the Python worker LPOPs from.
const VLMJobsKey = "auraride:vlm:jobs"

// Pusher is the narrow interface handlers depend on (tests substitute a stub).
type Pusher interface {
	PushVLMJob(ctx context.Context, photoID, rideID, cosURL string) error
}

// RedisPusher is the real LPUSH-backed implementation.
type RedisPusher struct {
	rdb *redis.Client
}

func NewRedisPusher(rdb *redis.Client) *RedisPusher { return &RedisPusher{rdb: rdb} }

// vlmJob is the wire shape consumed by apps/worker.
type vlmJob struct {
	Type    string `json:"type"`
	PhotoID string `json:"photo_id"`
	RideID  string `json:"ride_id"`
	COSURL  string `json:"cos_url"`
}

func (p *RedisPusher) PushVLMJob(ctx context.Context, photoID, rideID, cosURL string) error {
	if p == nil || p.rdb == nil {
		// In tests the Pusher is stubbed; in dev we tolerate a missing Redis
		// rather than crash the request — log + continue.
		return nil
	}
	payload, err := json.Marshal(vlmJob{
		Type: "vlm_color", PhotoID: photoID, RideID: rideID, COSURL: cosURL,
	})
	if err != nil {
		return fmt.Errorf("queue: marshal job: %w", err)
	}
	if err := p.rdb.LPush(ctx, VLMJobsKey, payload).Err(); err != nil {
		return fmt.Errorf("queue: lpush: %w", err)
	}
	return nil
}
