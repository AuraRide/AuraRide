// Package migrations embeds the .sql migration files so they ship inside the
// single Go binary (no extra files to scp).
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
