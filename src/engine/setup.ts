import type { Gender, StarterId } from '../data/types';
import type { GameConfig, GameState, Player } from './types';

export interface NewPlayerInput {
  readonly name: string;
  readonly starter: StarterId;
  readonly gender: Gender;
}

export interface NewGameInput {
  readonly boardId: string;
  readonly seed: number;
  readonly config: GameConfig;
  readonly players: readonly NewPlayerInput[];
}

export const DEFAULT_CONFIG: GameConfig = {
  fullDrink: 10,
  trainerBattles: true,
  offTableChance: 1,
  maxMissedTurns: 6,
};

export function createGame(input: NewGameInput): GameState {
  if (input.players.length < 2) {
    throw new Error('A game needs at least 2 players');
  }

  const players: Player[] = input.players.map((p, index) => ({
    id: `p${index}`,
    name: p.name.trim() || `Trainer ${index + 1}`,
    starter: p.starter,
    gender: p.gender,
    square: 0,
    drinks: 0,
    missedTurns: 0,
    extraTurns: 0,
    statuses: [],
    finishedAtTurn: null,
  }));

  return {
    boardId: input.boardId,
    config: input.config,
    players,
    activeIndex: 0,
    seed: input.seed,
    turnNumber: 1,
    phase: { name: 'idle' },
    queue: [],
    queueExit: 'turnEnd',
    resolveFrom: 1,
    squareRoll: null,
    enteredZone: null,
    vars: {},
    lastRoll: null,
    log: [{ seq: 1, kind: 'turn', text: `${players[0].name}'s turn` }],
    logSeq: 1,
  };
}
