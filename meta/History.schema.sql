CREATE TABLE history_items 
( 
    id INTEGER PRIMARY KEY autoincrement, 
    url text NOT NULL UNIQUE, 
    domain_expansion text NULL, 
    visit_count INTEGER NOT NULL, 
    daily_visit_counts BLOB NOT NULL, 
    weekly_visit_counts BLOB NULL, 
    autocomplete_triggers BLOB NULL, 
    should_recompute_derived_visit_counts INTEGER NOT NULL, 
    visit_count_score                     INTEGER NOT NULL 
);

CREATE TABLE history_visits 
( 
    id           INTEGER PRIMARY KEY autoincrement, 
    history_item INTEGER NOT NULL REFERENCES history_items(id) ON 
    DELETE CASCADE, 
    visit_time REAL NOT NULL, 
    title text NULL, 
    load_successful boolean NOT NULL DEFAULT 1, 
    http_non_get    boolean NOT NULL DEFAULT 0, 
    synthesized     boolean NOT NULL DEFAULT 0, 
    redirect_source INTEGER NULL UNIQUE REFERENCES history_visits(id) 
    ON 
    DELETE CASCADE, 
    redirect_destination INTEGER NULL UNIQUE REFERENCES history_visits(id) 
    ON 
    DELETE CASCADE, 
    origin     INTEGER NOT NULL DEFAULT 0, 
    generation INTEGER NOT NULL DEFAULT 0, 
    attributes INTEGER NOT NULL DEFAULT 0, 
    score      INTEGER NOT NULL DEFAULT 0 
);

CREATE TABLE history_tombstones 
( 
    id         INTEGER PRIMARY KEY autoincrement, 
    start_time REAL NOT NULL, 
    end_time   REAL NOT NULL, 
    url text, 
    generation INTEGER NOT NULL DEFAULT 0 
);

CREATE TABLE history_client_versions 
( 
    client_version INTEGER PRIMARY KEY, 
    last_seen      REAL NOT NULL 
);

CREATE TABLE history_event_listeners 
( 
    listener_name TEXT PRIMARY KEY NOT NULL UNIQUE, 
    last_seen REAL NOT NULL 
);

CREATE TABLE history_events 
( 
    id INTEGER PRIMARY KEY autoincrement, 
    event_type text NOT NULL, 
    event_time REAL NOT NULL, 
    pending_listeners text NOT NULL, 
    value BLOB 
);

CREATE TABLE history_tags 
( 
    id    INTEGER PRIMARY KEY, 
    type  INTEGER NOT NULL, 
    level INTEGER NOT NULL, 
    identifier TEXT NOT NULL, 
    title TEXT NOT NULL, 
    modification_timestamp REAL NOT NULL, 
    item_count             INTEGER NOT NULL DEFAULT 0 
);

CREATE TABLE history_items_to_tags 
( 
    history_item INTEGER NOT NULL, 
    tag_id       INTEGER NOT NULL, 
    timestamp    REAL NOT NULL, 
    FOREIGN KEY(tag_id) REFERENCES history_tags(id) ON 
    DELETE CASCADE, 
    FOREIGN KEY(history_item) REFERENCES history_items(id) 
    ON 
    DELETE CASCADE, 
    UNIQUE(history_item, tag_id) 
    on conflict REPLACE 
);
