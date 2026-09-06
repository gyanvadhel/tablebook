/**
 * Browser-side image probing. Loads a URL into an off-screen <img> to read
 * its intrinsic size, so we can keep blueprints undistorted and warn when a
 * poster is landscape. Resolves null when the image cannot be loaded.
 */

export interface MeasuredImage {
  width: number;
  height: number;
  aspect: number;
}

export function measureImage(src: string): Promise<MeasuredImage | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(null);
    const img = new window.Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve({ width: img.naturalWidth, height: img.naturalHeight, aspect: img.naturalWidth / img.naturalHeight });
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

/** Width divided by height, or null if the image will not load. */
export async function measureAspect(src: string): Promise<number | null> {
  const measured = await measureImage(src);
  return measured ? measured.aspect : null;
}
