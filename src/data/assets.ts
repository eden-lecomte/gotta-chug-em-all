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
