/**
 * Resolve a public-directory asset against the deployment base path.
 *
 * Vite rewrites `import`ed assets for you, but these paths live in data and are
 * only ever strings, so they have to be joined by hand. Serving from a subpath
 * (GitHub Pages project sites) breaks every sprite without this.
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base.replace(/\/$/, '')}${path}`;
}

/**
 * Warm the image cache for art that appears mid-interaction.
 *
 * The dice clips are a few hundred kilobytes and only mount for the second they
 * play, so fetching them on demand shows an empty box for the first roll of
 * every session. Call this once the game screen is up — never on the lobby,
 * where it would compete with the board.
 */
export function preloadImages(urls: readonly string[]): void {
  if (typeof Image !== 'function') return;
  for (const url of urls) {
    const image = new Image();
    image.src = url;
  }
}
