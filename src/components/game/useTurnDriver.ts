import { useEffect, useState } from 'react';
import { playCry, playCue } from '../../audio/useAudio';
import { getStarter } from '../../data/starters';
import { activePlayer } from '../../engine/selectors';
import { useGameStore } from '../../store/gameStore';
import type { Action, Phase } from '../../engine/types';
import { DICE_ANIMATION_MS, diceRollDuration } from './DiceRoller';
import { outcomeDieDuration } from './OutcomeDie';

/**
 * How long the UI dwells on a phase before the driver advances it. Phases not
 * listed here are waiting on the player: landed, note, prompt, battle.
 *
 * `moving` is paced here rather than driven by the token's animation callback.
 * The token animates to wherever the engine put the player, so its target only
 * changes *after* a STEP_DONE — driving STEP_DONE from the animation instead
 * deadlocks on the first step of every turn, because entering `moving` starts
 * no animation at all. Keep this roughly in step with Token's transition.
 *
 * `rolling` has to outlast the whole Poké Ball throw or the board would start
 * moving mid-clip, so it takes its length from DiceRoller rather than a number
 * chosen here.
 */
export const PHASE_DELAYS: Partial<Record<Phase['name'], number>> = {
  rolling: DICE_ANIMATION_MS,
  moving: 360,
  turnEnd: 700,
};

/**
 * The dwell for a phase as it should run right now. Only `rolling` varies:
 * reduced motion skips the clips, so waiting out their full length would leave
 * the player staring at a still frame.
 */
function phaseDelay(name: Phase['name']): number | undefined {
  return name === 'rolling' ? diceRollDuration() : PHASE_DELAYS[name];
}

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
    const delay = phaseDelay(phaseName);
    const action = NEXT_ACTION[phaseName];
    if (delay === undefined || !action) return;

    const timer = setTimeout(() => dispatch(action), delay);
    return () => clearTimeout(timer);
  }, [phaseName, stepsRemaining, dispatch]);

  useEffect(() => {
    if (phaseName === 'gameOver') playCue('win');
  }, [phaseName]);

  useTurnCry();
}

/**
 * Sound off the active player's Pokémon as their turn comes round.
 *
 * Keyed on the turn number rather than the seat, so a banked extra turn — which
 * keeps the same seat — still announces itself.
 */
function useTurnCry(): void {
  const turn = useGameStore((s) => s.state?.turnNumber);
  const starter = useGameStore((s) => (s.state ? activePlayer(s.state).starter : null));

  useEffect(() => {
    if (turn === undefined || !starter) return;
    playCry(getStarter(starter).dex);
  }, [turn, starter]);
}

/**
 * How long the board is left alone after a token arrives, before the card that
 * explains the square slides up over it.
 */
export const LANDING_BEAT_MS = 500;

/**
 * True once `ms` has passed since `held` became true. `key` re-arms the wait
 * when the same phase comes round again with different content.
 */
function useHeldFor(held: boolean, ms: number, key: unknown): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!held) {
      setElapsed(false);
      return;
    }
    const timer = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(timer);
  }, [held, ms, key]);

  return !held || elapsed;
}

/**
 * Whether a card may cover the board right now.
 *
 * Landing and having a card appear in the same frame means nobody ever sees the
 * square they landed on. This holds the board clear for a beat first. Phases
 * other than `landed` are never held — a prompt or a note follows on from a
 * square the player has already read.
 */
export function useCardReady(): boolean {
  const phaseName = useGameStore((s) => s.state?.phase.name);
  // Two landings in a row are both `landed`, so the beat has to re-arm on the
  // square as well or the second one would show its card instantly.
  const square = useGameStore((s) => (s.state ? activePlayer(s.state).square : null));
  return useHeldFor(phaseName === 'landed', LANDING_BEAT_MS, square);
}

/**
 * Whether the outcome card may appear yet.
 *
 * An outcome a die decided rolls that die first — a plain one, not the Poké Ball
 * throw. Reading "you rolled a 4, drink 2" is not the same as watching the 4
 * come up.
 */
export function useOutcomeReady(): boolean {
  const phase = useGameStore((s) => s.state?.phase);
  const rolled = phase?.name === 'outcome' && phase.face !== null;
  return useHeldFor(rolled, outcomeDieDuration(), phase?.name === 'outcome' ? phase.lines : null);
}
