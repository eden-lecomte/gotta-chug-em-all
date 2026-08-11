// Note: `Prompt`/`PromptResult` below spell their ids as literals rather than
// reusing `PromptId`, since each variant carries a different payload. Do not
// import `PromptId` here — it would be unused, which `noUnusedLocals` rejects.
import type {
  Effect, Gender, StarterId, StatusExpiry, StatusId,
} from '../data/types';

export type PlayerId = string;

export interface Status {
  readonly id: StatusId;
  readonly expires: StatusExpiry;
  /** Square the holder was on when a `leaveSquare` status was applied. */
  readonly appliedOnSquare: number;
}

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  readonly starter: StarterId;
  readonly gender: Gender;
  readonly square: number;
  readonly drinks: number;
  readonly missedTurns: number;
  readonly extraTurns: number;
  readonly statuses: readonly Status[];
  readonly finishedAtTurn: number | null;
}

export interface GameConfig {
  /** Drinks that constitute one full vessel. Legacy default 10. */
  readonly fullDrink: number;
  readonly trainerBattles: boolean;
  /** Percent chance per roll of knocking the die off the table. Legacy default 1. */
  readonly offTableChance: number;
  /** Cap on missed turns from a single effect. Legacy default 6. */
  readonly maxMissedTurns: number;
}

export type Prompt =
  | { readonly id: 'givePlayers'; readonly drinks: number; readonly players: number | 'all' }
  | { readonly id: 'choosePlayer'; readonly purpose: 'status'; readonly status: StatusId; readonly expires: StatusExpiry }
  | { readonly id: 'choosePlayer'; readonly purpose: 'move'; readonly squares: number }
  | { readonly id: 'snorlaxSong' }
  | { readonly id: 'evolution' }
  | { readonly id: 'saffronNumber' }
  | { readonly id: 'chuggingContest' }
  | { readonly id: 'koffingSmoke' }
  | { readonly id: 'pokeballCatch' };

export type PromptResult =
  | { readonly id: 'givePlayers'; readonly assignments: ReadonlyArray<{ playerId: PlayerId; drinks: number }> }
  | { readonly id: 'choosePlayer'; readonly playerId: PlayerId }
  | { readonly id: 'snorlaxSong'; readonly sang: boolean }
  | { readonly id: 'evolution'; readonly evolve: boolean }
  | { readonly id: 'saffronNumber'; readonly guess: number }
  | { readonly id: 'chuggingContest'; readonly opponentId: PlayerId; readonly winnerId: PlayerId }
  | { readonly id: 'koffingSmoke'; readonly smoked: boolean }
  | { readonly id: 'pokeballCatch'; readonly onBoard: boolean };

/**
 * The turn machine. The UI renders whatever the phase says and reports
 * animation completion back as an action — the engine never sleeps.
 */
export type Phase =
  | { readonly name: 'idle' }
  | { readonly name: 'rolling'; readonly face: number; readonly offTable: boolean }
  | { readonly name: 'moving'; readonly remaining: number }
  | { readonly name: 'landed' }
  | { readonly name: 'resolving' }
  | { readonly name: 'prompt'; readonly prompt: Prompt }
  | { readonly name: 'note'; readonly text: string }
  | { readonly name: 'battle'; readonly opponentId: PlayerId; readonly rolls: readonly [number, number] }
  | { readonly name: 'turnEnd' }
  | { readonly name: 'gameOver' };

export type LogKind = 'turn' | 'roll' | 'drink' | 'move' | 'status' | 'info';

export interface LogEntry {
  readonly seq: number;
  readonly kind: LogKind;
  readonly text: string;
}

export interface GameState {
  readonly boardId: string;
  readonly config: GameConfig;
  readonly players: readonly Player[];
  readonly activeIndex: number;
  readonly seed: number;
  readonly turnNumber: number;
  readonly phase: Phase;
  /** Effects still to apply for the current square. Drained by `drainQueue`. */
  readonly queue: readonly Effect[];
  /** Phase to enter when the queue empties. Turn-start upkeep exits to 'idle'. */
  readonly queueExit: 'idle' | 'turnEnd';
  /** Values bound by `roll`/`rollBranch`/`rollWhile`, cleared each turn. */
  readonly vars: Readonly<Record<string, number>>;
  readonly lastRoll: number | null;
  readonly log: readonly LogEntry[];
  readonly logSeq: number;
}

export type Action =
  | { readonly type: 'ROLL' }
  /** Dice animation finished; begin moving. */
  | { readonly type: 'DICE_SHOWN' }
  /** One token hop finished. */
  | { readonly type: 'STEP_DONE' }
  /** Player dismissed the square card; start resolving effects. */
  | { readonly type: 'DISMISS_SQUARE' }
  | { readonly type: 'ACK_NOTE' }
  | { readonly type: 'ACK_BATTLE' }
  | { readonly type: 'RESOLVE_PROMPT'; readonly result: PromptResult }
  | { readonly type: 'END_TURN' };

export interface ResolveCtx {
  readonly config: GameConfig;
  readonly playerCount: number;
  readonly vars: Readonly<Record<string, number>>;
}
