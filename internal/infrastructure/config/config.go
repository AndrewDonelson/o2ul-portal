package config

import (
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	EnvFilePath                  string
	AppEnv                       string
	AppAddr                      string
	WebAddr                      string
	WebRootDir                   string
	WebTLSCertFile               string
	WebTLSKeyFile                string
	WebEnableHTTP3               bool
	OrchestratorAddr             string
	OrchestratorBackend          string
	ShutdownTimeoutSeconds       int
	ShutdownPhaseTimeoutSeconds  int
	ManagedStartupEnabled        bool
	ManagedStartupTimeoutSeconds int
	ManagedAPIService            string
	ManagedAPICommand            string
	ManagedAPIArgs               []string
	ManagedAPIHealthURL          string
	ManagedWebService            string
	ManagedWebCommand            string
	ManagedWebArgs               []string
	ManagedWebHealthURL          string
	OrchestratorControlToken     string
	ManagedAPIShutdownURL        string
	ManagedServerShutdownURL     string
	PostgresDSN                  string
	RedisAddr                    string
	RedisPassword                string
	RedisDB                      int
	JWTSecret                    string
	MasterAdminUsername          string
	MasterAdminEmail             string
	MasterAdminPassword          string
	SMTPHost                     string
	SMTPPort                     string
	SMTPUsername                 string
	SMTPPassword                 string
	SMTPFrom                     string
	OrchestratorLogURL           string
	StripeSecretKey              string
	StripeWebhookSecret          string
	StripePublishableKey         string
	SteamWebAPIKey               string
	SteamPublisherKey            string
	SteamUsername                string
	SteamLoginPassword           string
	SteamAppID                   string
	SteamWebhookSecret           string
}

func Load() Config {
	return LoadFor("API")
}

func LoadFor(component string) Config {
	_ = component

	envFilePath := loadEnvFile()

	cfg := Config{
		EnvFilePath:                  envFilePath,
		AppEnv:                       env("APP_ENV", "development"),
		AppAddr:                      env("APP_ADDR", ":8080"),
		WebAddr:                      env("WEB_ADDR", ":8081"),
		WebRootDir:                   env("WEB_ROOT_DIR", "./web/dist-app"),
		WebTLSCertFile:               env("WEB_TLS_CERT_FILE", ""),
		WebTLSKeyFile:                env("WEB_TLS_KEY_FILE", ""),
		WebEnableHTTP3:               envBool("WEB_ENABLE_HTTP3", true),
		OrchestratorAddr:             env("ORCHESTRATOR_ADDR", ":8090"),
		OrchestratorBackend:          env("ORCHESTRATOR_BACKEND", "systemd"),
		ShutdownTimeoutSeconds:       envInt("SHUTDOWN_TIMEOUT_SECONDS", 30),
		ShutdownPhaseTimeoutSeconds:  envInt("SHUTDOWN_PHASE_TIMEOUT_SECONDS", 10),
		ManagedStartupEnabled:        envBool("MANAGED_STARTUP_ENABLED", true),
		ManagedStartupTimeoutSeconds: envInt("MANAGED_STARTUP_TIMEOUT_SECONDS", 30),
		ManagedAPIService:            env("MANAGED_API_SERVICE", "api"),
		ManagedAPICommand:            env("MANAGED_API_COMMAND", "go"),
		ManagedAPIArgs:               envList("MANAGED_API_ARGS", []string{"run", "./cmd/api"}),
		ManagedAPIHealthURL:          env("MANAGED_API_HEALTH_URL", "http://localhost:8080/health"),
		ManagedWebService:            env("MANAGED_WEB_SERVICE", "web"),
		ManagedWebCommand:            env("MANAGED_WEB_COMMAND", "go"),
		ManagedWebArgs:               envList("MANAGED_WEB_ARGS", []string{"run", "./cmd/web"}),
		ManagedWebHealthURL:          env("MANAGED_WEB_HEALTH_URL", "http://localhost:8081/healthz"),
		OrchestratorControlToken:     env("ORCHESTRATOR_CONTROL_TOKEN", ""),
		ManagedAPIShutdownURL:        env("MANAGED_API_SHUTDOWN_URL", "http://localhost:8080/internal/shutdown"),
		ManagedServerShutdownURL:     env("MANAGED_SERVER_SHUTDOWN_URL", ""),
		PostgresDSN:                  env("POSTGRES_DSN", "postgres://postgres:postgres@localhost:5432/backend_template?sslmode=disable"),
		RedisAddr:                    env("REDIS_ADDR", "localhost:6379"),
		RedisPassword:                os.Getenv("REDIS_PASSWORD"),
		RedisDB:                      0,
		JWTSecret:                    env("JWT_SECRET", "replace-me"),
		MasterAdminUsername:          strings.TrimSpace(os.Getenv("MASTER_ADMIN_USERNAME")),
		MasterAdminEmail:             strings.TrimSpace(os.Getenv("MASTER_ADMIN_EMAIL")),
		MasterAdminPassword:          os.Getenv("MASTER_ADMIN_PASSWORD"),
		SMTPHost:                     strings.TrimSpace(os.Getenv("SMTP_HOST")),
		SMTPPort:                     strings.TrimSpace(os.Getenv("SMTP_PORT")),
		SMTPUsername:                 strings.TrimSpace(os.Getenv("SMTP_USERNAME")),
		SMTPPassword:                 os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:                     strings.TrimSpace(os.Getenv("SMTP_FROM")),
		OrchestratorLogURL:           os.Getenv("ORCHESTRATOR_LOG_URL"),
		StripePublishableKey:         os.Getenv("STRIPE_PUBLISHABLE_KEY"),
		StripeSecretKey:              os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhookSecret:          os.Getenv("STRIPE_WEBHOOK_SECRET"),
		SteamWebAPIKey:               os.Getenv("STEAM_WEB_API_KEY"),
		SteamPublisherKey:            os.Getenv("STEAM_PUBLISHER_KEY"),
		SteamUsername:                os.Getenv("STEAM_USERNAME"),
		SteamLoginPassword:           os.Getenv("STEAM_LOGIN_PWD"),
		SteamAppID:                   os.Getenv("STEAM_APP_ID"),
		SteamWebhookSecret:           os.Getenv("STEAM_WEBHOOK_SECRET"),
	}
	if cfg.JWTSecret == "replace-me" {
		if isDevelopmentEnv(cfg.AppEnv) {
			log.Fatalf("startup aborted: JWT_SECRET is using a default value in APP_ENV=%q", cfg.AppEnv)
		}
		log.Printf("warning: JWT_SECRET is using a default value")
	}
	if redisDBRaw := strings.TrimSpace(os.Getenv("REDIS_DB")); redisDBRaw != "" {
		if parsed, err := strconv.Atoi(redisDBRaw); err == nil {
			cfg.RedisDB = parsed
		}
	}
	return cfg
}

