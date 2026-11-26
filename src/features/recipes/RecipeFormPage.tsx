// src/features/recipes/RecipeFormPage.tsx
// One page for both "new recipe" (/recipes/new) and "edit recipe" (/recipes/:slug/edit).
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { paths } from "@/routes/paths";
import {
  RECIPE_CATEGORIES,
  STEP_PHASES,
  type RecipeBodyInput,
  type RecipeDto,
  type StepPhase,
} from "./shared/recipes";
import { ApiError, createRecipe, deletePhoto, deleteRecipe, getRecipe, updateRecipe, uploadPhoto } from "./api";
import { RecipeImage } from "./components/RecipeImage";
import { useLoad } from "./hooks/useLoad";
import { formatQty, parseQty } from "./lib/format";
import { preparePhoto } from "./lib/image";
import { recipeEditLink, recipeLink, recipePaths } from "./paths";
import "./recipes.css";

type IngRow = { key: number; qty: string; unit: string; name: string };
type StepRow = { key: number; phase: StepPhase; body: string; minutes: string };

/** What will happen to the photo when the form is saved. */
type PhotoChange =
  | { kind: "keep" }
  | { kind: "new"; blob: Blob; previewUrl: string }
  | { kind: "remove" };

export function RecipeFormPage() {
  const { slug } = useParams();
  const { data, error, loading } = useLoad(
    () => (slug ? getRecipe(slug) : Promise.resolve(null)),
    slug ?? "new"
  );

  if (slug && loading) {
    return <div className="wrap rc"><p className="empty" role="status">Loading…</p></div>;
  }
  if (slug && !data) {
    return (
      <div className="wrap rc">
        <header>
          <div className="header-top">
            <p className="eyebrow">
              <Link to={paths.launcher} className="eyebrow">tools</Link> /{" "}
              <Link to={recipePaths.home} className="eyebrow">recipes</Link> /{" "}
              <span>recipe</span>
            </p>
          </div>
        </header>
        <p className="rc-error" role="alert">{error === "Not found" ? "That recipe doesn't exist." : error}</p>
      </div>
    );
  }
  return <RecipeForm initial={data} />;
}

