/**
 * Whether the viewer has asked for less movement.
 *
 * Read at the moment an animation starts rather than subscribed to: these
 * sequences are seconds long and nobody changes the setting mid-roll.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
