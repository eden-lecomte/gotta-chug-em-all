import type { Effect } from '../data/types';
import { BOARD_ORIGINAL } from '../data/boards/original';
import { resolveAmount } from './amount';
import { activePlayer, pushLog, resolveTarget, updatePlayer } from './targets';
import type { GameState, PlayerId, ResolveCtx } from './types';

const LAST_SQUARE = BOARD_ORIGINAL.squares.length - 1;

function ctxOf(state: GameState): ResolveCtx {
  return { config: state.config, playerCount: state.players.length, vars: state.vars };
}

function nameOf(state: GameState, id: PlayerId): string {
  return state.players.find((p) => p.id === id)?.name ?? id;
}

/**
 * The single place drinks are added to a player. Porygon's `reflect` status
 * rebounds given drinks onto the giver at 3x, so every path that awards a
 * drink from one player to another must go through here.
 */
export function giveDrinks(
  state: GameState,
  toId: PlayerId,
  drinks: number,
  fromId: PlayerId | null,
): GameState {
  if (drinks <= 0) return state;
  const receiver = state.players.find((p) => p.id === toId);
  if (!receiver) throw new Error(`Unknown player ${toId}`);

  const reflects = receiver.statuses.some((s) => s.id === 'reflect');
  if (reflects && fromId && fromId !== toId) {
    const rebound = drinks * 3;
    const next = updatePlayer(state, fromId, (p) => ({ ...p, drinks: p.drinks + rebound }));
    return pushLog(
      next,
      'drink',
      `${nameOf(state, toId)} reflected it — ${nameOf(state, fromId)} drinks ${rebound}`,
    );
  }

  const next = updatePlayer(state, toId, (p) => ({ ...p, drinks: p.drinks + drinks }));
  return pushLog(next, 'drink', `${nameOf(state, toId)} drinks ${drinks}`);
}

function clampSquare(square: number): number {
  return Math.min(LAST_SQUARE, Math.max(0, square));
}

/**
 * Apply exactly one effect. Effects that need randomness (Task 8) or player
 * input (Task 9) extend this switch. An effect may park the phase — `drainQueue`
 * checks for that and stops.
 */
export function applyEffect(state: GameState, effect: Effect): GameState {
  switch (effect.kind) {
    case 'drink': {
      const amount = resolveAmount(effect.amount, ctxOf(state));
      const ids = resolveTarget(effect.target, state);
      return ids.reduce((acc, id) => giveDrinks(acc, id, amount, null), state);
    }

    case 'moveTo': {
      const active = activePlayer(state);
      const next = updatePlayer(state, active.id, (p) => ({ ...p, square: clampSquare(effect.square) }));
      return pushLog(next, 'move', `${active.name} moves to square ${clampSquare(effect.square)}`);
    }

    case 'moveBy': {
      const active = activePlayer(state);
      const target = clampSquare(active.square + effect.squares);
      const next = updatePlayer(state, active.id, (p) => ({ ...p, square: target }));
      const verb = effect.squares < 0 ? 'is dragged back' : 'advances';
      return pushLog(next, 'move', `${active.name} ${verb} to square ${target}`);
    }

    case 'extraTurn': {
      const active = activePlayer(state);
      const next = updatePlayer(state, active.id, (p) => ({ ...p, extraTurns: p.extraTurns + 1 }));
      return pushLog(next, 'turn', `${active.name} takes another turn`);
    }

    case 'missTurn': {
      const active = activePlayer(state);
      const raw = resolveAmount(effect.amount, ctxOf(state));
      const turns = Math.min(raw, state.config.maxMissedTurns);
      if (turns <= 0) return state;
      const next = updatePlayer(state, active.id, (p) => ({ ...p, missedTurns: p.missedTurns + turns }));
      return pushLog(next, 'turn', `${active.name} misses ${turns} turn${turns === 1 ? '' : 's'}`);
    }

    case 'applyStatus': {
      if (effect.target === 'chosen') return state; // handled in Task 9
      const ids = resolveTarget(effect.target, state);
      const square = activePlayer(state).square;
      return ids.reduce((acc, id) => {
        const player = acc.players.find((p) => p.id === id)!;
        if (player.statuses.some((s) => s.id === effect.status)) return acc;
        const withStatus = updatePlayer(acc, id, (p) => ({
          ...p,
          statuses: [...p.statuses, { id: effect.status, expires: effect.expires, appliedOnSquare: square }],
        }));
        return pushLog(withStatus, 'status', `${nameOf(acc, id)} is now ${effect.status}`);
      }, state);
    }

    case 'setStarter': {
      const active = activePlayer(state);
      const next = updatePlayer(state, active.id, (p) => ({ ...p, starter: effect.starter }));
      return pushLog(next, 'info', `${active.name}'s Pokémon is now ${effect.starter}`);
    }

    case 'note':
      return { ...state, phase: { name: 'note', text: effect.text } };

    default:
      // Randomness (Task 8) and prompt (Task 9) effects land here until implemented.
      throw new Error(`Unhandled effect kind: ${(effect as { kind: string }).kind}`);
  }
}

/**
 * Apply queued effects until the queue empties or an effect parks the phase
 * (a note or a prompt). Resuming is just calling this again once the phase is
 * set back to 'resolving'.
 */
export function drainQueue(state: GameState): GameState {
  let current = state;
  while (current.queue.length > 0 && current.phase.name === 'resolving') {
    const [head, ...rest] = current.queue;
    current = applyEffect({ ...current, queue: rest }, head);
  }
  if (current.queue.length === 0 && current.phase.name === 'resolving') {
    return { ...current, phase: { name: 'turnEnd' } };
  }
  return current;
}
