package httpinfra

import (
	"errors"
	"time"

	"com.nlaak.backend-template/internal/application"
	"com.nlaak.backend-template/internal/domain"
	"github.com/golang-jwt/jwt/v5"
)

type tokenClaims struct {
	PlayerID string      `json:"playerId"`
	Email    string      `json:"email"`
	Username string      `json:"username"`
	Role     domain.Role `json:"role"`
	jwt.RegisteredClaims
}

type JWTService struct {
	secret []byte
	ttl    time.Duration
}

func NewJWTService(secret string, ttl time.Duration) *JWTService {
	return &JWTService{secret: []byte(secret), ttl: ttl}
}

func (s *JWTService) Issue(player domain.Player) (string, error) {
	now := time.Now().UTC()
	exp := now.Add(s.ttl)
	claims := tokenClaims{
		PlayerID: player.ID,
		Email:    player.Email,
		Username: player.Username,
		Role:     player.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	tkn := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tkn.SignedString(s.secret)
}

func (s *JWTService) Parse(token string) (application.TokenClaims, error) {
	claims := &tokenClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (any, error) {
		if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, errors.New("invalid signing method")
		}
		return s.secret, nil
	})
	if err != nil || !parsed.Valid {
		return application.TokenClaims{}, errors.New("invalid token")
	}
	if claims.ExpiresAt == nil {
		return application.TokenClaims{}, errors.New("invalid claims")
	}
	return application.TokenClaims{
		PlayerID:  claims.PlayerID,
		Email:     claims.Email,
		Username:  claims.Username,
		Role:      claims.Role,
		ExpiresAt: claims.ExpiresAt.Unix(),
	}, nil
}
