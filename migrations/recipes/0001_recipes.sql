-- migrations/recipes/0001_recipes.sql
-- Food recipes for tools.clewis.tech/recipes (separate from the bar's drink recipes).
-- Photos live in the private R2 bucket (binding PHOTOS) under recipes/<id>, one per recipe.

CREATE TABLE recipes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT    NOT NULL UNIQUE,
  title         TEXT    NOT NULL,
  category      TEXT    NOT NULL,
  cook_minutes  INTEGER NOT NULL,             -- total time start to finish
  servings      INTEGER NOT NULL DEFAULT 4,   -- the number the ingredient amounts are written for
  tint          TEXT    NOT NULL DEFAULT '#c9a45c',  -- placeholder image color
  photo_bytes   INTEGER NOT NULL DEFAULT 0,  -- size of the recipe's photo in the PHOTOS bucket; 0 = no photo
  photo_version INTEGER NOT NULL DEFAULT 0,  -- bumps on every photo change; used in the photo URL for caching
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE recipe_ingredients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  qty        REAL,                       -- NULL for "to taste" style lines
  unit       TEXT,
  name       TEXT    NOT NULL
);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients (recipe_id, position);

CREATE TABLE recipe_steps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id  INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  phase      TEXT    NOT NULL CHECK (phase IN ('prep', 'cook')),
  body       TEXT    NOT NULL,
  minutes    INTEGER                     -- timer label shown under the step
);
CREATE INDEX idx_recipe_steps_recipe ON recipe_steps (recipe_id, position);
