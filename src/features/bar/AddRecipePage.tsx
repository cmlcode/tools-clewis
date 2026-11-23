// src/features/bar/AddRecipePage.tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Panel } from "@/components/ui/Panel";
import { paths } from "@/routes/paths";
import {
  CHANGE_TYPES,
  FAMILIES,
  FAMILY_INFO,
  ROLES,
  ROLE_LABELS,
  type ChangeType,
  type Family,
  type RecipeChange,
  type Role,
} from "@/shared/families";
import { createRecipe, listRecipes, updateRecipe } from "./services/barService";
import { ancestors, indexById } from "./lib/lineage";
import type { Recipe } from "./types";
import "./add-recipe.css";

type Status = "idle" | "saving" | "saved" | "error";

/** Editable form of a change; converted to a RecipeChange on save. */
interface ChangeRow {
  type: ChangeType;
  role: Role | "";
  from: string;
  to: string;
  detail: string;
}

const blankRow = (): ChangeRow => ({ type: "swap", role: "base", from: "", to: "", detail: "" });

const TYPE_LABELS: Record<ChangeType, string> = {
  swap: "Swap",
  add: "Add",
  remove: "Remove",
  technique: "Technique",
};

function rowIsValid(r: ChangeRow): boolean {
  switch (r.type) {
    case "swap":
      return r.role !== "" && r.from.trim() !== "" && r.to.trim() !== "";
    case "add":
      return r.to.trim() !== "";
    case "remove":
      return r.from.trim() !== "";
    case "technique":
      return r.detail.trim() !== "";
  }
}

function rowToChange(r: ChangeRow): RecipeChange {
  const role = r.role === "" ? undefined : r.role;
  switch (r.type) {
    case "swap":
      return { type: "swap", role: role as Role, from: r.from.trim(), to: r.to.trim() };
    case "add":
      return { type: "add", ...(role ? { role } : {}), to: r.to.trim() };
    case "remove":
      return { type: "remove", ...(role ? { role } : {}), from: r.from.trim() };
    case "technique":
      return { type: "technique", detail: r.detail.trim() };
  }
}

function changeToRow(c: RecipeChange): ChangeRow {
  const base = { role: "" as Role | "", from: "", to: "", detail: "" };
  switch (c.type) {
    case "swap":
      return { ...base, type: "swap", role: c.role, from: c.from, to: c.to };
    case "add":
      return { ...base, type: "add", role: c.role ?? "", to: c.to };
    case "remove":
      return { ...base, type: "remove", role: c.role ?? "", from: c.from };
    case "technique":
      return { ...base, type: "technique", detail: c.detail };
  }
}

