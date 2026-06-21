CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users ---------------------------------------------------------------------
CREATE TABLE users (
    id                TEXT PRIMARY KEY,
    handle            TEXT NOT NULL UNIQUE,
    avatar_color      TEXT NOT NULL,
    dominant_color_id TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- rides ---------------------------------------------------------------------
CREATE TABLE rides (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    color_id        TEXT NOT NULL,
    started_at      BIGINT NOT NULL,
    ended_at        BIGINT NOT NULL,
    distance_km     DOUBLE PRECISION NOT NULL,
    duration_sec    INTEGER NOT NULL,
    mood_text       TEXT,
    dominant_color  TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rides_user_started ON rides(user_id, started_at DESC);

-- ride_photos ---------------------------------------------------------------
CREATE TABLE ride_photos (
    id          TEXT PRIMARY KEY,
    ride_id     TEXT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    cos_key     TEXT NOT NULL,
    cos_url     TEXT NOT NULL,
    color       TEXT NOT NULL DEFAULT '#888888',
    taken_at    BIGINT NOT NULL,
    caption     TEXT,
    vlm_status  TEXT NOT NULL DEFAULT 'pending',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_photos_ride ON ride_photos(ride_id, order_index);
CREATE INDEX idx_photos_vlm_pending ON ride_photos(vlm_status) WHERE vlm_status = 'pending';

-- posts ---------------------------------------------------------------------
CREATE TABLE posts (
    id              TEXT PRIMARY KEY,
    ride_id         TEXT NOT NULL UNIQUE REFERENCES rides(id) ON DELETE CASCADE,
    author_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    color_id        TEXT NOT NULL,
    city            TEXT NOT NULL,
    distance_km     DOUBLE PRECISION NOT NULL,
    duration_min    INTEGER NOT NULL,
    mood_text       TEXT,
    caption         TEXT,
    cover_color     TEXT NOT NULL,
    route_shape     JSONB NOT NULL,
    photo_urls      JSONB NOT NULL DEFAULT '[]'::jsonb,
    likes           INTEGER NOT NULL DEFAULT 0,
    published_at    BIGINT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_published ON posts(published_at DESC);
CREATE INDEX idx_posts_color     ON posts(color_id, published_at DESC);
CREATE INDEX idx_posts_city      ON posts(city, published_at DESC);
CREATE INDEX idx_posts_hot       ON posts(likes DESC, published_at DESC);

-- post_likes ----------------------------------------------------------------
CREATE TABLE post_likes (
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);
CREATE INDEX idx_likes_post ON post_likes(post_id);
