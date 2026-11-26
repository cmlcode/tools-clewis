// src/features/bar/DrinkPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Panel } from "@/components/ui/Panel";
import { paths } from "@/routes/paths";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { isManager } from "@/lib/auth";
import { FAMILY_INFO } from "@/shared/families";
import { listDrinks} from "./services/barService";
import { ChangeChips } from "./components/ChangeChips";
import { ancestors, drinkHref, indexById} from "./lib/lineage";
import type { Drink } from "./types";
import "./lineage.css";

export function DrinkPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuthStatus();
  const [drinks, setDrinks] = useState<Drink[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listDrinks()
      .then((r) => !cancelled && setDrinks(r))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const view = useMemo(() => {
    if (!drinks) return null;
    const drink = drinks.find((r) => String(r.id) === id);
    if (!drink) return { drink: null as Drink | null };
    const byId = indexById(drinks);
    const chain = ancestors(drink, byId);
    return {
      drink,
      chain,
      parent: chain.length ? chain[chain.length - 1] : null,
    };
  }, [drinks, id]);

  const drink = view?.drink ?? null;

  return (
    <div className="wrap">
      <header>
        <div className="header-top">
          <p className="eyebrow">
            <Link to="/" className="eyebrow">tools</Link>/
            <Link to={paths.bar} className="eyebrow">bar</Link>/drink
          </p>
        </div>
        <h1>{drink ? drink.name : "Drink"}</h1>
        {drink?.hidden && <p><span className="family-tag">Hidden from menu</span></p>}
        {drink?.family && (
          <p>
            <span className={`family-tag family--${drink.family}`}>{FAMILY_INFO[drink.family].label} family</span>
          </p>
        )}
      </header>

      {failed && <p className="menu-note">Couldn't load this drink.</p>}
      {!failed && drinks === null && <p className="menu-note">Loading…</p>}
      {view && !drink && (
        <p className="menu-note">
          That drink isn't on the menu. <Link to={paths.bar}>Back to the bar</Link>
        </p>
      )}

      {view && drink && (
        <div className="drink-detail">
          {drink.description && <p className="drink-description">{drink.description}</p>}

          {/* lineage: breadcrumb for deeper drinks, "Based on" for the direct parent */}
          {view.chain && view.chain.length > 1 && (
            <nav className="breadcrumb" aria-label="Lineage">
              {view.chain.map((a) => (
                <span key={a.id}>
                  <Link to={drinkHref(a.id)}>{a.name}</Link>
                  <span aria-hidden="true"> → </span>
                </span>
              ))}
              <span aria-current="page">{drink.name}</span>
            </nav>
          )}
          {view.parent && (
            <p className="based-on">
              Based on <Link to={drinkHref(view.parent.id)}>{view.parent.name}</Link>
            </p>
          )}

          <ChangeChips changes={drink.changes} />

          <Panel className="drink-recipe">
            <h2>Ingredients</h2>
            <p className="drink-text">{drink.ingredients}</p>
            {drink.instructions && (
              <>
                <h2>Method</h2>
                <p className="drink-text">{drink.instructions}</p>
              </>
            )}
          </Panel>

          <div className="drink-actions">
            <button type="button" onClick={() => navigate(paths.bar, { state: { drink: drink.name } })}>
              Order this
            </button>
            {isManager(role) && drink && (
              <Link className="nav-tab" to={`/bar/drinks/${drink.id}/edit`}>Edit</Link>
            )}
            <Link className="nav-tab" to={paths.bar}>Back to the menu</Link>
          </div>
        </div>
      )}

      <footer>tools.clewis.tech</footer>
    </div>
  );
}
