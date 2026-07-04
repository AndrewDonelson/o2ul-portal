package middleware

import (
	"context"
	"net/http"
	"strings"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
)

type contextKey string

const (
	claimsKey contextKey = "claims"
)

type TokenParser interface {
	Parse(token string) (application.TokenClaims, error)
}

func RequireAuth(tokens TokenParser) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, "missing bearer token", http.StatusUnauthorized)
				return
			}
			tkn := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := tokens.Parse(tkn)
			if err != nil {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func ClaimsFromContext(ctx context.Context) (application.TokenClaims, bool) {
	claims, ok := ctx.Value(claimsKey).(application.TokenClaims)
	return claims, ok
}

func RequireRole(required domain.Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := ClaimsFromContext(r.Context())
			if !ok {
				http.Error(w, "missing auth claims", http.StatusUnauthorized)
				return
			}
			if !domain.CanActAs(claims.Role, required) {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