function RecipeForm({ initial }: { initial: RecipeDto | null }) {
  const navigate = useNavigate();
  const nextKey = useRef(0);
  const key = () => nextKey.current++;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<RecipeBodyInput["category"]>(initial?.category ?? "dinner");
  const [cook, setCook] = useState(initial ? String(initial.cookMinutes) : "");
  const [servings, setServings] = useState(String(initial?.servings ?? 4));
  const [photo, setPhoto] = useState<PhotoChange>({ kind: "keep" });
  const [photoBusy, setPhotoBusy] = useState(false);
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice ?? null;

  // Free the preview image's memory when it is replaced or the page closes.
  useEffect(() => {
    return () => {
      if (photo.kind === "new") URL.revokeObjectURL(photo.previewUrl);
    };
  }, [photo]);
  const [ingredients, setIngredients] = useState<IngRow[]>(() =>
    initial && initial.ingredients.length > 0
      ? initial.ingredients.map((i) => ({
          key: key(),
          qty: i.qty === null ? "" : formatQty(i.qty),
          unit: i.unit ?? "",
          name: i.name,
        }))
      : [{ key: key(), qty: "", unit: "", name: "" }]
  );
  const [steps, setSteps] = useState<StepRow[]>(() =>
    initial && initial.steps.length > 0
      ? initial.steps.map((s) => ({
          key: key(),
          phase: s.phase,
          body: s.body,
          minutes: s.minutes === null ? "" : String(s.minutes),
        }))
      : [{ key: key(), phase: "prep", body: "", minutes: "" }]
  );

  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Turns the form into the API body, or says what is wrong with it. */
  function build(): RecipeBodyInput | string {
    if (!title.trim()) return "Give the recipe a title.";

    const whole = (label: string, v: string, min: number): number | string => {
      const n = Number(v);
      return Number.isInteger(n) && n >= min ? n : `${label} must be a whole number${min ? ` of at least ${min}` : ""}.`;
    };

    const servN = whole("Servings", servings, 1);
    if (typeof servN === "string") return servN;
    if (!cook.trim()) return "Enter a cook time.";
    const cookN = whole("Cook time", cook, 1);
    if (typeof cookN === "string") return cookN;

    const ings: RecipeBodyInput["ingredients"] = [];
    for (const [i, row] of ingredients.entries()) {
      if (!row.name.trim() && !row.qty.trim() && !row.unit.trim()) continue; // blank row
      if (!row.name.trim()) return `Ingredient ${i + 1} needs a name.`;
      const qty = parseQty(row.qty);
      if (qty !== null && (Number.isNaN(qty) || qty <= 0)) return `Ingredient ${i + 1}: “${row.qty}” isn't an amount I can read. Try 2, 1.5 or 1 1/2.`;
      ings.push({ qty, unit: row.unit.trim() || null, name: row.name.trim() });
    }

    const stps: RecipeBodyInput["steps"] = [];
    for (const [i, row] of steps.entries()) {
      if (!row.body.trim() && !row.minutes.trim()) continue;
      if (!row.body.trim()) return `Step ${i + 1} needs some text.`;
      let minutes: number | null = null;
      if (row.minutes.trim()) {
        const n = whole(`Step ${i + 1} time`, row.minutes, 0);
        if (typeof n === "string") return n;
        minutes = n;
      }
      stps.push({ phase: row.phase, body: row.body.trim(), minutes });
    }

    return {
      title: title.trim(),
      category,
      cookMinutes: cookN,
      servings: servN,
      ingredients: ings,
      steps: stps,
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = build();
    if (typeof body === "string") {
      setProblem(body);
      return;
    }
    setProblem(null);
    setSaving(true);
    try {
      const saved = initial ? await updateRecipe(initial.slug, body) : await createRecipe(body);

      // The recipe is saved. A photo problem shouldn't lose it, so it's reported on the edit page.
      try {
        if (photo.kind === "new") await uploadPhoto(saved.slug, photo.blob);
        else if (photo.kind === "remove" && initial?.photoUrl) await deletePhoto(saved.slug);
      } catch (photoErr) {
        const why = photoErr instanceof Error ? photoErr.message : "unknown error";
        navigate(recipeEditLink(saved.slug), { state: { notice: `Recipe saved, but the photo wasn't: ${why}` } });
        return;
      }
      navigate(recipeLink(saved.slug));
    } catch (err) {
      setProblem(
        err instanceof ApiError && err.status === 401
          ? "Your session expired. Log in again to save."
          : err instanceof ApiError && err.status === 403
            ? "Only managers can save recipes."
            : err instanceof Error
              ? err.message
              : "Could not save the recipe."
      );
      setSaving(false);
    }
  }

  async function onChoosePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again still fires
    if (!file) return;
    setProblem(null);
    setPhotoBusy(true);
    try {
      const blob = await preparePhoto(file);
      setPhoto({ kind: "new", blob, previewUrl: URL.createObjectURL(blob) });
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Couldn't use that photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onDelete() {
    if (!initial || !window.confirm(`Delete “${initial.title}”? This can't be undone.`)) return;
    setSaving(true);
    try {
      await deleteRecipe(initial.slug);
      navigate(recipePaths.home);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Could not delete the recipe.");
      setSaving(false);
    }
  }

  // Row helpers: edit one field, remove, or swap with a neighbour.
  const patch = <T extends { key: number }>(rows: T[], k: number, change: Partial<T>) =>
    rows.map((r) => (r.key === k ? { ...r, ...change } : r));
  const move = <T,>(rows: T[], i: number, by: -1 | 1): T[] => {
    const j = i + by;
    if (j < 0 || j >= rows.length) return rows;
    const copy = [...rows];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  };

  const back = initial ? recipeLink(initial.slug) : recipePaths.home;

  return (
    <div className="wrap rc">
      <header>
        <div className="header-top">
          <p className="eyebrow">
            <Link to={paths.launcher} className="eyebrow">tools</Link> /{" "}
            <Link to={recipePaths.home} className="eyebrow">recipes</Link> /{" "}
            <span>recipe</span>
          </p>
        </div>
        <h1>{initial ? "Edit recipe" : "Add recipe"}</h1>
      </header>

      <main className="rc-main">
        <form className="rc-form" onSubmit={onSubmit} noValidate>
          <div className="rc-panel rc-fields">
            <label className="rc-field rc-field--wide">
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
            </label>

            <label className="rc-field">
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                {RECIPE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className="rc-field">
              Cook time (min)
              <input inputMode="numeric" required value={cook} onChange={(e) => setCook(e.target.value)} />
            </label>
            <label className="rc-field">
              Serves
              <input inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} />
            </label>

          </div>

          <fieldset className="rc-panel rc-photo">
            <legend className="rc-label">Photo</legend>
            <RecipeImage
              tint={initial?.tint ?? "#c9a45c"}
              photoUrl={photo.kind === "new" ? photo.previewUrl : photo.kind === "keep" ? (initial?.photoUrl ?? null) : null}
              variant="card"
            />
            <div className="rc-photo-actions">
              <label className="rc-btn rc-btn--small">
                {photoBusy ? "Preparing…" : photo.kind === "new" || initial?.photoUrl ? "Choose a different photo" : "Choose photo"}
                <input type="file" accept="image/*" onChange={onChoosePhoto} disabled={photoBusy} className="rc-sr" />
              </label>
              {(photo.kind === "new" || (photo.kind === "keep" && initial?.photoUrl)) && (
                <button
                  type="button"
                  className="rc-btn rc-btn--small"
                  onClick={() => setPhoto(photo.kind === "new" ? { kind: "keep" } : { kind: "remove" })}
                >
                  {photo.kind === "new" ? "Undo" : "Remove photo"}
                </button>
              )}
              {photo.kind === "remove" && (
                <button type="button" className="rc-btn rc-btn--small" onClick={() => setPhoto({ kind: "keep" })}>
                  Keep photo
                </button>
              )}
            </div>
            <p className="rc-hint">Optional. One photo per recipe.</p>
          </fieldset>

          <fieldset className="rc-panel rc-rows">
            <legend className="rc-label">Ingredients</legend>
            <p className="rc-hint">Amounts can be 2, 1.5, 1/2, 1 1/2 or 1½. Leave the amount empty for “to taste”.</p>
            {ingredients.map((row, i) => (
              <div className="rc-row rc-row--ing" key={row.key}>
                <input
                  aria-label={`Ingredient ${i + 1} amount`}
                  placeholder="Amount"
                  value={row.qty}
                  onChange={(e) => setIngredients((rs) => patch(rs, row.key, { qty: e.target.value }))}
                />
                <input
                  aria-label={`Ingredient ${i + 1} unit`}
                  placeholder="Unit"
                  value={row.unit}
                  maxLength={20}
                  onChange={(e) => setIngredients((rs) => patch(rs, row.key, { unit: e.target.value }))}
                />
                <input
                  aria-label={`Ingredient ${i + 1} name`}
                  placeholder="Ingredient"
                  value={row.name}
                  maxLength={120}
                  onChange={(e) => setIngredients((rs) => patch(rs, row.key, { name: e.target.value }))}
                />
                <RowTools
                  label={`ingredient ${i + 1}`}
                  onUp={() => setIngredients((rs) => move(rs, i, -1))}
                  onDown={() => setIngredients((rs) => move(rs, i, 1))}
                  onRemove={() => setIngredients((rs) => rs.filter((r) => r.key !== row.key))}
                />
              </div>
            ))}
            <button
              type="button"
              className="rc-btn rc-btn--small"
              onClick={() => setIngredients((rs) => [...rs, { key: key(), qty: "", unit: "", name: "" }])}
              disabled={ingredients.length >= 60}
            >
              + Add ingredient
            </button>
          </fieldset>

          <fieldset className="rc-panel rc-rows">
            <legend className="rc-label">Steps</legend>
            {steps.map((row, i) => (
              <div className="rc-row rc-row--step" key={row.key}>
                <select
                  aria-label={`Step ${i + 1} section`}
                  value={row.phase}
                  onChange={(e) => setSteps((rs) => patch(rs, row.key, { phase: e.target.value as StepPhase }))}
                >
                  {STEP_PHASES.map((p) => (
                    <option key={p} value={p}>{p === "prep" ? "Prep" : "Cooking"}</option>
                  ))}
                </select>
                <textarea
                  aria-label={`Step ${i + 1} text`}
                  placeholder="What to do"
                  rows={2}
                  value={row.body}
                  maxLength={2000}
                  onChange={(e) => setSteps((rs) => patch(rs, row.key, { body: e.target.value }))}
                />
                <input
                  aria-label={`Step ${i + 1} minutes`}
                  placeholder="Min"
                  inputMode="numeric"
                  value={row.minutes}
                  onChange={(e) => setSteps((rs) => patch(rs, row.key, { minutes: e.target.value }))}
                />
                <RowTools
                  label={`step ${i + 1}`}
                  onUp={() => setSteps((rs) => move(rs, i, -1))}
                  onDown={() => setSteps((rs) => move(rs, i, 1))}
                  onRemove={() => setSteps((rs) => rs.filter((r) => r.key !== row.key))}
                />
              </div>
            ))}
            <button
              type="button"
              className="rc-btn rc-btn--small"
              onClick={() => setSteps((rs) => [...rs, { key: key(), phase: rs.at(-1)?.phase ?? "prep", body: "", minutes: "" }])}
              disabled={steps.length >= 60}
            >
              + Add step
            </button>
          </fieldset>

          {notice && <p className="rc-error" role="status">{notice}</p>}
          {problem && <p className="rc-error" role="alert">{problem}</p>}

          <div className="rc-actions rc-form-actions">
            <button type="submit" className="rc-btn rc-btn--cta" disabled={saving}>
              {saving ? "Saving…" : "Save recipe"}
            </button>
            <Link to={back} className="rc-btn">Cancel</Link>
            {initial && (
              <button type="button" className="rc-btn rc-btn--danger" onClick={onDelete} disabled={saving}>
                Delete
              </button>
            )}
          </div>
        </form>
      </main>

      <footer>tools.clewis.tech</footer>
    </div>
  );
}

function RowTools(props: { label: string; onUp: () => void; onDown: () => void; onRemove: () => void }) {
  return (
    <div className="rc-row-tools">
      <button type="button" className="rc-icon-btn" onClick={props.onUp} aria-label={`Move ${props.label} up`}>↑</button>
      <button type="button" className="rc-icon-btn" onClick={props.onDown} aria-label={`Move ${props.label} down`}>↓</button>
      <button type="button" className="rc-icon-btn" onClick={props.onRemove} aria-label={`Remove ${props.label}`}>✕</button>
    </div>
  );
}
