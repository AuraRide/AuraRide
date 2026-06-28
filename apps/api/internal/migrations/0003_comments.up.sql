-- comments on 广场 posts — append-only, scoped by post_id with the author
-- exposed for the UI to render the avatar + handle on each row.
CREATE TABLE comments (
    id         TEXT PRIMARY KEY,
    post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text       TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    -- bookkeeping (not in JSON wire format)
    created_ts TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_post ON comments(post_id, created_at DESC);
CREATE INDEX idx_comments_author ON comments(author_id);
