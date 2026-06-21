// Package store is the data-access layer. It speaks raw SQL via database/sql.
// All methods take a context and return models or sentinel errors.
package store

import (
	"context"
	"database/sql"
	"errors"

	"github.com/redis/go-redis/v9"
)

// ErrNotFound is returned when a row is missing. Handlers translate this to 404.
var ErrNotFound = errors.New("store: not found")

// Store is the concrete implementation backed by Postgres + Redis. Handlers
// hold this via the Querier interface (handlers/handlers.go) so tests can
// substitute a stub without spinning up a database.
type Store struct {
	DB  *sql.DB
	RDB *redis.Client
}

// New constructs a Store. Both args may be nil in tests that hit a stub Querier
// instead — but callers using this Store directly must pass real handles.
func New(pg *sql.DB, rdb *redis.Client) *Store {
	return &Store{DB: pg, RDB: rdb}
}

// FeedFilter mirrors the query params on GET /api/posts.
type FeedFilter struct {
	ColorID string
	City    string
	Sort    string // "new" (default) | "hot"
}

// nullableString unwraps sql.NullString into *string.
func nullableString(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	s := ns.String
	return &s
}

// strPtrToNull packs *string into sql.NullString for parameterised inserts.
func strPtrToNull(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}

// txClose runs commit on success, rollback on err.
func txClose(tx *sql.Tx, err *error) {
	if *err != nil {
		_ = tx.Rollback()
		return
	}
	if cerr := tx.Commit(); cerr != nil {
		*err = cerr
	}
}

// ctxOrBackground returns ctx if non-nil, context.Background otherwise — tiny
// guard so test stubs that forget to pass a context don't NPE.
func ctxOrBackground(ctx context.Context) context.Context {
	if ctx == nil {
		return context.Background()
	}
	return ctx
}
