// src/features/recipes/shared/photo.ts
// Photo limits, shared by the Worker (which enforces them) and the browser (which shrinks photos to fit).
// Kept apart from recipes.ts so the browser doesn't have to load zod for two numbers.

/** Largest photo the server accepts. The browser shrinks photos well below this before uploading. */
export const PHOTO_MAX_BYTES = 1024 * 1024; // 1 MB
