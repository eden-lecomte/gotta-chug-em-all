import { assetUrl } from '../assets';
import type { Amount, Board, Effect, Square, SquareKind } from '../types';
import coords from './original.coords.json';

/** Shorthand for a plain numeric amount, used all over the rules below. */
const n = (value: number): Amount => ({ kind: 'fixed', value });

/** Per-square rule definitions, keyed by square id. Text/coords come from JSON. */
const RULES: Record<number, { kind?: SquareKind; effects: Effect[] }> = {
  0: { kind: 'start', effects: [] },

  1: { effects: [{ kind: 'drink', target: 'self', amount: { kind: 'full' } }] },

  2: {
    effects: [
      { kind: 'give', amount: n(1), players: n(1) },
      { kind: 'extraTurn' },
    ],
  },

  3: {
    effects: [
      { kind: 'applyStatus', target: 'everyoneElse', status: 'stringShot', expires: 'afterNextTurn' },
    ],
  },

  4: {
    effects: [
      { kind: 'drink', target: 'self', amount: n(2) },
      { kind: 'setStarter', starter: 'pikachu' },
    ],
  },

  5: { effects: [{ kind: 'give', amount: n(1), players: n(2) }] },

  // Pewter Gym. Legacy wrote its result into gameSquares[19]; it writes nothing now.
  6: {
    kind: 'goldGym',
    effects: [
      {
        kind: 'rollBranch',
        branches: [
          { when: { parity: 'even' }, effects: [{ kind: 'give', amount: n(1), players: n(1) }] },
          { when: { parity: 'odd' }, effects: [{ kind: 'drink', target: 'self', amount: n(1) }] },
        ],
      },
    ],
  },

  7: { effects: [{ kind: 'drink', target: 'sameGender', amount: n(1) }] },

  8: {
    effects: [
      { kind: 'drink', target: 'self', amount: n(1) },
      { kind: 'applyStatus', target: 'self', status: 'zubats', expires: 'leaveSquare' },
    ],
  },

  9: { effects: [{ kind: 'randomSquare' }] },

  10: { effects: [{ kind: 'extraTurn' }] },

  11: { effects: [{ kind: 'moveTo', square: 28 }] },

  // Gary: roll, then drink half and give half, both rounded up as the text says.
  12: {
    effects: [
      { kind: 'roll', as: 'gary' },
      { kind: 'drink', target: 'self', amount: { kind: 'half', of: { kind: 'var', name: 'gary' }, round: 'up' } },
      { kind: 'give', amount: { kind: 'half', of: { kind: 'var', name: 'gary' }, round: 'up' }, players: n(1) },
    ],
  },

  // Cerulean Gym. Legacy double-counted the current player; now 2 for you, 1 for the rest.
  13: {
    kind: 'goldGym',
    effects: [
      { kind: 'drink', target: 'self', amount: n(2) },
      { kind: 'drink', target: 'everyoneElse', amount: n(1) },
    ],
  },

  14: { effects: [{ kind: 'note', text: 'Invent a gesture. For the rest of the game, the last player to mimic it drinks 1.' }] },

  15: { effects: [{ kind: 'give', amount: n(1), players: n(1) }] },

  // Meowth Pay Day. Legacy overwrote every player's tally with the current player's.
  16: { effects: [{ kind: 'drink', target: 'everyoneElse', amount: n(1) }] },

  17: { effects: [{ kind: 'drink', target: 'self', amount: { kind: 'full' } }] },

  // S.S. Anne: lose A turns, drink B on each of them.
  18: {
    effects: [
      { kind: 'roll', as: 'turns' },
      { kind: 'roll', as: 'perTurn' },
      { kind: 'missTurn', amount: { kind: 'var', name: 'turns' } },
      {
        kind: 'drink',
        target: 'self',
        amount: { kind: 'product', a: { kind: 'var', name: 'turns' }, b: { kind: 'var', name: 'perTurn' } },
      },
    ],
  },

  19: {
    kind: 'goldGym',
    effects: [
      {
        kind: 'rollBranch',
        branches: [
          {
            when: { parity: 'even' },
            effects: [
              { kind: 'drink', target: 'self', amount: n(2) },
              { kind: 'missTurn', amount: n(1) },
            ],
          },
          { when: { parity: 'odd' }, effects: [{ kind: 'drink', target: 'self', amount: n(1) }] },
        ],
      },
    ],
  },

  20: { effects: [{ kind: 'applyStatus', target: 'self', status: 'doubleMove', expires: 'afterNextTurn' }] },

  21: { effects: [{ kind: 'note', text: 'Magikarp used Splash! But nothing happened.' }] },

  22: { effects: [{ kind: 'applyStatus', target: 'self', status: 'nonDominantHand', expires: 'endOfGame' }] },

  23: {
    kind: 'silverZone',
    effects: [
      { kind: 'drink', target: 'everyone', amount: n(1) },
      { kind: 'applyStatus', target: 'self', status: 'inTower', expires: 'leaveZone' },
    ],
  },

  24: { kind: 'silverZone', effects: [{ kind: 'applyStatus', target: 'self', status: 'possessed', expires: 'leaveSquare' }] },

  25: { kind: 'silverZone', effects: [{ kind: 'movePlayerBy', squares: -10 }] },

  26: {
    kind: 'silverZone',
    effects: [
      { kind: 'note', text: 'Share a depressing story with the group.' },
      { kind: 'drink', target: 'everyone', amount: n(1) },
    ],
  },

  27: {
    kind: 'silverZone',
    effects: [
      {
        kind: 'ifAnyPlayerHasStatus',
        status: 'inSilphCo',
        then: [{ kind: 'drink', target: 'everyoneElse', amount: n(1) }],
        otherwise: [{ kind: 'drink', target: 'self', amount: n(3) }],
      },
    ],
  },

  28: { effects: [{ kind: 'moveTo', square: 11 }] },

  29: { effects: [{ kind: 'prompt', prompt: 'snorlaxSong' }] },

  30: {
    effects: [
      { kind: 'roll', as: 'gary2' },
      { kind: 'drink', target: 'self', amount: { kind: 'offset', of: { kind: 'var', name: 'gary2' }, delta: -1 } },
    ],
  },

  31: {
    effects: [
      { kind: 'note', text: 'Choose a new rule. Any violation costs a drink.' },
      { kind: 'applyStatus', target: 'self', status: 'ruleMaker', expires: 'endOfGame' },
    ],
  },

  32: {
    kind: 'goldGym',
    effects: [
      {
        kind: 'rollBranch',
        branches: [
          { when: { faces: [1, 2, 3] }, effects: [{ kind: 'missTurn', amount: n(1) }] },
          { when: { faces: [4, 5, 6] }, effects: [{ kind: 'drink', target: 'self', amount: { kind: 'full' } }] },
        ],
      },
    ],
  },

  33: { effects: [{ kind: 'note', text: 'Invent a gesture. For the rest of the game, the last player to mimic it drinks 1.' }] },

  34: { effects: [{ kind: 'prompt', prompt: 'evolution' }] },

  35: { effects: [{ kind: 'applyStatus', target: 'self', status: 'reflect', expires: 'leaveSquare' }] },

  36: { kind: 'silverZone', effects: [{ kind: 'applyStatus', target: 'self', status: 'inSilphCo', expires: 'leaveZone' }] },

  37: { kind: 'silverZone', effects: [{ kind: 'drink', target: 'self', amount: { kind: 'perPlayer' } }] },

  // Lapras: the chosen player stays confused until they roll a 1-3, per the text.
  38: { kind: 'silverZone', effects: [{ kind: 'applyStatus', target: 'chosen', status: 'confuseRay', expires: 'rollToClear' }] },

  // Team Rocket. Legacy overwrote every player's tally.
  39: { kind: 'silverZone', effects: [{ kind: 'drink', target: 'everyone', amount: n(1) }] },

  40: {
    kind: 'silverZone',
    effects: [
      {
        kind: 'rollBranch',
        as: 'gio',
        branches: [
          { when: { faces: [1, 2, 3] }, effects: [{ kind: 'give', amount: { kind: 'var', name: 'gio' }, players: n(1) }] },
          { when: { faces: [4, 5, 6] }, effects: [{ kind: 'drink', target: 'self', amount: { kind: 'var', name: 'gio' } }] },
        ],
      },
    ],
  },

  41: { effects: [{ kind: 'extraTurn' }] },

  42: {
    effects: [
      { kind: 'roll', as: 'gary3' },
      { kind: 'drink', target: 'self', amount: { kind: 'var', name: 'gary3' } },
    ],
  },

  43: { kind: 'goldGym', effects: [{ kind: 'prompt', prompt: 'saffronNumber' }] },

  44: { effects: [{ kind: 'prompt', prompt: 'chuggingContest' }] },

  45: { effects: [{ kind: 'give', amount: { kind: 'full' }, players: n(1) }] },

  46: {
    effects: [
      { kind: 'note', text: "Copy everything the next player does during their turn." },
      { kind: 'applyStatus', target: 'self', status: 'copying', expires: 'afterNextTurn' },
    ],
  },

  47: {
    effects: [
      { kind: 'give', amount: n(4), players: n(1) },
      { kind: 'drink', target: 'self', amount: n(1) },
    ],
  },

  48: { kind: 'silverZone', effects: [{ kind: 'applyStatus', target: 'self', status: 'inSafariZone', expires: 'leaveZone' }] },

  49: {
    kind: 'silverZone',
    effects: [
      {
        kind: 'rollBranch',
        branches: [
          { when: { faces: [1] }, effects: [{ kind: 'note', text: 'You caught the Dratini!' }] },
          { when: { faces: [2, 3, 4, 5, 6] }, effects: [{ kind: 'drink', target: 'self', amount: n(1) }] },
        ],
      },
    ],
  },

  50: { kind: 'silverZone', effects: [{ kind: 'drink', target: 'self', amount: n(2) }] },

  51: {
    kind: 'silverZone',
    effects: [
      {
        kind: 'rollBranch',
        branches: [
          { when: { faces: [1, 2, 3] }, effects: [{ kind: 'drink', target: 'self', amount: n(1) }] },
          { when: { faces: [4, 5, 6] }, effects: [{ kind: 'give', amount: n(2), players: n(1) }] },
        ],
      },
    ],
  },

  52: { kind: 'goldGym', effects: [{ kind: 'drink', target: 'self', amount: n(3) }] },

  53: { effects: [{ kind: 'drink', target: 'everyone', amount: { kind: 'full' } }] },

  // Electabuzz. Legacy used `missTurn: true`, and parseInt(true) is NaN.
  54: { effects: [{ kind: 'missTurn', amount: n(1) }] },

  55: { effects: [{ kind: 'drink', target: 'self', amount: { kind: 'full' } }] },

  56: { effects: [{ kind: 'note', text: 'Waterfall! Everyone starts drinking, and you can only stop when the player to your right stops.' }] },

  57: {
    effects: [
      {
        kind: 'rollTimes',
        times: 3,
        succeedOn: [5, 6],
        onSuccess: [{ kind: 'note', text: 'You escaped the glitch.' }],
        onFail: [{ kind: 'moveTo', square: 0 }],
      },
    ],
  },

  58: {
    kind: 'goldGym',
    effects: [
      { kind: 'rollWhile', continueWhen: { parity: 'even' }, as: 'evens', max: 20 },
      {
        kind: 'drink',
        target: 'self',
        amount: { kind: 'product', a: { kind: 'var', name: 'evens' }, b: n(2) },
      },
    ],
  },

  59: { effects: [{ kind: 'prompt', prompt: 'koffingSmoke' }] },

  60: { effects: [{ kind: 'note', text: 'Everyone older than you drinks 2.' }] },

  61: { effects: [{ kind: 'prompt', prompt: 'pokeballCatch' }] },

  62: {
    kind: 'finish',
    effects: [
      { kind: 'roll', as: 'persian' },
      { kind: 'give', amount: n(1), players: { kind: 'var', name: 'persian' } },
    ],
  },
};

const squares: readonly Square[] = Object.freeze(
  coords.map((c) => {
    const rule = RULES[c.id] ?? { effects: [] };
    return Object.freeze({
      id: c.id,
      x: c.x,
      y: c.y,
      kind: rule.kind ?? 'normal',
      text: c.text,
      action: c.action,
      effects: Object.freeze(rule.effects),
    }) as Square;
  }),
);

export const BOARD_ORIGINAL: Board = Object.freeze({
  id: 'original',
  name: 'Original',
  image: assetUrl('/img/board-original.webp'),
  imageSize: 2216,
  squares,
});

export function getSquare(board: Board, id: number): Square {
  const square = board.squares[id];
  if (!square) throw new Error(`Square ${id} does not exist on board ${board.id}`);
  return square;
}
