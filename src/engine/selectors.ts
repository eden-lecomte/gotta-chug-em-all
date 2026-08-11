import { BOARD_ORIGINAL, getSquare } from '../data/boards/original';
import type { Square } from '../data/types';
import { activePlayer } from './targets';
import type { GameState, Player, PlayerId } from './types';

export { activePlayer };

export function currentSquare(state: GameState): Square {
  return getSquare(BOARD_ORIGINAL, activePlayer(state).square);
}

export function squareOf(player: Player): Square {
  return getSquare(BOARD_ORIGINAL, player.square);
}

export function isMyTurn(state: GameState, id: PlayerId): boolean {
  return activePlayer(state).id === id;
}

/** Standings: furthest along the board first, fewest drinks breaking ties. */
export function scoreboard(state: GameState): Array<{ player: Player; rank: number }> {
  const sorted = [...state.players].sort(
    (a, b) => b.square - a.square || a.drinks - b.drinks || a.name.localeCompare(b.name),
  );
  return sorted.map((player, index) => ({ player, rank: index + 1 }));
}

/** Players stacked on the same square, so tokens can be fanned out. */
export function playersOnSquare(state: GameState, squareId: number): Player[] {
  return state.players.filter((p) => p.square === squareId);
}
