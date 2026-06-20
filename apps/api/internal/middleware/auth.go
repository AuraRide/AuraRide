// Package middleware — auth.go documents the auth fallback strategy.
//
// The active AuthMiddleware lives on handlers.API (it needs cfg.JWTSecret).
// This file exists so future contributors who grep "auth middleware" land
// somewhere useful.
//
// Current behaviour (MVP):
//   - Authorization: Bearer <JWT>  → parsed; on success c.Set("userID", claims.UserID)
//   - missing header / bad token   → c.Set("userID", "me")  (front-end demo path)
//
// TODO(post-mvp): swap the fallback for a 401 once Apple Sign In is wired.
package middleware
