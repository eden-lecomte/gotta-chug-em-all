import { useEffect } from 'react';
import { playSfx } from '../../audio/useAudio';
import { useGameStore } from '../../store/gameStore';
import type { Action, Phase } from '../../engine/types';

/**
 * How long the UI dwells on a phase before the driver advances it. Phases not
 * listed here wait for the player (landed, note, prompt, battle) or for an
 * animation callback (moving).
 */
export const PHASE_DELAYS: Partial<Record<Phase['name'], number>> = {
  rolling: 1600,
  turnEnd: 700,
};

const NEXT_ACTION: Partial<Record<Phase['name'], Action>> = {
  rolling: { type: 'DICE_SHOWN' },
  turnEnd: { type: 'END_TURN' },
};

/**
 * Turns phase changes into dispatched actions on a timer. The engine never
 * sleeps; this is the only place in the app that knows about elapsed time.
 */
export function useTurnDriver(): void {
  const phaseName = useGameStore((s) => s.state?.phase.name);
  const dispatch = useGameStore((s) => s.dispatch);

  useEffect(() => {
    if (!phaseName) return;
    const delay = PHASE_DELAYS[phaseName];
    const action = NEXT_ACTION[phaseName];
    if (delay === undefined || !action) return;

    const timer = setTimeout(() => dispatch(action), delay);
    return () => clearTimeout(timer);
  }, [phaseName, dispatch]);

  useEffect(() => {
    if (phaseName === 'rolling') playSfx('roll');
    if (phaseName === 'gameOver') playSfx('win');
  }, [phaseName]);
}
