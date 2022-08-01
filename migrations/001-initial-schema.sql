-- Up
CREATE TABLE IF NOT EXISTS regions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id INTEGER, 
    region TEXT
);

CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id INTEGER, 
    device TEXT
);

CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    user_id INTEGER, 
    vendor TEXT
);

CREATE TABLE IF NOT EXISTS feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    title TEXT, 
    link TEXT,
    pubDate TEXT,
    content TEXT,
    contentSnippet TEXT,
    guid TEXT UNIQUE,
    categories TEXT,
    isoDate TEXT,
    status INTEGER
);

-- Down
