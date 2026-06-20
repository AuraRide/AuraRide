package db

import (
	"errors"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	// postgres migrate driver registers itself with the URL scheme "postgres://".
	// We use lib/pq under the hood here (for migration only); the runtime app
	// queries via pgx/v5 stdlib in db.go.
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	"github.com/auraride/auraride/apps/api/internal/migrations"
)

// RunMigrations applies every embedded migration up to head. Idempotent.
func RunMigrations(dbURL string) error {
	src, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("migrate: iofs source: %w", err)
	}
	// postgres driver accepts the standard postgres:// URL as-is.
	m, err := migrate.NewWithSourceInstance("iofs", src, dbURL)
	if err != nil {
		return fmt.Errorf("migrate: open: %w", err)
	}
	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("migrate: up: %w", err)
	}
	return nil
}

