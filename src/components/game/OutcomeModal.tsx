import { motion } from 'motion/react';
import { useGameStore } from '../../store/gameStore';
import Modal from '../ui/Modal';

/**
 * What the square just did, held up until someone acknowledges it.
 *
 * The engine writes every consequence to the log as a human-readable line
 * already, so this reports those lines rather than restating the rules. A roll
 * that decided the outcome gets the number itself, big — that value used to
 * exist nowhere but the console.
 */
export default function OutcomeModal() {
  const phase = useGameStore((s) => s.state?.phase);
  const dispatch = useGameStore((s) => s.dispatch);
  if (phase?.name !== 'outcome') return null;

  return (
    <Modal
      title={phase.title}
      actions={
        <button
          type="button"
          onClick={() => dispatch({ type: 'ACK_OUTCOME' })}
          className="min-h-14 flex-1 rounded-xl bg-accent font-pokemon text-lg text-crust"
        >
          Continue
        </button>
      }
    >
      {phase.face !== null && (
        <motion.p
          className="text-center font-pokemon text-7xl leading-none text-accent"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 13, stiffness: 260 }}
        >
          <span className="sr-only">Rolled </span>
          {phase.face}
        </motion.p>
      )}

      <ul className="flex flex-col gap-2">
        {phase.lines.map((line, i) => (
          <li
            // Two players can produce identical lines in one square, so the
            // position in the run is the only stable key.
            key={`${i}-${line}`}
            className="rounded-lg bg-surface0 px-3 py-2"
          >
            {line}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
