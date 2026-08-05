export type StarterId =
  | 'bulbasaur' | 'charmander' | 'squirtle' | 'pikachu' | 'caterpie'
  | 'weedle' | 'pidgey' | 'nidoran' | 'nidorina' | 'poliwag';

export type Gender = 'm' | 'f' | 'x';

/**
 * A small expression language for "how many drinks". Kept declarative rather
 * than using closures so squares stay serializable and replayable.
 * `var` reads a value bound earlier in the same effect queue by a `roll` effect.
 */
export type Amount =
  | { kind: 'fixed'; value: number }
  | { kind: 'full' }                                    // config.fullDrink
  | { kind: 'perPlayer' }                               // one per player in game
  | { kind: 'var'; name: string }
  | { kind: 'sum'; a: Amount; b: Amount }
  | { kind: 'product'; a: Amount; b: Amount }
  | { kind: 'offset'; of: Amount; delta: number }
  | { kind: 'half'; of: Amount; round: 'up' | 'down' };

export type Target = 'self' | 'everyoneElse' | 'everyone' | 'sameGender';

export type StatusId =
  | 'zubats'          // must roll 3+ to leave this square
  | 'confuseRay'      // roll 1-3 to clear, otherwise miss the turn
  | 'stringShot'      // next move is halved (round up)
  | 'doubleMove'      // next move is doubled
  | 'reflect'         // drinks given to you rebound on the giver at 3x
  | 'possessed'       // flavour: anyone can make you fetch a drink
  | 'skipNextGym'     // pass through the next gold gym without stopping
  | 'inSilphCo'       // +2 drinks at the start of each of your turns
  | 'inSafariZone'    // roll before each turn for a Safari Zone penalty
  | 'inTower'         // flavour: no speaking in the Pokémon Tower
  | 'copying'         // Ditto: copy everything the next player does
  | 'nonDominantHand' // rest of game: drink with the other hand
  | 'ruleMaker';      // flavour: you made a house rule

/** When a status is removed. Checked by `tickStatuses`. */
export type StatusExpiry =
  | 'nextTurnStart'   // cleared at the start of the holder's next turn
  | 'afterNextTurn'   // survives one full turn, cleared at its end
  | 'leaveSquare'     // cleared when the holder moves off the square
  | 'endOfGame';      // never cleared

export type PromptId =
  | 'givePlayers'     // choose N players to receive drinks
  | 'choosePlayer'    // choose exactly one player (statuses, Haunter)
  | 'snorlaxSong'     // did you sing? yes = free, no = 4 drinks
  | 'evolution'       // evolve (4 + skip gym) or stop (extra turn)
  | 'saffronNumber'   // pick 1-6, then roll
  | 'chuggingContest' // pick an opponent, then report the winner
  | 'koffingSmoke'    // did you smoke? yes = free, no = 2 drinks
  | 'pokeballCatch';  // is your favourite on the board?

export type BranchCond =
  | { faces: readonly number[] }
  | { parity: 'even' | 'odd' };

export interface Branch {
  readonly when: BranchCond;
  readonly effects: readonly Effect[];
}

/**
 * Every rule on the board is one of these. The old code used arbitrary
 * `fn()` closures that mutated globals and the DOM; these are inert data
 * interpreted by `applyEffect`.
 */
export type Effect =
  /** Bind a die roll to a name usable by `{kind:'var'}` later in the queue. */
  | { kind: 'roll'; as: string }
  /** Roll, bind optionally, then splice in the matching branch's effects. */
  | { kind: 'rollBranch'; as?: string; branches: readonly Branch[] }
  /** Keep rolling while the condition holds; bind the number of continues. */
  | { kind: 'rollWhile'; continueWhen: BranchCond; as: string; max: number }
  /** Roll `times` dice; success if any face is in `succeedOn`. */
  | { kind: 'rollTimes'; times: number; succeedOn: readonly number[]; onSuccess: readonly Effect[]; onFail: readonly Effect[] }
  | { kind: 'drink'; target: Target; amount: Amount }
  /** Parks the queue on a `givePlayers` prompt. */
  | { kind: 'give'; amount: Amount; players: Amount | 'all' }
  | { kind: 'moveTo'; square: number }
  | { kind: 'moveBy'; squares: number }
  /** Parks on a `choosePlayer` prompt, then moves them. */
  | { kind: 'movePlayerBy'; squares: number }
  | { kind: 'extraTurn' }
  | { kind: 'missTurn'; amount: Amount }
  | { kind: 'applyStatus'; target: Target | 'chosen'; status: StatusId; expires: StatusExpiry }
  | { kind: 'setStarter'; starter: StarterId }
  /** Clefairy: pick a random square and apply its effects. */
  | { kind: 'randomSquare' }
  | { kind: 'ifAnyPlayerHasStatus'; status: StatusId; then: readonly Effect[]; otherwise: readonly Effect[] }
  | { kind: 'prompt'; prompt: PromptId }
  /** Pure flavour or a social rule the app cannot enforce. Shown, then acked. */
  | { kind: 'note'; text: string };

export type SquareKind = 'normal' | 'start' | 'goldGym' | 'silverZone' | 'finish';

export interface Square {
  readonly id: number;
  /** Percentage of board width, 0..100. */
  readonly x: number;
  /** Percentage of board height, 0..100. */
  readonly y: number;
  readonly kind: SquareKind;
  readonly text: string;
  readonly action: string;
  readonly effects: readonly Effect[];
}

export interface Board {
  readonly id: string;
  readonly name: string;
  readonly image: string;
  /** Board images are square; this is the natural pixel size of one side. */
  readonly imageSize: number;
  readonly squares: readonly Square[];
}
