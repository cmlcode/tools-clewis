// src/features/recipes/lib/image.ts
// Shrinks a chosen photo in the browser before it is uploaded. Phone photos are several MB; this brings
// them to a few hundred KB, keeps them upright, and drops metadata such as GPS location.
import { PHOTO_MAX_BYTES } from "../shared/photo";

const MAX_INPUT_BYTES = 30 * 1024 * 1024; // don't even try to decode something enormous

// Biggest edge in pixels and JPEG quality, tried in order until the result fits the limit.
const ATTEMPTS: [number, number][] = [
  [1600, 0.82],
  [1600, 0.7],
  [1200, 0.7],
  [1000, 0.6],
];

export async function preparePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That photo is too large to use.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Couldn't read that image. Try a JPEG or PNG.");
  }

  try {
    for (const [edge, quality] of ATTEMPTS) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Couldn't process the image in this browser.");
      ctx.fillStyle = "#fff"; // JPEG has no transparency
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= PHOTO_MAX_BYTES) return blob;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("Couldn't shrink that photo enough. Try a different one.");
}
