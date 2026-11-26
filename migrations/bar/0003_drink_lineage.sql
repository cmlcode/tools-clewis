-- Drink lineage: every drink belongs to one of six base-drink families, may descend from a
-- parent drink, and records what changed relative to that parent.
--
--   family       one of: old fashioned, martini, daiquiri, sidecar, highball, flip
--                (copied from the parent, so a plain WHERE family = ? finds a whole family)
--   parent_id    the drink this one derives from; NULL for the six base drinks
--   changes      JSON list of structured changes vs. the parent, e.g.
--                [{"type":"swap","role":"sweetener","from":"simple syrup","to":"sweet vermouth"}]
--   change_note  optional prose nuance the structured changes can't carry
--   description  short line shown on the menu
--

ALTER TABLE recipes ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE recipes ADD COLUMN family TEXT;
ALTER TABLE recipes ADD COLUMN parent_id INTEGER REFERENCES recipes(id);
ALTER TABLE recipes ADD COLUMN change_note TEXT NOT NULL DEFAULT '';
ALTER TABLE recipes ADD COLUMN changes TEXT NOT NULL DEFAULT '[]';

CREATE INDEX idx_recipes_family ON recipes(family);
CREATE INDEX idx_recipes_parent ON recipes(parent_id);

-- Seed the six base drinks so every family has a root. If a recipe with the same name
-- already exists it is kept and just tagged with its family. Check these specs against
-- your own preferences; they're editable later.
INSERT INTO recipes (name, description, ingredients, instructions, family)
SELECT 'Old Fashioned', 'Spirit, sugar and bitters.',
       '2 oz bourbon or rye' || char(10) || '1 tsp simple syrup' || char(10) || '2 dashes Angostura bitters',
       'Stir with ice until cold, strain over a large cube, garnish with an orange peel.',
       'old-fashioned'
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE lower(replace(name, '-', ' ')) = 'old fashioned');

INSERT INTO recipes (name, description, ingredients, instructions, family)
SELECT 'Martini', 'Spirit and aromatized wine.',
       '2 1/2 oz gin' || char(10) || '1/2 oz dry vermouth' || char(10) || '1 dash orange bitters (optional)',
       'Stir with ice until very cold, strain into a chilled coupe, garnish with a lemon twist.',
       'martini'
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE lower(name) = 'martini');

INSERT INTO recipes (name, description, ingredients, instructions, family)
SELECT 'Daiquiri', 'Spirit, citrus and sugar.',
       '2 oz white rum' || char(10) || '3/4 oz fresh lime juice' || char(10) || '3/4 oz simple syrup',
       'Shake with ice, strain into a chilled coupe.',
       'daiquiri'
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE lower(name) = 'daiquiri');

INSERT INTO recipes (name, description, ingredients, instructions, family)
SELECT 'Sidecar', 'Spirit, citrus and liqueur.',
       '2 oz cognac' || char(10) || '3/4 oz orange liqueur' || char(10) || '3/4 oz fresh lemon juice',
       'Shake with ice, strain into a chilled coupe.',
       'sidecar'
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE lower(name) = 'sidecar');

INSERT INTO recipes (name, description, ingredients, instructions, family)
SELECT 'Whiskey Highball', 'Whiskey lengthened with soda.',
       '2 oz whiskey' || char(10) || '4 oz chilled soda water',
       'Build over ice in a tall glass, stir once, garnish with a lemon peel.',
       'highball'
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE lower(replace(name, 'whisky', 'whiskey')) IN ('whiskey highball', 'highball'));

INSERT INTO recipes (name, description, ingredients, instructions, family)
SELECT 'Flip', 'Spirit, whole egg and sugar.',
       '2 oz aged rum, brandy or fortified wine' || char(10) || '1 whole egg' || char(10) || '1/2 oz simple syrup',
       'Dry shake, then shake hard with ice, strain into a small glass, grate nutmeg on top.',
       'flip'
WHERE NOT EXISTS (SELECT 1 FROM recipes WHERE lower(name) = 'flip');

-- Tag any matching recipes that already existed.
UPDATE recipes SET family = 'old-fashioned' WHERE family IS NULL AND lower(replace(name, '-', ' ')) = 'old fashioned';
UPDATE recipes SET family = 'martini'       WHERE family IS NULL AND lower(name) = 'martini';
UPDATE recipes SET family = 'daiquiri'      WHERE family IS NULL AND lower(name) = 'daiquiri';
UPDATE recipes SET family = 'sidecar'       WHERE family IS NULL AND lower(name) = 'sidecar';
UPDATE recipes SET family = 'highball'      WHERE family IS NULL AND lower(replace(name, 'whisky', 'whiskey')) IN ('whiskey highball', 'highball');
UPDATE recipes SET family = 'flip'          WHERE family IS NULL AND lower(name) = 'flip';
