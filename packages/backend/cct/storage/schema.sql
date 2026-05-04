PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
    id                   TEXT PRIMARY KEY,
    source               TEXT NOT NULL,
    project_path         TEXT,
    project_name         TEXT,
    started_at           INTEGER NOT NULL,
    ended_at             INTEGER,
    message_count        INTEGER NOT NULL DEFAULT 0,
    total_input_tokens   INTEGER NOT NULL DEFAULT 0,
    total_output_tokens  INTEGER NOT NULL DEFAULT 0,
    metadata             TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_started  ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_project  ON sessions(project_path);

CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    content_format  TEXT NOT NULL DEFAULT 'markdown',
    created_at      INTEGER NOT NULL,
    input_tokens    INTEGER,
    output_tokens   INTEGER,
    model           TEXT,
    parent_id       TEXT REFERENCES messages(id),
    raw_event_ref   TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

CREATE TABLE IF NOT EXISTS intents (
    message_id        TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
    primary_intent    TEXT NOT NULL,
    secondary_intents TEXT,
    confidence        REAL NOT NULL,
    classifier        TEXT NOT NULL,
    keywords          TEXT,
    summary           TEXT,
    classified_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_intents_primary ON intents(primary_intent);

CREATE TABLE IF NOT EXISTS tool_calls (
    id          TEXT PRIMARY KEY,
    message_id  TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    tool_name   TEXT NOT NULL,
    input       TEXT,
    output      TEXT,
    duration_ms INTEGER,
    succeeded   INTEGER NOT NULL,
    created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tool_calls_message ON tool_calls(message_id);

CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    content,
    content='messages',
    content_rowid='rowid',
    tokenize='unicode61'
);

CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
END;
CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
END;
CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
    INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
END;
