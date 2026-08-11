// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ScorePanel from '../ScorePanel';
import { makePlayer } from '../../../engine/__tests__/factories';

const players = [
  makePlayer('p0', { name: 'Eden' }),
  makePlayer('p1', { name: 'Cheese', drinks: 3 }),
];

describe('ScorePanel', () => {
  it('shows every player drink total', () => {
    render(<ScorePanel players={players} activeId="p0" />);
    expect(screen.getByLabelText('Eden has 0 drinks')).toBeInTheDocument();
    expect(screen.getByLabelText('Cheese has 3 drinks')).toBeInTheDocument();
  });

  it('lists players in turn order', () => {
    render(<ScorePanel players={players} activeId="p0" />);
    const rows = screen.getAllByRole('listitem').map((row) => row.getAttribute('aria-label'));
    expect(rows).toEqual(['Eden has 0 drinks', 'Cheese has 3 drinks']);
  });

  it('marks whose turn it is', () => {
    render(<ScorePanel players={players} activeId="p1" />);
    expect(screen.getByLabelText('Cheese has 3 drinks')).toHaveAttribute('data-active', 'true');
    expect(screen.getByLabelText('Eden has 0 drinks')).toHaveAttribute('data-active', 'false');
  });

  it('flies a beer in for each drink just added', () => {
    const { rerender } = render(<ScorePanel players={players} activeId="p0" />);
    expect(screen.queryByText('🍺')).not.toBeInTheDocument();

    rerender(
      <ScorePanel
        players={[players[0], makePlayer('p1', { name: 'Cheese', drinks: 5 })]}
        activeId="p0"
      />,
    );
    // Two more drinks, so two beers travel into Cheese's row.
    expect(screen.getAllByText('🍺')).toHaveLength(2);
  });

  it('does not fly beers when a total is unchanged', () => {
    const { rerender } = render(<ScorePanel players={players} activeId="p0" />);
    rerender(<ScorePanel players={players} activeId="p1" />);
    expect(screen.queryByText('🍺')).not.toBeInTheDocument();
  });
});
