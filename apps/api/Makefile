# AuraRide API — common dev tasks.
#
# Set GOPROXY locally to the China mirror before any go-network command:
#   export GOPROXY=https://goproxy.cn,direct

GO       ?= go
BIN_DIR  := bin
BINARY   := $(BIN_DIR)/api
PKG      := ./...
SHA      := $(shell git rev-parse --short HEAD 2>/dev/null || echo dev)
LDFLAGS  := -s -w -X github.com/auraride/auraride/apps/api/internal/version.Version=$(SHA)

.PHONY: build run test test-race tidy clean lint

build: ## compile the api binary into ./bin/api
	@mkdir -p $(BIN_DIR)
	$(GO) build -trimpath -ldflags "$(LDFLAGS)" -o $(BINARY) ./cmd/api

run: ## go run with .env loaded
	$(GO) run ./cmd/api

test: ## unit tests
	$(GO) test $(PKG) -count=1

test-race: ## race-flagged tests (CI default)
	$(GO) test $(PKG) -count=1 -race

tidy:
	$(GO) mod tidy

clean:
	rm -rf $(BIN_DIR) tmp
