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

CREATE INDEX IF NOT EXISTS o2ul_push_subscriptions_user_id_idx ON o2ul_push_subscriptions (user_id);

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

CREATE INDEX IF NOT EXISTS o2ul_pending_notifications_user_id_idx ON o2ul_pending_notifications (user_id);
CREATE INDEX IF NOT EXISTS o2ul_pending_notifications_status_idx ON o2ul_pending_notifications (status);
CREATE INDEX IF NOT EXISTS o2ul_pending_notifications_created_at_idx ON o2ul_pending_notifications (created_at);
