import { BOARD_ORIGINAL } from '../data/boards/original';
import type { StatusId } from '../data/types';

/**
 * A themed stretch of the board — the Pokémon Tower, Silph Co., the Safari Zone.
 * Its rule applies for as long as you are anywhere inside it, not just on the
 * square you walked in on.
 */
export interface Zone {
  readonly status: StatusId;
  readonly name: string;
  readonly rule: string;
  /** Inclusive square range, taken from the board's own `silverZone` run. */
  readonly from: number;
  readonly to: number;
}

/**
 * The status each section applies, in board order. Ranges are not written here:
 * they are read off the contiguous runs of `silverZone` squares below, so moving
 * a section on the board cannot leave this table pointing at the wrong squares.
 */
const SECTIONS: ReadonlyArray<Pick<Zone, 'status' | 'name' | 'rule'>> = [
  {
    status: 'inTower',
    name: 'Pokémon Tower',
    rule: 'Out of respect for the dead, no talking anywhere in the tower. Every slip costs a drink.',
  },
  {
    status: 'inSilphCo',
    name: 'Silph Co.',
    rule: 'Team Rocket holds the building. Drink 2 at the start of each of your turns until you are out.',
  },
  {
    status: 'inSafariZone',
    name: 'Safari Zone',
    rule: 'Roll the Safari table at the start of each of your turns until you leave.',
  },
];

/** Contiguous runs of `silverZone` squares, in board order. */
function silverRuns(): Array<{ from: number; to: number }> {
  const runs: Array<{ from: number; to: number }> = [];
  for (const square of BOARD_ORIGINAL.squares) {
    if (square.kind !== 'silverZone') continue;
    const last = runs.at(-1);
    if (last && square.id === last.to + 1) last.to = square.id;
    else runs.push({ from: square.id, to: square.id });
  }
  return runs;
}

export const ZONES: readonly Zone[] = Object.freeze(
  silverRuns().map((run, index) => {
    const section = SECTIONS[index];
    if (!section) {
      throw new Error(
        `The board has ${silverRuns().length} silver sections but only ${SECTIONS.length} are described`,
      );
    }
    return Object.freeze({ ...section, ...run });
  }),
);

/** The section covering a square, or null for the open board. */
export function zoneAt(square: number): Zone | null {
  return ZONES.find((zone) => square >= zone.from && square <= zone.to) ?? null;
}

export function zoneOfStatus(status: StatusId): Zone | null {
  return ZONES.find((zone) => zone.status === status) ?? null;
}
