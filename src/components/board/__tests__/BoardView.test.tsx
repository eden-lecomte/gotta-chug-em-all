// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BoardView from '../BoardView';
import type { Player } from '../../../engine/types';

const players: Player[] = [
  { id: 'p0', name: 'Eden', starter: 'bulbasaur', gender: 'x', square: 0, drinks: 0,
    missedTurns: 0, extraTurns: 0, statuses: [], finishedAtTurn: null },
  { id: 'p1', name: 'Cheese', starter: 'charmander', gender: 'm', square: 6, drinks: 4,
    missedTurns: 0, extraTurns: 0, statuses: [], finishedAtTurn: null },
];

describe('BoardView', () => {
  it('renders the board image', () => {
    render(<BoardView players={players} activeId="p0" focusSquare={0} />);
    expect(screen.getByAltText(/original board/i)).toBeInTheDocument();
  });

  it('renders one token per player, labelled by name', () => {
    render(<BoardView players={players} activeId="p0" focusSquare={0} />);
    expect(screen.getByLabelText('Eden on square 0')).toBeInTheDocument();
    expect(screen.getByLabelText('Cheese on square 6')).toBeInTheDocument();
  });

  it('marks the active player token', () => {
    render(<BoardView players={players} activeId="p1" focusSquare={6} />);
    expect(screen.getByLabelText('Cheese on square 6')).toHaveAttribute('data-active', 'true');
    expect(screen.getByLabelText('Eden on square 0')).toHaveAttribute('data-active', 'false');
  });

  it('fans out tokens that share a square so neither is hidden', () => {
    const stacked = players.map((p) => ({ ...p, square: 6 }));
    render(<BoardView players={stacked} activeId="p0" focusSquare={6} />);
    const a = screen.getByLabelText('Eden on square 6');
    const b = screen.getByLabelText('Cheese on square 6');
    expect(a.style.left).not.toBe(b.style.left);
  });
});
