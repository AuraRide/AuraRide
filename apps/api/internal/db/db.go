// Package db wires up Postgres and Redis connections + migrations.
package db

import (
	"database/sql"
	"fmt"
	"time"

	// pgx stdlib driver — registered as "pgx" with database/sql.
	_ "github.com/jackc/pgx/v5/stdlib"
)

// OpenPostgres opens *sql.DB backed by pgx. Caller is responsible for Ping + Close.
func OpenPostgres(dsn string) (*sql.DB, error) {
	if dsn == "" {
		return nil, fmt.Errorf("db: empty POSTGRES_URL")
	}
	pg, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("db: open: %w", err)
	}
	// Sane defaults for a 2C4G box; tune later if pgx complains.
	pg.SetMaxOpenConns(20)
	pg.SetMaxIdleConns(4)
	pg.SetConnMaxLifetime(30 * time.Minute)
	pg.SetConnMaxIdleTime(5 * time.Minute)
	return pg, nil
}
