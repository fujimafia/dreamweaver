-- yarns: physical yarn in the user's stash
CREATE TABLE IF NOT EXISTS yarns (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    brand             TEXT,
    fiber_content     TEXT NOT NULL,         -- e.g. "100% merino wool"
    weight            TEXT NOT NULL,         -- lace|fingering|sport|dk|worsted|aran|bulky|super_bulky
    gauge_stitches    REAL,                  -- stitches per 10cm on recommended needle
    gauge_rows        REAL,                  -- rows per 10cm
    needle_size_mm    REAL,
    yardage_per_skein INTEGER,
    meters_per_skein  INTEGER,
    skeins_owned      REAL    NOT NULL DEFAULT 0,
    color             TEXT,
    colorway          TEXT,
    dye_lot           TEXT,
    price_per_skein   REAL,
    purchase_url      TEXT,
    notes             TEXT,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- patterns: knitting patterns from Etsy, free PDFs, or physical books
CREATE TABLE IF NOT EXISTS patterns (
    id                         TEXT PRIMARY KEY,
    title                      TEXT NOT NULL,
    designer                   TEXT,
    source_type                TEXT NOT NULL,   -- etsy|free_pdf|physical_book|magazine
    source_url                 TEXT,
    pdf_path                   TEXT,            -- local file path
    pdf_text                   TEXT,            -- extracted/editable text
    required_skills            TEXT,            -- JSON array: ["cable","lace","brioche"]
    called_for_yarn_weight     TEXT,
    called_for_gauge_stitches  REAL,
    called_for_gauge_rows      REAL,
    called_for_needle_size_mm  REAL,
    called_for_yardage         INTEGER,
    notes                      TEXT,
    created_at                 TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at                 TEXT NOT NULL DEFAULT (datetime('now'))
);

-- projects: the unit of active work (cast-on → finished)
CREATE TABLE IF NOT EXISTS projects (
    id                 TEXT PRIMARY KEY,
    title              TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'planned',  -- planned|in_progress|completed|ready_to_wear
    pattern_id         TEXT REFERENCES patterns(id) ON DELETE SET NULL,
    priority           INTEGER DEFAULT 0,
    target_date        TEXT,            -- ISO date (YYYY-MM-DD)
    start_date         TEXT,
    end_date           TEXT,
    process_notes      TEXT,
    is_sample          INTEGER NOT NULL DEFAULT 0,   -- 1 = swatch, never becomes a garment
    total_rounds       INTEGER NOT NULL DEFAULT 0,   -- accumulated round counter
    planner_start_date TEXT,
    planner_end_date   TEXT,
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- project_yarns: which yarns are used in a project (many-to-many)
CREATE TABLE IF NOT EXISTS project_yarns (
    id                TEXT PRIMARY KEY,
    project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    yarn_id           TEXT NOT NULL REFERENCES yarns(id) ON DELETE CASCADE,
    skeins_used       REAL    DEFAULT 0,
    yardage_used      INTEGER DEFAULT 0,
    held_with_yarn_id TEXT    REFERENCES yarns(id) ON DELETE SET NULL,  -- for holding two yarns together
    notes             TEXT,
    UNIQUE(project_id, yarn_id)
);

-- pattern_yarns: yarns associated with a pattern (called-for or substitutions)
CREATE TABLE IF NOT EXISTS pattern_yarns (
    pattern_id       TEXT NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
    yarn_id          TEXT NOT NULL REFERENCES yarns(id) ON DELETE CASCADE,
    is_substitution  INTEGER NOT NULL DEFAULT 0,  -- 1 = user-substituted yarn
    notes            TEXT,
    PRIMARY KEY (pattern_id, yarn_id)
);

-- time_entries: knitting sessions logged against a project
CREATE TABLE IF NOT EXISTS time_entries (
    id               TEXT    PRIMARY KEY,
    project_id       TEXT    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL,
    rounds_knitted   INTEGER DEFAULT 0,
    session_date     TEXT    NOT NULL DEFAULT (date('now')),
    notes            TEXT,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- garments: finished projects promoted to wearable status
CREATE TABLE IF NOT EXISTS garments (
    id                    TEXT PRIMARY KEY,
    project_id            TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    pre_block_chest_cm    REAL,
    pre_block_length_cm   REAL,
    pre_block_sleeve_cm   REAL,
    post_block_chest_cm   REAL,
    post_block_length_cm  REAL,
    post_block_sleeve_cm  REAL,
    care_instructions     TEXT,
    process_notes         TEXT,
    is_gift               INTEGER NOT NULL DEFAULT 0,
    gift_recipient        TEXT,
    gift_notes            TEXT,
    is_for_sale           INTEGER NOT NULL DEFAULT 0,
    listing_title         TEXT,
    listing_description   TEXT,
    listing_price         REAL,
    photos                TEXT,  -- JSON array of file paths
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- samples: 10x10cm swatches that validate yarn+pattern fit before committing
CREATE TABLE IF NOT EXISTS samples (
    id                    TEXT PRIMARY KEY,
    project_id            TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    pattern_id            TEXT REFERENCES patterns(id) ON DELETE SET NULL,
    yarn_id               TEXT NOT NULL REFERENCES yarns(id) ON DELETE CASCADE,
    needle_size_mm        REAL NOT NULL,
    stitch_count_per_10cm REAL,
    row_count_per_10cm    REAL,
    photo_path            TEXT,
    notes                 TEXT,
    created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_projects_status       ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_yarns_project ON project_yarns(project_id);
CREATE INDEX IF NOT EXISTS idx_project_yarns_yarn    ON project_yarns(yarn_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project  ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_samples_project       ON samples(project_id);
CREATE INDEX IF NOT EXISTS idx_samples_pattern       ON samples(pattern_id);
