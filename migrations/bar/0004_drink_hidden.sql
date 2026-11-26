-- Replace the free-text change note with a hidden flag.
--   hidden = 1: not listed on the menu or in search, but still usable as a parent / family reference.
ALTER TABLE drinks ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE drinks DROP COLUMN change_note;
