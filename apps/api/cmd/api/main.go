// Command api is the AuraRide HTTP entrypoint. See apps/api/README.md.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/auraride/auraride/apps/api/internal/config"
	"github.com/auraride/auraride/apps/api/internal/cos"
	"github.com/auraride/auraride/apps/api/internal/db"
	"github.com/auraride/auraride/apps/api/internal/handlers"
	"github.com/auraride/auraride/apps/api/internal/middleware"
	"github.com/auraride/auraride/apps/api/internal/seed"
	"github.com/auraride/auraride/apps/api/internal/store"
	"github.com/auraride/auraride/apps/api/internal/version"
)

func main() {
	// .env is best-effort — production reads from systemd EnvironmentFile.
	_ = godotenv.Load()

	cfg := config.MustLoad()
	log.Printf("auraride-api %s starting (env=%s, port=%s)", version.Version, cfg.Env, cfg.Port)

	pg, err := db.OpenPostgres(cfg.PostgresURL)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	defer pg.Close()

	pingCtx, pingCancel := context.WithTimeout(context.Background(), 5*time.Second)
	if err := pg.PingContext(pingCtx); err != nil {
		pingCancel()
		log.Fatalf("db ping: %v", err)
	}
	pingCancel()

	if err := db.RunMigrations(cfg.PostgresURL); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	log.Print("migrations applied")

	rdb := db.OpenRedis(cfg.RedisURL)
	redisPingCtx, redisCancel := context.WithTimeout(context.Background(), 5*time.Second)
	if err := rdb.Ping(redisPingCtx).Err(); err != nil {
		redisCancel()
		log.Fatalf("redis ping: %v", err)
	}
	redisCancel()
	defer rdb.Close()

	cosClient := cos.NewClient(cfg)

	st := store.New(pg, rdb)
	if cfg.SeedEnabled {
		log.Print("SEED_ENABLED=true — running seed.RunIfEnabled")
		if err := seed.RunIfEnabled(context.Background(), st, cfg); err != nil {
			// Seeding is best-effort: log and continue so a re-seed mistake
			// doesn't take the API down.
			log.Printf("seed: %v (continuing)", err)
		}
	}

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS(cfg.Env))

	api := handlers.New(st, cfg, cosClient)
	api.Register(r)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Print("shutting down...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("shutdown: %v", err)
	}
	log.Print("bye")
}
