CREATE TABLE IF NOT EXISTS user_settings (
    player_id TEXT PRIMARY KEY,
    theme TEXT NOT NULL,
    refresh_seconds INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_preferences (
    player_id TEXT PRIMARY KEY,
    email_enabled BOOLEAN NOT NULL,
    push_enabled BOOLEAN NOT NULL,
    in_app_enabled BOOLEAN NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
