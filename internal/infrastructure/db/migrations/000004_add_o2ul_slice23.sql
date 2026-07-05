CREATE TABLE IF NOT EXISTS o2ul_files (
    file_key TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    storage_id TEXT NOT NULL,
    size BIGINT NOT NULL,
    md5_hash TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL,
    created_time TIMESTAMPTZ NOT NULL,
    updated_time TIMESTAMPTZ NOT NULL
);

ALTER TABLE o2ul_files ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE o2ul_files ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE o2ul_files ADD COLUMN IF NOT EXISTS content_type TEXT;
ALTER TABLE o2ul_files ADD COLUMN IF NOT EXISTS storage_id TEXT;
ALTER TABLE o2ul_files ADD COLUMN IF NOT EXISTS size BIGINT;
ALTER TABLE o2ul_files ADD COLUMN IF NOT EXISTS md5_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE o2ul_files ADD COLUMN IF NOT EXISTS created_at BIGINT;
ALTER TABLE o2ul_files ADD COLUMN IF NOT EXISTS created_time TIMESTAMPTZ;
ALTER TABLE o2ul_files ADD COLUMN IF NOT EXISTS updated_time TIMESTAMPTZ;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'o2ul_files'
          AND column_name = 'owner_id'
    ) THEN
        UPDATE o2ul_files SET user_id = owner_id WHERE user_id IS NULL;
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'o2ul_files'
          AND column_name = 'player_id'
    ) THEN
        UPDATE o2ul_files SET user_id = player_id WHERE user_id IS NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS o2ul_files_user_id_idx ON o2ul_files (user_id);
CREATE INDEX IF NOT EXISTS o2ul_files_storage_id_idx ON o2ul_files (storage_id);
CREATE INDEX IF NOT EXISTS o2ul_files_md5_hash_idx ON o2ul_files (md5_hash);

CREATE TABLE IF NOT EXISTS o2ul_presence (
    user_key TEXT PRIMARY KEY,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen BIGINT NOT NULL DEFAULT 0,
    presence_status TEXT NOT NULL DEFAULT 'offline',
    last_active BIGINT NOT NULL DEFAULT 0,
    created_time TIMESTAMPTZ NOT NULL,
    last_updated_time TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS o2ul_presence_last_seen_idx ON o2ul_presence (last_seen);

CREATE TABLE IF NOT EXISTS o2ul_push_subscriptions (
    subscription_key TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    expiration_time BIGINT NOT NULL DEFAULT 0,
    p256_d_h TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    created_time TIMESTAMPTZ NOT NULL,
    updated_time TIMESTAMPTZ NOT NULL
);

ALTER TABLE o2ul_push_subscriptions ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE o2ul_push_subscriptions ADD COLUMN IF NOT EXISTS endpoint TEXT;
ALTER TABLE o2ul_push_subscriptions ADD COLUMN IF NOT EXISTS expiration_time BIGINT NOT NULL DEFAULT 0;
ALTER TABLE o2ul_push_subscriptions ADD COLUMN IF NOT EXISTS p256_d_h TEXT;
ALTER TABLE o2ul_push_subscriptions ADD COLUMN IF NOT EXISTS auth TEXT;
ALTER TABLE o2ul_push_subscriptions ADD COLUMN IF NOT EXISTS created_at BIGINT;
ALTER TABLE o2ul_push_subscriptions ADD COLUMN IF NOT EXISTS updated_at BIGINT;
ALTER TABLE o2ul_push_subscriptions ADD COLUMN IF NOT EXISTS created_time TIMESTAMPTZ;
ALTER TABLE o2ul_push_subscriptions ADD COLUMN IF NOT EXISTS updated_time TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS o2ul_push_subscriptions_user_id_idx ON o2ul_push_subscriptions (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS o2ul_push_subscriptions_endpoint_uq ON o2ul_push_subscriptions (endpoint);

CREATE TABLE IF NOT EXISTS o2ul_pending_notifications (
    notification_key TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '',
    tag TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    data_json TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    processed_at BIGINT NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT NOT NULL DEFAULT '',
    created_time TIMESTAMPTZ NOT NULL,
    updated_time TIMESTAMPTZ NOT NULL
);

ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT '';
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS tag TEXT NOT NULL DEFAULT '';
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS url TEXT NOT NULL DEFAULT '';
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS data_json TEXT NOT NULL DEFAULT '';
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS created_at BIGINT;
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS processed_at BIGINT NOT NULL DEFAULT 0;
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS last_error TEXT NOT NULL DEFAULT '';
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS created_time TIMESTAMPTZ;
ALTER TABLE o2ul_pending_notifications ADD COLUMN IF NOT EXISTS updated_time TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS o2ul_pending_notifications_user_id_idx ON o2ul_pending_notifications (user_id);
CREATE INDEX IF NOT EXISTS o2ul_pending_notifications_status_idx ON o2ul_pending_notifications (status);
CREATE INDEX IF NOT EXISTS o2ul_pending_notifications_created_at_idx ON o2ul_pending_notifications (created_at);
