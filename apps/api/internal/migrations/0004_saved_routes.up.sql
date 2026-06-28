-- saved_routes — 待出行路线 a rider copied from a 广场 post. Carries the
-- normalised shape + distance so the front end can replan a fresh real route
-- of that length from the rider's current location at ride-time.
CREATE TABLE saved_routes (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_post_id  TEXT REFERENCES posts(id) ON DELETE SET NULL,
    color_id      TEXT NOT NULL,
    city          TEXT NOT NULL,
    distance_km   DOUBLE PRECISION NOT NULL,
    duration_min  INTEGER NOT NULL,
    route_shape   JSONB NOT NULL,
    cover_color   TEXT NOT NULL,
    caption       TEXT,
    saved_at      BIGINT NOT NULL,
    created_ts    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 1 user 不能重复收藏同一条 post(NULL from_post_id 例外:手搓的也允许多条)
CREATE UNIQUE INDEX uq_saved_routes_user_post
    ON saved_routes(user_id, from_post_id) WHERE from_post_id IS NOT NULL;
CREATE INDEX idx_saved_routes_user ON saved_routes(user_id, saved_at DESC);
