// Package version exposes the build version, injected at build time via -ldflags.
package version

// Version is the build identifier. Override at build time:
//
//	go build -ldflags "-X github.com/auraride/auraride/apps/api/internal/version.Version=$(git rev-parse --short HEAD)"
var Version = "dev"