/** Serves both /bar/recipes/new and /bar/recipes/:id/edit. */
export function AddRecipePage() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const [loaded, setLoaded] = useState(false);
  const [existing, setExisting] = useState<Recipe[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [family, setFamily] = useState<Family | "">("");
  const [rows, setRows] = useState<ChangeRow[]>([]);
  const [changeNote, setChangeNote] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [savedName, setSavedName] = useState("");

  useEffect(() => {
    listRecipes().then(setExisting).catch(() => setExisting([]));
  }, []);

  // Editing: fill the form once, when the recipe list arrives.
  useEffect(() => {
    if (editId === null || loaded) return;
    const r = existing.find((x) => x.id === editId);
    if (!r) return;
    setName(r.name);
    setDescription(r.description ?? "");
    setIngredients(r.ingredients);
    setInstructions(r.instructions ?? "");
    setParentId(r.parentId);
    setFamily(r.family ?? "");
    setRows((r.changes ?? []).map(changeToRow));
    setChangeNote(r.changeNote ?? "");
    setLoaded(true);
  }, [editId, existing, loaded]);

  const editing = editId !== null ? existing.find((r) => r.id === editId) ?? null : null;
  // A drink can't be based on itself or on anything that descends from it.
  const parentOptions = existing.filter(
    (r) => editing === null || (r.id !== editing.id && !ancestors(r, indexById(existing)).some((a) => a.id === editing.id))
  );
  const parent = existing.find((r) => r.id === parentId) ?? null;
  // A drink with a parent inherits its family; a new base drink picks one.
  const effectiveFamily: Family | "" = parent ? (parent.family ?? "") : family;

  function updateRow(i: number, patch: Partial<ChangeRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function reset() {
    setName("");
    setDescription("");
    setIngredients("");
    setInstructions("");
    setParentId(null);
    setFamily("");
    setRows([]);
    setChangeNote("");
    setStatus("idle");
    listRecipes().then(setExisting).catch(() => {});
  }

  const canSave =
    name.trim() !== "" &&
    ingredients.trim() !== "" &&
    (parent !== null || family !== "") &&
    (parent === null || rows.every(rowIsValid));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSave || status === "saving") return;

    setStatus("saving");
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        ingredients: ingredients.trim(),
        instructions: instructions.trim(),
        family: parent ? parent.family : (family as Family),
        parentId: parent ? parent.id : null,
        changes: parent ? rows.map(rowToChange) : [],
        changeNote: parent ? changeNote.trim() : "",
      };
      const saved = editId !== null ? await updateRecipe(editId, body) : await createRecipe(body);
      setSavedName(saved.name);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="wrap">
      <header>
        <div className="header-top">
          <p className="eyebrow">
            <Link to="/" className="eyebrow">Tools</Link>/
            <Link to={paths.bar} className="eyebrow">bar</Link>/recipes
          </p>
        </div>
        <h1>{editId !== null ? "Edit recipe" : "Add a recipe"}</h1>
        <p>Say which classic it comes from and what you changed.</p>
      </header>

      {status === "saved" ? (
        <Panel className="add-recipe">
          <p className="add-recipe-done">{editId !== null ? `Saved ${savedName}.` : `Added ${savedName} to the menu.`}</p>
          <div className="add-recipe-actions">
            {editId === null && <button type="button" onClick={reset}>Add another</button>}
            <Link className="nav-tab" to={paths.bar}>Back to the bar</Link>
          </div>
        </Panel>
      ) : (
        <Panel className="add-recipe">
          <form onSubmit={handleSubmit}>
            <label>
              Drink name
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
            </label>

            <label>
              Short description <span className="optional">(optional)</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
            </label>

            <label>
              Ingredients
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                rows={4}
                placeholder={"2 oz bourbon\n1 sugar cube\n2 dashes bitters"}
                required
              />
            </label>

            <label>
              Instructions <span className="optional">(optional)</span>
              <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} />
            </label>

            <label>
              Based on
              <select
                value={parentId ?? ""}
                onChange={(e) => {
                  setParentId(e.target.value === "" ? null : Number(e.target.value));
                  setRows([]);
                }}
              >
                <option value="">None, this is a new base drink</option>
                {[...parentOptions]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
              </select>
            </label>

            {parent ? (
              <p className="family-readonly">
                Family: {effectiveFamily ? FAMILY_INFO[effectiveFamily].label : "none"} (from {parent.name})
              </p>
            ) : (
              <label>
                Family
                <select value={family} onChange={(e) => setFamily(e.target.value as Family | "")} required>
                  <option value="">Choose a base drink…</option>
                  {FAMILIES.map((f) => (
                    <option key={f} value={f}>{FAMILY_INFO[f].label}: {FAMILY_INFO[f].hint}</option>
                  ))}
                </select>
              </label>
            )}

            {parent && (
              <fieldset className="changes">
                <legend>What changed from {parent.name}</legend>
                {rows.map((r, i) => (
                  <div key={i} className="change-row">
                    <select
                      aria-label="Change type"
                      value={r.type}
                      onChange={(e) => updateRow(i, { type: e.target.value as ChangeType })}
                    >
                      {CHANGE_TYPES.map((t) => (
                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                      ))}
                    </select>

                    {r.type !== "technique" && (
                      <select
                        aria-label="Slot"
                        value={r.role}
                        onChange={(e) => updateRow(i, { role: e.target.value as Role | "" })}
                      >
                        {r.type !== "swap" && <option value="">Any slot</option>}
                        {ROLES.map((role) => (
                          <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                        ))}
                      </select>
                    )}

                    {(r.type === "swap" || r.type === "remove") && (
                      <input
                        aria-label="From"
                        placeholder={r.type === "swap" ? "from" : "ingredient removed"}
                        value={r.from}
                        onChange={(e) => updateRow(i, { from: e.target.value })}
                      />
                    )}
                    {(r.type === "swap" || r.type === "add") && (
                      <input
                        aria-label="To"
                        placeholder={r.type === "swap" ? "to" : "ingredient added"}
                        value={r.to}
                        onChange={(e) => updateRow(i, { to: e.target.value })}
                      />
                    )}
                    {r.type === "technique" && (
                      <input
                        aria-label="Technique"
                        placeholder="e.g. shaken instead of stirred"
                        value={r.detail}
                        onChange={(e) => updateRow(i, { detail: e.target.value })}
                      />
                    )}

                    <button
                      type="button"
                      className="nav-tab"
                      onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Remove this change"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {rows.length < 12 && (
                  <button type="button" className="nav-tab" onClick={() => setRows((p) => [...p, blankRow()])}>
                    + Add a change
                  </button>
                )}

                <label>
                  Note <span className="optional">(optional)</span>
                  <input
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    maxLength={300}
                    placeholder="Why it works, in a sentence"
                  />
                </label>
              </fieldset>
            )}

            {status === "error" && <p className="add-recipe-error" role="alert">Couldn't save the recipe. Try again.</p>}

            <div className="add-recipe-actions">
              <button type="submit" disabled={!canSave || status === "saving"}>
                {status === "saving" ? "Saving…" : editId !== null ? "Save changes" : "Save recipe"}
              </button>
              <Link className="nav-tab" to={paths.bar}>Cancel</Link>
            </div>
          </form>
        </Panel>
      )}

      <footer>tools.clewis.tech</footer>
    </div>
  );
}
