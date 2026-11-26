// src/features/recipes/components/RecipeCard.tsx
import { Link } from "react-router-dom";
import type { RecipeSummaryDto } from "../shared/recipes";
import { recipeLink } from "../paths";
import { RecipeImage } from "./RecipeImage";

/** 12 → "12 mins", 60 → "1 hr", 190 → "3 hr 10 mins". */
function mins(n: number): string {
  if (n < 60) return `${n} mins`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m ? `${h} hr ${m} mins` : `${h} hr`;
}

export function RecipeCard({ recipe }: { recipe: RecipeSummaryDto }) {

  return (
    <Link to={recipeLink(recipe.slug)} className="rc-card">
      <div className="rc-card-image">
        <RecipeImage tint={recipe.tint} photoUrl={recipe.photoUrl} variant="card" />
      </div>
      <div className="rc-card-body">
        <span className="rc-card-category">{recipe.category}</span>
        <h2>{recipe.title}</h2>
        <p className="rc-card-meta">
          <span>Cook: {mins(recipe.cookMinutes)}</span>
          <span>Serves: {recipe.servings}</span>
        </p>
      </div>
    </Link>
  );
}
