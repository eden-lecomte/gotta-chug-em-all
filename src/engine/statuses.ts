import type { Effect, StatusId } from '../data/types';
import { pushLog, updatePlayer } from './targets';
import { zoneAt } from './zones';
import type { GameState, Player, PlayerId, Status } from './types';

/**
 * `clearsOn` lists the die faces that shake a `rollToClear` status off. It is
 * only meaningful for statuses the board applies with that expiry.
 */
export const STATUS_META: Record<StatusId, {
  label: string;
  blurb: string;
  clearsOn?: readonly number[];
}> = {
  zubats: { label: 'Confused by Zubats', blurb: 'Roll 3 or more to escape this square.' },
  confuseRay: {
    label: 'Confused',
    blurb: 'Roll 1-3 to snap out of it, or lose the turn.',
    clearsOn: [1, 2, 3],
  },
  stringShot: { label: 'String Shot', blurb: 'Your next move is halved, rounded up.' },
  doubleMove: { label: 'On the bicycle', blurb: 'Your next move is doubled.' },
  reflect: { label: 'Tri Attack', blurb: 'Drinks given to you rebound on the giver at 3x.' },
  possessed: { label: 'Possessed', blurb: 'Anyone may make you fetch them a drink.' },
  skipNextGym: { label: 'Evolved', blurb: 'Walk straight past the next gold gym.' },
  inSilphCo: { label: 'Inside Silph Co.', blurb: 'Drink 2 at the start of every turn.' },
  inSafariZone: { label: 'In the Safari Zone', blurb: 'Roll the Safari table before each turn.' },
  inTower: { label: 'In the Pokémon Tower', blurb: 'No speaking. Each slip costs a drink.' },
  copying: { label: 'Transformed', blurb: 'Copy everything the next player does.' },
  nonDominantHand: { label: 'Sand-Attack', blurb: 'Drink with your non-dominant hand.' },
  ruleMaker: { label: 'Rule maker', blurb: 'You set a house rule. Violations cost a drink.' },
};

export function hasStatus(player: Player, id: StatusId): boolean {
  return player.statuses.some((s) => s.id === id);
}

/** Apply movement modifiers. Bicycle doubles first, then String Shot halves. */
export function movementFor(player: Player, roll: number): number {
  let steps = roll;
  if (hasStatus(player, 'doubleMove')) steps *= 2;
  if (hasStatus(player, 'stringShot')) steps = Math.ceil(steps / 2);
  return Math.max(1, steps);
}

export function clearStatus(state: GameState, playerId: PlayerId, id: StatusId): GameState {
  return updatePlayer(state, playerId, (p) => ({
    ...p,
    statuses: p.statuses.filter((s) => s.id !== id),
  }));
}

/**
 * Drop statuses the holder has now walked out of.
 *
 * `leaveSquare` lasts exactly as long as the square that applied it.
 * `leaveZone` lasts for the whole silver section — the Pokémon Tower rule holds
 * from the moment you enter until you are out the other side, so stepping from
 * one tower square to the next must not clear it.
 */
function clearOnLeaveSquare(state: GameState, playerId: PlayerId, newSquare: number): GameState {
  const zone = zoneAt(newSquare);
  return updatePlayer(state, playerId, (p) => ({
    ...p,
    statuses: p.statuses.filter((s) => {
      if (s.expires === 'leaveSquare') return s.appliedOnSquare === newSquare;
      if (s.expires === 'leaveZone') return zone !== null && zone.status === s.id;
      return true;
    }),
  }));
}

/**
 * Put a player under a silver section's rule the moment they cross into it.
 *
 * Movement only stops on gold gyms, so a roll carrying someone from square 35 to
 * 38 walks straight past Silph Co's entrance. Binding the rule to the section
 * rather than to its first square is what makes a zone somewhere you are, not a
 * square you happened to land on. `enteredZone` is left for the reducer to turn
 * into the card that states the rule.
 */
function enterZone(state: GameState, playerId: PlayerId, from: number, to: number): GameState {
  const zone = zoneAt(to);
  if (!zone || zoneAt(from)?.status === zone.status) return state;

  const withStatus = updatePlayer(state, playerId, (p) =>
    hasStatus(p, zone.status)
      ? p
      : { ...p, statuses: [...p.statuses, { id: zone.status, expires: 'leaveZone', appliedOnSquare: to }] },
  );
  const named = state.players.find((p) => p.id === playerId)?.name ?? playerId;
  return {
    ...pushLog(withStatus, 'info', `${named} entered the ${zone.name}`),
    enteredZone: zone.status,
  };
}

/**
 * The single place a token's square changes. Everything that moves a player —
 * stepping, `moveTo`, `moveBy`, being dragged by someone else — goes through
 * here, so leaving a square and crossing into a section can never be skipped by
 * one path and honoured by another.
 */
export function changeSquare(state: GameState, playerId: PlayerId, to: number): GameState {
  const from = state.players.find((p) => p.id === playerId)?.square ?? to;
  const moved = updatePlayer(state, playerId, (p) => ({ ...p, square: to }));
  return enterZone(clearOnLeaveSquare(moved, playerId, to), playerId, from, to);
}

export function expireAfterTurn(state: GameState, playerId: PlayerId): GameState {
  return updatePlayer(state, playerId, (p) => ({
    ...p,
    statuses: p.statuses.filter((s) => s.expires !== 'afterNextTurn' && s.expires !== 'nextTurnStart'),
  }));
}

/**
 * Statuses that no clock removes — the holder has to roll them off. The turn
 * machine rolls once for these before the turn proper, and a holder still
 * carrying one afterwards loses the turn.
 */
export function rollToClearStatuses(player: Player): readonly Status[] {
  return player.statuses.filter((s) => s.expires === 'rollToClear');
}

/** Remove every `rollToClear` status whose `clearsOn` contains this face. */
export function clearByRoll(state: GameState, playerId: PlayerId, roll: number): GameState {
  return updatePlayer(state, playerId, (p) => ({
    ...p,
    statuses: p.statuses.filter(
      (s) => s.expires !== 'rollToClear' || !(STATUS_META[s.id].clearsOn ?? []).includes(roll),
    ),
  }));
}

/** Upkeep charged before a player rolls, driven by which zone they are standing in. */
export function turnStartEffects(player: Player): Effect[] {
  const effects: Effect[] = [];

  if (hasStatus(player, 'inSilphCo')) {
    effects.push({ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } });
  }

  if (hasStatus(player, 'inSafariZone')) {
    effects.push({
      kind: 'rollBranch',
      branches: [
        {
          when: { faces: [1, 2] },
          effects: [{ kind: 'give', amount: { kind: 'fixed', value: 1 }, players: { kind: 'fixed', value: 1 } }],
        },
        {
          when: { faces: [3, 4] },
          effects: [
            { kind: 'missTurn', amount: { kind: 'fixed', value: 1 } },
            { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 4 } },
          ],
        },
        {
          when: { faces: [5, 6] },
          effects: [{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } }],
        },
      ],
    });
  }

  return effects;
}
