import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { prefersReducedMotion } from './motion';

/** Pip layout per face, as a 3x3 grid of filled cells. */
const PIPS: Record<number, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** How long the die cycles through faces before settling on the real one. */
const TUMBLE_MS = 660;
const TUMBLE_STEP_MS = 90;

/** How long the settled face is held before the card takes over. */
const SETTLE_MS = 400;

export const OUTCOME_DIE_MS = TUMBLE_MS + SETTLE_MS;

/** Reduced motion skips the tumble and opens on the settled face. */
export const OUTCOME_DIE_REDUCED_MS = SETTLE_MS;

export function outcomeDieDuration(): number {
  return prefersReducedMotion() ? OUTCOME_DIE_REDUCED_MS : OUTCOME_DIE_MS;
}

/**
 * A plain six-sided die, for the rolls a square makes you take.
 *
 * Deliberately not the Poké Ball throw: that belongs to the turn's own roll, and
 * replaying the whole clip for every gym and Safari check would stop the game
 * dead. This just needs to show the number coming up.
 */
export default function OutcomeDie({ face }: { face: number }) {
  const showing = useTumble(face);
  const pips = PIPS[showing] ?? [];

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-crust/90 p-4">
      <motion.div
        role="status"
        aria-live="polite"
        className="grid size-32 grid-cols-3 grid-rows-3 gap-2 rounded-2xl bg-text p-4 shadow-2xl"
        initial={{ rotate: -180, scale: 0.4, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
      >
        <span className="sr-only">Rolled {face}</span>
        {Array.from({ length: 9 }, (_, cell) => (
          <span
            key={cell}
            aria-hidden
            className={pips.includes(cell) ? 'size-full rounded-full bg-crust' : ''}
          />
        ))}
      </motion.div>
    </div>
  );
}

/**
 * Face to draw right now: a run of arbitrary faces, then the real one.
 *
 * The result is already decided — this only makes the die look like it landed on
 * the number rather than having always shown it.
 */
function useTumble(face: number): number {
  const [showing, setShowing] = useState(face);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = setInterval(() => {
      // Any face but the real one, so the settle is always a visible change.
      setShowing(((Math.floor(Math.random() * 5) + face) % 6) + 1);
    }, TUMBLE_STEP_MS);
    const stop = setTimeout(() => {
      clearInterval(timer);
      setShowing(face);
    }, TUMBLE_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [face]);

  return showing;
}
