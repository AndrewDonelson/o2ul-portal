CREATE TABLE IF NOT EXISTS password_reset_tokens (
    i_d TEXT PRIMARY KEY,
    player_i_d TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ NOT NULL DEFAULT '1970-01-01T00:00:00Z'
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'id'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'i_d'
    ) THEN
        ALTER TABLE password_reset_tokens RENAME COLUMN id TO i_d;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
    )
    AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'user_id'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'player_i_d'
    ) THEN
        ALTER TABLE password_reset_tokens RENAME COLUMN user_id TO player_i_d;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'player_id'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'password_reset_tokens' AND column_name = 'player_i_d'
    ) THEN
        ALTER TABLE password_reset_tokens RENAME COLUMN player_id TO player_i_d;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS password_reset_tokens_player_id_idx
ON password_reset_tokens (player_i_d);

CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
ON password_reset_tokens (expires_at);

CREATE INDEX IF NOT EXISTS password_reset_tokens_used_idx
ON password_reset_tokens (used);
