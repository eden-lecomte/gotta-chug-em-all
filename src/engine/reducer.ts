import { BOARD_ORIGINAL, getSquare } from '../data/boards/original';
import { drainQueue, giveDrinks } from './effects';
import { resolvePrompt } from './prompts';
import { rollDie, rollPercent } from './rng';
import { clearByRoll, clearStatus, hasStatus, movementFor, rollToClearStatuses } from './statuses';
import { activePlayer, pushLog, updatePlayer } from './targets';
import { advanceTurn, LAST_SQUARE, stepOnce } from './turn';
import type { Action, GameState } from './types';

/** A player pinned in place this turn: the roll happened, the move does not. */
function pinnedInPlace(state: GameState, face: number, offTable: boolean): GameState {
  return { ...state, phase: { name: 'rolling', face, offTable }, queue: [], queueExit: 'turnEnd' };
}

/**
 * The single entry point for every state change. Pure and total: an action
 * that does not apply in the current phase returns the state unchanged.
 */
export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'ROLL': {
      if (state.phase.name !== 'idle') return state;
      const active = activePlayer(state);

      const [face, afterDie] = rollDie(state.seed);
      const [chance, afterChance] = rollPercent(afterDie);
      const offTable = chance < state.config.offTableChance;

      let next: GameState = { ...state, seed: afterChance, lastRoll: face };
      next = pushLog(next, 'roll', `${active.name} rolled ${face}`);

      if (offTable) {
        next = giveDrinks(next, active.id, next.config.fullDrink, null);
        next = pushLog(next, 'info', `${active.name} knocked the die off the table!`);
      }

      // Confuse Ray: this same roll is the attempt to shake it off. Fail and
      // the turn is spent; succeed and the roll still moves you.
      if (rollToClearStatuses(active).length > 0) {
        next = clearByRoll(next, active.id, face);
        if (rollToClearStatuses(activePlayer(next)).length > 0) {
          next = pushLog(next, 'status', `${active.name} is still confused and loses the turn`);
          return pinnedInPlace(next, face, offTable);
        }
        next = pushLog(next, 'status', `${active.name} snapped out of it`);
      }

      // Zubats pins you here on a 1 or 2, and costs a drink.
      if (hasStatus(active, 'zubats')) {
        if (face <= 2) {
          next = giveDrinks(next, active.id, 1, null);
          next = pushLog(next, 'info', `${active.name} is still swarmed by Zubats`);
          return pinnedInPlace(next, face, offTable);
        }
        next = clearStatus(next, active.id, 'zubats');
      }

      return { ...next, phase: { name: 'rolling', face, offTable } };
    }

    case 'DICE_SHOWN': {
      if (state.phase.name !== 'rolling') return state;
      const active = activePlayer(state);
      // A pinned player — swarmed or still confused — already had their turn
      // resolved during ROLL.
      if (hasStatus(active, 'zubats') || rollToClearStatuses(active).length > 0) {
        return { ...state, phase: { name: 'turnEnd' } };
      }
      const steps = movementFor(active, state.phase.face);
      return { ...state, phase: { name: 'moving', remaining: steps } };
    }

    case 'STEP_DONE': {
      if (state.phase.name !== 'moving') return state;
      const { state: moved, stop } = stepOnce(state);
      const remaining = state.phase.remaining - 1;
      const done = stop || remaining <= 0 || activePlayer(moved).square === LAST_SQUARE;
      return { ...moved, phase: done ? { name: 'landed' } : { name: 'moving', remaining } };
    }

    case 'DISMISS_SQUARE': {
      if (state.phase.name !== 'landed') return state;
      const active = activePlayer(state);

      if (active.square === LAST_SQUARE) {
        const finished = updatePlayer(state, active.id, (p) => ({ ...p, finishedAtTurn: state.turnNumber }));
        return pushLog(finished, 'info', `${active.name} finished the board!`);
      }

      const square = getSquare(BOARD_ORIGINAL, active.square);
      return drainQueue({
        ...state,
        queue: [...square.effects],
        queueExit: 'turnEnd',
        phase: { name: 'resolving' },
      });
    }

    case 'ACK_NOTE': {
      if (state.phase.name !== 'note') return state;
      return drainQueue({ ...state, phase: { name: 'resolving' } });
    }

    case 'ACK_BATTLE': {
      if (state.phase.name !== 'battle') return state;
      return drainQueue({ ...state, phase: { name: 'resolving' } });
    }

    case 'RESOLVE_PROMPT': {
      if (state.phase.name !== 'prompt') return state;
      return drainQueue(resolvePrompt(state, action.result));
    }

    case 'END_TURN': {
      if (state.phase.name !== 'turnEnd' && state.phase.name !== 'landed') return state;
      return advanceTurn(state);
    }
  }
}
