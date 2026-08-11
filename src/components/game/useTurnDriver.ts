import { useEffect } from 'react';
import { playSfx } from '../../audio/useAudio';
import { useGameStore } from '../../store/gameStore';
import type { Action, Phase } from '../../engine/types';

/**
 * How long the UI dwells on a phase before the driver advances it. Phases not
 * listed here are waiting on the player: landed, note, prompt, battle.
 *
 * `moving` is paced here rather than driven by the token's animation callback.
 * The token animates to wherever the engine put the player, so its target only
 * changes *after* a STEP_DONE — driving STEP_DONE from the animation instead
 * deadlocks on the first step of every turn, because entering `moving` starts
 * no animation at all. Keep this roughly in step with Token's transition.
 */
export const PHASE_DELAYS: Partial<Record<Phase['name'], number>> = {
  rolling: 1600,
  moving: 360,
  turnEnd: 700,
};

const NEXT_ACTION: Partial<Record<Phase['name'], Action>> = {
  rolling: { type: 'DICE_SHOWN' },
  moving: { type: 'STEP_DONE' },
  turnEnd: { type: 'END_TURN' },
};

/**
 * Turns phase changes into dispatched actions on a timer. The engine never
 * sleeps; this is the only place in the app that knows about elapsed time.
 */
export function useTurnDriver(): void {
  const phaseName = useGameStore((s) => s.state?.phase.name);
  // Steps within a single `moving` phase do not change its name, so the timer
  // has to re-arm on the remaining count or only the first step would fire.
  const stepsRemaining = useGameStore((s) =>
    s.state?.phase.name === 'moving' ? s.state.phase.remaining : null,
  );
  const dispatch = useGameStore((s) => s.dispatch);

  useEffect(() => {
    if (!phaseName) return;
    const delay = PHASE_DELAYS[phaseName];
    const action = NEXT_ACTION[phaseName];
    if (delay === undefined || !action) return;

    const timer = setTimeout(() => dispatch(action), delay);
    return () => clearTimeout(timer);
  }, [phaseName, stepsRemaining, dispatch]);

  useEffect(() => {
    if (phaseName === 'rolling') playSfx('roll');
    if (phaseName === 'gameOver') playSfx('win');
  }, [phaseName]);
}
