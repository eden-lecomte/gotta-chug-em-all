import { describe, it, expect } from 'vitest';
import {
  STATUS_META, clearByRoll, clearOnLeaveSquare, clearStatus, expireAfterTurn,
  hasStatus, movementFor, rollToClearStatuses, turnStartEffects,
} from '../statuses';
import { makePlayer, makeState } from './factories';
import type { Status } from '../types';
import { BOARD_ORIGINAL, getSquare } from '../../data/boards/original';

const status = (id: Status['id'], expires: Status['expires'], square = 0): Status =>
  ({ id, expires, appliedOnSquare: square });

describe('STATUS_META', () => {
  it('describes every status the board can apply', () => {
    for (const id of ['zubats', 'confuseRay', 'stringShot', 'doubleMove', 'reflect',
      'possessed', 'skipNextGym', 'inSilphCo', 'inSafariZone', 'inTower', 'copying',
      'nonDominantHand', 'ruleMaker'] as const) {
      expect(STATUS_META[id].label.length).toBeGreaterThan(0);
    }
  });
});

describe('movementFor', () => {
  it('is the raw roll with no statuses', () => {
    expect(movementFor(makePlayer('a'), 4)).toBe(4);
  });

  it('halves and rounds up under String Shot', () => {
    const p = makePlayer('a', { statuses: [status('stringShot', 'afterNextTurn')] });
    expect(movementFor(p, 5)).toBe(3);
    expect(movementFor(p, 4)).toBe(2);
    expect(movementFor(p, 1)).toBe(1);
  });

  it('doubles on the bicycle', () => {
    const p = makePlayer('a', { statuses: [status('doubleMove', 'afterNextTurn')] });
    expect(movementFor(p, 3)).toBe(6);
  });

  it('doubles then halves when both apply, never dropping below 1', () => {
    const p = makePlayer('a', {
      statuses: [status('doubleMove', 'afterNextTurn'), status('stringShot', 'afterNextTurn')],
    });
    expect(movementFor(p, 3)).toBe(3);
    expect(movementFor(p, 1)).toBe(1);
  });
});

describe('clearOnLeaveSquare', () => {
  it('drops leaveSquare statuses once the player moves off', () => {
    const state = makeState({
      players: [makePlayer('a', { square: 36, statuses: [status('inSilphCo', 'leaveSquare', 36)] })],
    });
    expect(clearOnLeaveSquare(state, 'a', 37).players[0].statuses).toHaveLength(0);
  });

  it('keeps them while the player stays put', () => {
    const state = makeState({
      players: [makePlayer('a', { square: 36, statuses: [status('inSilphCo', 'leaveSquare', 36)] })],
    });
    expect(clearOnLeaveSquare(state, 'a', 36).players[0].statuses).toHaveLength(1);
  });

  it('never drops endOfGame statuses', () => {
    const state = makeState({
      players: [makePlayer('a', { square: 22, statuses: [status('nonDominantHand', 'endOfGame', 22)] })],
    });
    expect(clearOnLeaveSquare(state, 'a', 40).players[0].statuses).toHaveLength(1);
  });
});

describe('expireAfterTurn', () => {
  it('drops afterNextTurn statuses at the end of the turn', () => {
    const state = makeState({ players: [makePlayer('a', { statuses: [status('doubleMove', 'afterNextTurn')] })] });
    expect(expireAfterTurn(state, 'a').players[0].statuses).toHaveLength(0);
  });

  it('leaves leaveSquare statuses alone', () => {
    const state = makeState({ players: [makePlayer('a', { statuses: [status('reflect', 'leaveSquare')] })] });
    expect(expireAfterTurn(state, 'a').players[0].statuses).toHaveLength(1);
  });

  it('leaves rollToClear statuses alone — only a roll clears those', () => {
    const state = makeState({ players: [makePlayer('a', { statuses: [status('confuseRay', 'rollToClear')] })] });
    expect(expireAfterTurn(state, 'a').players[0].statuses).toHaveLength(1);
  });
});

describe('clearStatus and hasStatus', () => {
  it('removes one status by id', () => {
    const state = makeState({
      players: [makePlayer('a', { statuses: [status('zubats', 'leaveSquare'), status('reflect', 'leaveSquare')] })],
    });
    const next = clearStatus(state, 'a', 'zubats');
    expect(hasStatus(next.players[0], 'zubats')).toBe(false);
    expect(hasStatus(next.players[0], 'reflect')).toBe(true);
  });
});

describe('rollToClear statuses (Lapras Confuse Ray)', () => {
  const confused = makeState({
    players: [makePlayer('a', { statuses: [status('confuseRay', 'rollToClear', 38)] })],
  });

  it('lists the statuses that need a roll to shake off', () => {
    expect(rollToClearStatuses(confused.players[0]).map((s) => s.id)).toEqual(['confuseRay']);
    expect(rollToClearStatuses(makePlayer('b'))).toEqual([]);
  });

  it('clears Confuse Ray on a 1-3 and keeps it on a 4-6', () => {
    for (const roll of [1, 2, 3]) {
      expect(hasStatus(clearByRoll(confused, 'a', roll).players[0], 'confuseRay')).toBe(false);
    }
    for (const roll of [4, 5, 6]) {
      expect(hasStatus(clearByRoll(confused, 'a', roll).players[0], 'confuseRay')).toBe(true);
    }
  });

  it('leaves statuses that expire some other way untouched', () => {
    const state = makeState({ players: [makePlayer('a', { statuses: [status('doubleMove', 'afterNextTurn')] })] });
    expect(clearByRoll(state, 'a', 1).players[0].statuses).toHaveLength(1);
  });

  it('is how square 38 applies Confuse Ray', () => {
    expect(getSquare(BOARD_ORIGINAL, 38).effects).toEqual([
      { kind: 'applyStatus', target: 'chosen', status: 'confuseRay', expires: 'rollToClear' },
    ]);
    expect(STATUS_META.confuseRay.clearsOn).toEqual([1, 2, 3]);
  });
});

describe('turnStartEffects', () => {
  it('is empty for a player with no zone statuses', () => {
    expect(turnStartEffects(makePlayer('a'))).toEqual([]);
  });

  it('charges 2 drinks per turn inside Silph Co', () => {
    const p = makePlayer('a', { statuses: [status('inSilphCo', 'leaveSquare', 36)] });
    expect(turnStartEffects(p)).toEqual([
      { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } },
    ]);
  });

  it('rolls the Safari Zone table before the turn', () => {
    const p = makePlayer('a', { statuses: [status('inSafariZone', 'leaveSquare', 48)] });
    const effects = turnStartEffects(p);
    expect(effects).toHaveLength(1);
    expect(effects[0].kind).toBe('rollBranch');
  });
});
