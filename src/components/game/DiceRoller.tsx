import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { assetUrl } from '../../data/assets';
import { useGameStore } from '../../store/gameStore';
import { prefersReducedMotion } from './motion';

/**
 * The roll has never been a die. The original site cut three clips out of the
 * anime and played them back to back: Ash winds up and throws a Poké Ball, the
 * ball cracks open on a Pokémon, and the release freezes on a burst of light
 * with the rolled number stamped over it.
 *
 * Each part is a separate image, so the whole animation is a timed swap between
 * three `<img>` sources. The offsets come from the clips themselves — `throw`
 * runs to its last frame at 2340ms, and `catch` is cut short mid-loop at 1200ms
 * exactly as the original did, landing on the same flash the still frame shows.
 */
const FRAMES = [
  { at: 0, src: '/img/dice/throw.webp', alt: 'A trainer hurls a Poké Ball' },
  { at: 2340, src: '/img/dice/catch.webp', alt: 'The Poké Ball bursts open' },
  { at: 3540, src: '/img/dice/flash.webp', alt: '' },
] as const;

const FLASH = FRAMES.length - 1;

/** How long the number sits on the flash before the turn moves on. */
const HOLD_MS = 1000;

export const DICE_ANIMATION_MS = FRAMES[FLASH].at + HOLD_MS;

/** Reduced motion skips the clips and opens straight on the number. */
export const DICE_REDUCED_MS = HOLD_MS;

export const DICE_IMAGES: readonly string[] = FRAMES.map((frame) => assetUrl(frame.src));

/** How long the driver should dwell on `rolling` for the roll now on screen. */
export function diceRollDuration(): number {
  return prefersReducedMotion() ? DICE_REDUCED_MS : DICE_ANIMATION_MS;
}

export default function DiceRoller() {
  const phase = useGameStore((s) => s.state?.phase);
  // ROLL only fires from `idle`, so this unmounts between rolls and the sequence
  // below always restarts from the throw — including the `<img>` elements, which
  // is what makes the clips replay rather than sit on their last frame. The
  // smaller rolls a square asks for use OutcomeDie instead.
  if (phase?.name !== 'rolling') return null;
  return <RollSequence face={phase.face} offTable={phase.offTable} />;
}

function RollSequence({ face, offTable }: { face: number; offTable: boolean }) {
  const [index, setIndex] = useState(() => (prefersReducedMotion() ? FLASH : 0));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timers = FRAMES.slice(1).map((frame, i) =>
      setTimeout(() => setIndex(i + 1), frame.at),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const frame = FRAMES[index];

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-crust/90 p-4">
      <div role="status" aria-live="polite" className="w-full max-w-md">
        <span className="sr-only">Rolled {face}</span>

        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl">
          <img
            src={assetUrl(frame.src)}
            alt={frame.alt}
            className="size-full object-cover"
            draggable={false}
          />

          {index === FLASH && (
            <motion.span
              aria-hidden
              className="absolute inset-0 grid place-items-center font-pokemon text-[22vmin] leading-none text-crust sm:text-8xl"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 260 }}
            >
              {face}
            </motion.span>
          )}
        </div>

        {offTable && (
          <p className="mt-6 text-center font-pokemon text-lg text-red">
            It rolled off the table! Finish your drink.
          </p>
        )}
      </div>
    </div>
  );
}
