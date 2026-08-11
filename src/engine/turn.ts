import { BOARD_ORIGINAL, getSquare } from '../data/boards/original';
import { drainQueue } from './effects';
import { changeSquare, clearStatus, expireAfterTurn, hasStatus, turnStartEffects } from './statuses';
import { activePlayer, pushLog, updatePlayer } from './targets';
import type { GameState } from './types';

export const LAST_SQUARE = BOARD_ORIGINAL.squares.length - 1;

/**
 * Move the active token exactly one square. Returns the state plus whether
 * movement should stop here — gold gyms are mandatory stops unless the player
 * evolved and banked a `skipNextGym`.
 */
export function stepOnce(state: GameState): { state: GameState; stop: boolean } {
  const active = activePlayer(state);
  const target = Math.min(LAST_SQUARE, active.square + 1);

  const next = changeSquare(state, active.id, target);

  if (target === LAST_SQUARE) return { state: next, stop: true };

  const square = getSquare(BOARD_ORIGINAL, target);
  if (square.kind === 'goldGym') {
    if (hasStatus(active, 'skipNextGym')) {
      const past = clearStatus(next, active.id, 'skipNextGym');
      return {
        state: pushLog(past, 'move', `${active.name} evolved past ${square.text}`),
        stop: false,
      };
    }
    return { state: next, stop: true };
  }

  return { state: next, stop: false };
}

/**
 * Set up the player whose turn it now is: run zone upkeep, then hand control
 * back with phase 'idle' so they can roll.
 */
export function beginTurn(state: GameState): GameState {
  const active = activePlayer(state);
  const upkeep = turnStartEffects(active);

  const fresh: GameState = {
    ...state,
    vars: {},
    lastRoll: null,
    queue: upkeep,
    queueExit: 'idle',
    phase: upkeep.length > 0 ? { name: 'resolving' } : { name: 'idle' },
  };

  const logged = pushLog(fresh, 'turn', `${active.name}'s turn`);
  if (upkeep.length === 0) return logged;
  // Marked after the turn line so the upkeep card reports only the upkeep.
  return drainQueue({ ...logged, resolveFrom: logged.logSeq, squareRoll: null });
}

/**
 * Hand the turn on. A banked extra turn keeps it with the current player;
 * otherwise seats advance, skipping anyone who owes missed turns.
 */
export function advanceTurn(state: GameState): GameState {
  const active = activePlayer(state);

  if (state.players.some((p) => p.finishedAtTurn !== null)) {
    return { ...state, phase: { name: 'gameOver' } };
  }

  let next = expireAfterTurn(state, active.id);

  if (active.extraTurns > 0) {
    next = updatePlayer(next, active.id, (p) => ({ ...p, extraTurns: p.extraTurns - 1 }));
    return beginTurn({ ...next, turnNumber: next.turnNumber + 1 });
  }

  let index = state.activeIndex;
  for (let hop = 0; hop < next.players.length; hop++) {
    index = (index + 1) % next.players.length;
    const candidate = next.players[index];
    if (candidate.missedTurns > 0) {
      next = updatePlayer(next, candidate.id, (p) => ({ ...p, missedTurns: p.missedTurns - 1 }));
      next = pushLog(next, 'turn', `${candidate.name} misses this turn`);
      continue;
    }
    return beginTurn({ ...next, activeIndex: index, turnNumber: next.turnNumber + 1 });
  }

  // Everyone owed a missed turn; play returns to whoever is up next anyway.
  return beginTurn({ ...next, activeIndex: index, turnNumber: next.turnNumber + 1 });
}
