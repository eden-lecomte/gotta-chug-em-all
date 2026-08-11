import type { BranchCond, Effect } from '../data/types';
import { BOARD_ORIGINAL, getSquare } from '../data/boards/original';
import { resolveAmount } from './amount';
import { nextInt, rollDie } from './rng';
import { activePlayer, pushLog, resolveTarget, updatePlayer } from './targets';
import type { GameState, PlayerId, Prompt, ResolveCtx } from './types';

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
 * What Metronome copies from another square: what it makes you drink or give,
 * plus the rolls those amounts depend on. Movement, statuses, prompts, flavour
 * and a nested Metronome are dropped — square 9 promises only "drink or give
 * what it says". Dropping a `roll` while keeping the `drink` that reads its
 * variable would throw on an unbound var, so binders are always kept.
 */
function copyableEffects(effects: readonly Effect[]): Effect[] {
  const out: Effect[] = [];
  for (const effect of effects) {
    switch (effect.kind) {
      case 'drink':
      case 'give':
      case 'roll':
      case 'rollWhile':
        out.push(effect);
        break;
      case 'rollBranch':
        out.push({
          ...effect,
          branches: effect.branches.map((b) => ({ ...b, effects: copyableEffects(b.effects) })),
        });
        break;
      case 'rollTimes':
        out.push({
          ...effect,
          onSuccess: copyableEffects(effect.onSuccess),
          onFail: copyableEffects(effect.onFail),
        });
        break;
      case 'ifAnyPlayerHasStatus':
        out.push({
          ...effect,
          then: copyableEffects(effect.then),
          otherwise: copyableEffects(effect.otherwise),
        });
        break;
      default:
        break;
    }
  }
  return out;
}

/** Whether a copied tree can still make anyone drink, at any branch depth. */
function paysADrink(effects: readonly Effect[]): boolean {
  return effects.some((effect) => {
    switch (effect.kind) {
      case 'drink':
      case 'give':
        return true;
      case 'rollBranch':
        return effect.branches.some((b) => paysADrink(b.effects));
      case 'rollTimes':
        return paysADrink(effect.onSuccess) || paysADrink(effect.onFail);
      case 'ifAnyPlayerHasStatus':
        return paysADrink(effect.then) || paysADrink(effect.otherwise);
      default:
        return false;
    }
  });
}

export function matchesCond(face: number, cond: BranchCond): boolean {
  return 'faces' in cond ? cond.faces.includes(face) : (face % 2 === 0) === (cond.parity === 'even');
}

/**
 * Apply exactly one effect. Effects that need player input (Task 9) extend this
 * switch. An effect may park the phase — `drainQueue` checks for that and stops.
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
      if (effect.target === 'chosen') {
        return {
          ...state,
          phase: {
            name: 'prompt',
            prompt: { id: 'choosePlayer', purpose: 'status', status: effect.status, expires: effect.expires },
          },
        };
      }
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

    case 'roll': {
      const [face, seed] = rollDie(state.seed);
      const next = { ...state, seed, lastRoll: face, vars: { ...state.vars, [effect.as]: face } };
      return pushLog(next, 'roll', `${activePlayer(state).name} rolled ${face}`);
    }

    case 'rollBranch': {
      const [face, seed] = rollDie(state.seed);
      const branch = effect.branches.find((b) => matchesCond(face, b.when));
      if (!branch) throw new Error(`Rolled ${face} but no branch matched`);
      const vars = effect.as ? { ...state.vars, [effect.as]: face } : state.vars;
      const next = {
        ...state,
        seed,
        lastRoll: face,
        vars,
        queue: [...branch.effects, ...state.queue],
      };
      return pushLog(next, 'roll', `${activePlayer(state).name} rolled ${face}`);
    }

    case 'rollWhile': {
      let seed = state.seed;
      let count = 0;
      let face = 0;
      while (count < effect.max) {
        [face, seed] = rollDie(seed);
        if (!matchesCond(face, effect.continueWhen)) break;
        count += 1;
      }
      const next = { ...state, seed, lastRoll: face, vars: { ...state.vars, [effect.as]: count } };
      return pushLog(next, 'roll', `${activePlayer(state).name} kept rolling — ${count} in a row`);
    }

    case 'rollTimes': {
      let seed = state.seed;
      let succeeded = false;
      const faces: number[] = [];
      for (let i = 0; i < effect.times; i++) {
        const [face, nextSeed] = rollDie(seed);
        seed = nextSeed;
        faces.push(face);
        if (effect.succeedOn.includes(face)) succeeded = true;
      }
      const chosen = succeeded ? effect.onSuccess : effect.onFail;
      const next = {
        ...state,
        seed,
        lastRoll: faces.at(-1) ?? state.lastRoll,
        queue: [...chosen, ...state.queue],
      };
      return pushLog(next, 'roll', `${activePlayer(state).name} rolled ${faces.join(', ')}`);
    }

    case 'randomSquare': {
      const [index, seed] = nextInt(state.seed, BOARD_ORIGINAL.squares.length);
      const square = getSquare(BOARD_ORIGINAL, index);
      // Metronome copies what the square makes you drink or give. A square that
      // pays nothing — flavour, movement, a status, or Start — falls back to
      // the legacy "if no drink is given or taken, just drink 2" rule.
      const copyable = copyableEffects(square.effects);
      const copied = paysADrink(copyable)
        ? copyable
        : ([{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } }] as const);
      const next = { ...state, seed, queue: [...copied, ...state.queue] };
      return pushLog(next, 'info', `Metronome copied square ${index}: ${square.text}`);
    }

    case 'ifAnyPlayerHasStatus': {
      const held = state.players.some((p) => p.statuses.some((s) => s.id === effect.status));
      const chosen = held ? effect.then : effect.otherwise;
      return { ...state, queue: [...chosen, ...state.queue] };
    }

    case 'give': {
      const drinks = resolveAmount(effect.amount, ctxOf(state));
      const players =
        effect.players === 'all' ? ('all' as const) : resolveAmount(effect.players, ctxOf(state));
      if (drinks <= 0 || players === 0) return state;
      return { ...state, phase: { name: 'prompt', prompt: { id: 'givePlayers', drinks, players } } };
    }

    case 'movePlayerBy':
      return {
        ...state,
        phase: { name: 'prompt', prompt: { id: 'choosePlayer', purpose: 'move', squares: effect.squares } },
      };

    case 'prompt':
      return { ...state, phase: { name: 'prompt', prompt: { id: effect.prompt } as Prompt } };

    default:
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
    return { ...current, phase: { name: current.queueExit } };
  }
  return current;
}
