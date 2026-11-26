// src/features/recipes/RecipePage.tsx
import { Link, useParams } from "react-router-dom";
import { paths } from "@/routes/paths";
import { useAuthStatus } from "@/hooks/useAuthStatus";
import { isManager } from "@/lib/auth";
import type { RecipeDto } from "./shared/recipes";
import { getRecipe } from "./api";
import { IngredientList } from "./components/IngredientList";
import { RecipeImage } from "./components/RecipeImage";
import { StepList } from "./components/StepList";
import { useLoad } from "./hooks/useLoad";
import { recipeEditLink, recipePaths } from "./paths";
import "./recipes.css";

export function RecipePage() {
  const { slug = "" } = useParams();
  const { data, error, loading } = useLoad(() => getRecipe(slug), slug);

  if (loading) return <Shell><p className="empty" role="status">Loading…</p></Shell>;
  if (!data) {
    const missing = error === "Not found";
    return (
      <Shell>
        <p className="rc-error" role="alert">{missing ? "That recipe doesn't exist." : error}</p>
      </Shell>
    );
  }
  return <RecipeView recipe={data} />;
}

function Shell({ children }: { children: React.ReactNode }) {
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
      <main className="rc-main">{children}</main>
      <footer>tools.clewis.tech</footer>
    </div>
  );
}

function RecipeView({ recipe }: { recipe: RecipeDto }) {
  const { role } = useAuthStatus();
  const canManage = isManager(role);

  return (
    <div className="wrap rc">
      <header>
        <div className="header-top">
          <p className="eyebrow">
            <Link to={paths.launcher} className="eyebrow">tools</Link> /{" "}
            <Link to={recipePaths.home} className="eyebrow">recipes</Link> /{" "}
            <span>recipe</span>
          </p>
          <div className="rc-actions">
            {canManage && (
              <Link to={recipeEditLink(recipe.slug)} className="rc-btn">Edit</Link>
            )}
          </div>
        </div>
        <h1>{recipe.title}</h1>
      </header>

      <main className="rc-main">
        <RecipeImage tint={recipe.tint} photoUrl={recipe.photoUrl} variant="hero" />

        <div className="rc-detail">
          <IngredientList recipe={recipe} />
          <StepList recipe={recipe} />
        </div>
      </main>

      <footer>tools.clewis.tech</footer>
    </div>
  );
}
