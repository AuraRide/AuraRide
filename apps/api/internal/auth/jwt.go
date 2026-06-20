// Package auth signs/parses the API's session JWTs.
//
// MVP scope: this is a thin HS256 wrapper. The middleware will fall back to a
// fixed "me" user when no token is presented, so the front end can exercise
// every endpoint without an auth provider yet.
//
// TODO(post-mvp): replace SignJWT call sites with Apple Sign In token
// exchange, and remove the "me" fallback in middleware/auth.go.
package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the JSON body we put into the JWT. UserID is the only thing the
// API genuinely needs to authorize a request.
type Claims struct {
	UserID string `json:"uid"`
	jwt.RegisteredClaims
}

// SignJWT mints a token valid for ttl from now, signed with secret.
func SignJWT(userID, secret string, ttl time.Duration) (string, error) {
	if userID == "" {
		return "", errors.New("auth: SignJWT empty userID")
	}
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "auraride-api",
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := tok.SignedString([]byte(secret))
	if err != nil {
		return "", fmt.Errorf("auth: sign: %w", err)
	}
	return s, nil
}

// ParseJWT verifies + decodes a token. Returns ErrUnauthorized on any failure.
func ParseJWT(raw, secret string) (*Claims, error) {
	tok, err := jwt.ParseWithClaims(raw, &Claims{}, func(t *jwt.Token) (any, error) {
		if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, fmt.Errorf("auth: unexpected alg %s", t.Method.Alg())
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, fmt.Errorf("auth: parse: %w", err)
	}
	claims, ok := tok.Claims.(*Claims)
	if !ok || !tok.Valid {
		return nil, errors.New("auth: invalid token")
	}
	return claims, nil
}
