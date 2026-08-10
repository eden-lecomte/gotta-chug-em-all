import type { Effect } from '../data/types';
import { giveDrinks } from './effects';
import { rollDie } from './rng';
import { activePlayer, pushLog, updatePlayer } from './targets';
import type { GameState, PromptResult } from './types';

function drink(value: number): Effect {
  return { kind: 'drink', target: 'self', amount: { kind: 'fixed', value } };
}

/** Put the queue back into motion after a prompt is answered. */
function resume(state: GameState, queued: readonly Effect[] = []): GameState {
  return { ...state, phase: { name: 'resolving' }, queue: [...queued, ...state.queue] };
}

/**
 * Apply a player's answer to the pending prompt. Throws if the answer does not
 * match what was asked — a mismatched result means a UI bug, and silently
 * ignoring it would desync a future multiplayer session.
 */
export function resolvePrompt(state: GameState, result: PromptResult): GameState {
  if (state.phase.name !== 'prompt') {
    throw new Error(`No prompt is pending (phase is ${state.phase.name})`);
  }
  const prompt = state.phase.prompt;
  if (prompt.id !== result.id) {
    throw new Error(`Result "${result.id}" does not match pending prompt "${prompt.id}"`);
  }
  const active = activePlayer(state);

  switch (result.id) {
    case 'givePlayers': {
      if (prompt.id !== 'givePlayers') throw new Error('Prompt shape mismatch');
      const total = result.assignments.reduce((sum, a) => sum + a.drinks, 0);
      const allowed =
        prompt.players === 'all'
          ? prompt.drinks * Math.max(0, state.players.length - 1)
          : prompt.drinks * prompt.players;
      if (total > allowed) {
        throw new Error(`Assigned ${total} drinks, more drinks than the allowed ${allowed}`);
      }
      const applied = result.assignments.reduce(
        (acc, a) => giveDrinks(acc, a.playerId, a.drinks, active.id),
        state,
      );
      return resume(applied);
    }

    case 'choosePlayer': {
      if (prompt.id !== 'choosePlayer') throw new Error('Prompt shape mismatch');
      const target = state.players.find((p) => p.id === result.playerId);
      if (!target) throw new Error(`Unknown player ${result.playerId}`);

      if (prompt.purpose === 'move') {
        const square = Math.min(62, Math.max(0, target.square + prompt.squares));
        const moved = updatePlayer(state, target.id, (p) => ({ ...p, square }));
        return resume(pushLog(moved, 'move', `${target.name} is moved to square ${square}`));
      }

      if (target.statuses.some((s) => s.id === prompt.status)) return resume(state);
      const withStatus = updatePlayer(state, target.id, (p) => ({
        ...p,
        statuses: [...p.statuses, { id: prompt.status, expires: prompt.expires, appliedOnSquare: target.square }],
      }));
      return resume(pushLog(withStatus, 'status', `${target.name} is now ${prompt.status}`));
    }

    case 'snorlaxSong':
      return resume(state, result.sang ? [] : [drink(4)]);

    case 'koffingSmoke':
      return resume(state, result.smoked ? [] : [drink(2)]);

    case 'evolution':
      return resume(
        state,
        result.evolve
          ? [drink(4), { kind: 'applyStatus', target: 'self', status: 'skipNextGym', expires: 'endOfGame' }]
          : [{ kind: 'extraTurn' }],
      );

    case 'saffronNumber': {
      const [face, seed] = rollDie(state.seed);
      const rolled = pushLog({ ...state, seed, lastRoll: face }, 'roll', `Psychic roll: ${face}`);
      return resume(rolled, result.guess === face ? [{ kind: 'extraTurn' }] : [drink(2)]);
    }

    case 'chuggingContest': {
      const loserId = result.winnerId === active.id ? result.opponentId : active.id;
      const withWin = updatePlayer(state, result.winnerId, (p) => ({ ...p, extraTurns: p.extraTurns + 1 }));
      const withLoss = updatePlayer(withWin, loserId, (p) => ({
        ...p,
        missedTurns: p.missedTurns + 1,
      }));
      return resume(pushLog(withLoss, 'turn', `Chug-off won by ${result.winnerId}`));
    }

    case 'pokeballCatch':
      return resume(state, result.onBoard ? [] : [drink(3)]);
  }
}
