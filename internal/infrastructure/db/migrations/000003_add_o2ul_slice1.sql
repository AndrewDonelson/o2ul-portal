CREATE TABLE IF NOT EXISTS o2ul_user_profiles (
    player_id TEXT PRIMARY KEY,
    username TEXT,
    name TEXT,
    email TEXT,
    image TEXT,
    bio TEXT,
    phone TEXT,
    bg_image_url TEXT,
    bg_image_storage_id TEXT,
    bg_image_opacity DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    is_beta_tester BOOLEAN NOT NULL DEFAULT FALSE,
    is_hookup_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_date_unix BIGINT NOT NULL DEFAULT 0,
    last_seen_unix BIGINT NOT NULL DEFAULT 0,
    created_at_unix BIGINT NOT NULL DEFAULT 0,
    updated_at_unix BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS o2ul_preferences (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL,
    enable_calling BOOLEAN NOT NULL DEFAULT FALSE,
    enabled_oauth_providers JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_updated_unix BIGINT NOT NULL DEFAULT 0,
    updated_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
