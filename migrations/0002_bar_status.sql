-- Migration number: 0002 	 2026-07-05

CREATE TABLE bar_status (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  is_open INTEGER NOT NULL DEFAULT 1
);

INSERT INTO bar_status (id, is_open) VALUES (1, 1);
