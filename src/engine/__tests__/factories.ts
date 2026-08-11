import type { GameConfig, GameState, Player } from '../types';
import type { Gender, StarterId } from '../../data/types';

export const DEFAULT_CONFIG: GameConfig = {
  fullDrink: 10,
  trainerBattles: false,
  offTableChance: 0,
  maxMissedTurns: 6,
};

export function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: id.toUpperCase(),
    starter: 'bulbasaur' as StarterId,
    gender: 'x' as Gender,
    square: 0,
    drinks: 0,
    missedTurns: 0,
    extraTurns: 0,
    statuses: [],
    finishedAtTurn: null,
    ...overrides,
  };
}

/** A game in the `resolving` phase, ready for effects to be applied. */
export function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    boardId: 'original',
    config: DEFAULT_CONFIG,
    players: [makePlayer('a'), makePlayer('b'), makePlayer('c')],
    activeIndex: 0,
    seed: 12345,
    turnNumber: 1,
    phase: { name: 'resolving' },
    queue: [],
    queueExit: 'turnEnd',
    resolveFrom: 0,
    squareRoll: null,
    enteredZone: null,
    vars: {},
    lastRoll: null,
    log: [],
    logSeq: 0,
    ...overrides,
  };
}