func env(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v
}

func envInt(key string, fallback int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return parsed
}

func envBool(key string, fallback bool) bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	if v == "" {
		return fallback
	}
	switch v {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}

func envList(key string, fallback []string) []string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	parts := strings.Fields(v)
	if len(parts) == 0 {
		return fallback
	}
	return parts
}

func loadEnvFile() string {
	path := findEnvFilePath()
	if path == "" {
		return ""
	}
	if err := godotenv.Overload(path); err != nil {
		return ""
	}
	return path
}

func findEnvFilePath() string {
	for _, start := range searchStartDirs() {
		if start == "" {
			continue
		}
		if found := searchUpwardForEnv(start); found != "" {
			return found
		}
	}

	homeDir, err := os.UserHomeDir()
	if err == nil {
		if found := pickEnvFileInDir(homeDir); found != "" {
			return found
		}
	}

	return ""
}

func searchStartDirs() []string {
	cwd, _ := os.Getwd()

	execPath, err := os.Executable()
	execDir := ""
	if err == nil {
		execDir = filepath.Dir(execPath)
	}

	if cwd != "" && execDir != "" && cwd == execDir {
		return []string{cwd}
	}
	if cwd != "" && execDir != "" {
		return []string{cwd, execDir}
	}
	if cwd != "" {
		return []string{cwd}
	}
	if execDir != "" {
		return []string{execDir}
	}

	return nil
}

func searchUpwardForEnv(startDir string) string {
	for dir := startDir; ; dir = filepath.Dir(dir) {
		if found := pickEnvFileInDir(dir); found != "" {
			return found
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
	}
	return ""
}

func pickEnvFileInDir(dir string) string {
	local := filepath.Join(dir, ".env.local")
	if fileExists(local) {
		return local
	}
	base := filepath.Join(dir, ".env")
	if fileExists(base) {
		return base
	}
	return ""
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

func isDevelopmentEnv(appEnv string) bool {
	switch strings.ToLower(strings.TrimSpace(appEnv)) {
	case "dev", "development", "local":
		return true
	default:
		return false
	}
}
