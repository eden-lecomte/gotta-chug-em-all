import type { Target } from '../data/types';
import type { GameState, LogKind, Player, PlayerId } from './types';

export function activePlayer(state: GameState): Player {
  const player = state.players[state.activeIndex];
  if (!player) throw new Error(`No player at index ${state.activeIndex}`);
  return player;
}

/** Expand a Target into concrete player ids, in seat order. */
export function resolveTarget(target: Target, state: GameState): PlayerId[] {
  const active = activePlayer(state);
  switch (target) {
    case 'self':
      return [active.id];
    case 'everyone':
      return state.players.map((p) => p.id);
    case 'everyoneElse':
      return state.players.filter((p) => p.id !== active.id).map((p) => p.id);
    case 'sameGender':
      // 'x' means unstated, so the rule cannot include anyone else.
      if (active.gender === 'x') return [active.id];
      return state.players.filter((p) => p.gender === active.gender).map((p) => p.id);
  }
}

export function updatePlayer(
  state: GameState,
  id: PlayerId,
  fn: (player: Player) => Player,
): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === id ? fn(p) : p)),
  };
}

export function pushLog(state: GameState, kind: LogKind, text: string): GameState {
  const seq = state.logSeq + 1;
  return { ...state, logSeq: seq, log: [...state.log, { seq, kind, text }] };
}
