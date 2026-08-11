import { motion } from 'motion/react';
import { useGameStore } from '../../store/gameStore';

/** Pip layout per face, as a 3x3 grid of filled cells. */
const PIPS: Record<number, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export default function DiceRoller() {
  const phase = useGameStore((s) => s.state?.phase);
  if (!phase || phase.name !== 'rolling') return null;

  const pips = PIPS[phase.face] ?? [];

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-crust/80 backdrop-blur-sm">
      <motion.div
        role="status"
        aria-live="polite"
        className="grid size-32 grid-cols-3 grid-rows-3 gap-2 rounded-2xl bg-text p-4 shadow-2xl"
        initial={{ rotate: -180, scale: 0.4, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
      >
        <span className="sr-only">Rolled {phase.face}</span>
        {Array.from({ length: 9 }, (_, cell) => (
          <span
            key={cell}
            aria-hidden
            className={pips.includes(cell) ? 'size-full rounded-full bg-crust' : ''}
          />
        ))}
      </motion.div>

      {phase.offTable && (
        <p className="mt-6 max-w-xs text-center font-pokemon text-lg text-red">
          It rolled off the table! Finish your drink.
        </p>
      )}
    </div>
  );
}
