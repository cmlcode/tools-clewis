// src/features/recipes/components/RecipeImage.tsx
import type { CSSProperties } from "react";

type Props = {
  tint: string;
  photoUrl: string | null;
  /** "card" is the library thumbnail; "hero" is the wide image on the recipe page. */
  variant: "card" | "hero";
};

/** A photo when there is one, otherwise the tinted plate placeholder from the mockup. */
export function RecipeImage({ tint, photoUrl, variant }: Props) {
  return (
    <div
      className={`rc-image rc-image--${variant}`}
      style={{ "--tint": tint } as CSSProperties}
      aria-hidden="true"
    >
      {photoUrl && <img src={photoUrl} alt="" loading="lazy" />}
    </div>
  );
}
