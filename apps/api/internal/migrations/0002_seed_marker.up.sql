-- Tracks which seed batch has been applied. seed.RunIfEnabled checks for the
-- 'v1' key and refuses to run twice on the same DB.
CREATE TABLE IF NOT EXISTS seed_marker (
    key        TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
