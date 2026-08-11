// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DiceRoller, { DICE_ANIMATION_MS, DICE_IMAGES } from '../DiceRoller';
import { useGameStore } from '../../../store/gameStore';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: false, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'x' },
  ],
} as const;

const [THROW, CATCH, FLASH] = DICE_IMAGES;

/** The clip currently on screen, by the tail of its source URL. */
function currentClip(): string {
  return screen.getByRole('status').querySelector('img')!.getAttribute('src')!;
}

describe('DiceRoller', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('renders nothing while idle', () => {
    const { container } = render(<DiceRoller />);
    expect(container).toBeEmptyDOMElement();
  });

  it('announces the rolled face during the rolling phase', () => {
    useGameStore.getState().dispatch({ type: 'ROLL' });
    const phase = useGameStore.getState().state!.phase;
    if (phase.name !== 'rolling') throw new Error('Expected rolling phase');
    render(<DiceRoller />);
    expect(screen.getByRole('status')).toHaveTextContent(String(phase.face));
  });

  it('announces rolling off the table when it happens', () => {
    const state = useGameStore.getState().state!;
    useGameStore.setState({ state: { ...state, phase: { name: 'rolling', face: 3, offTable: true } } });
    render(<DiceRoller />);
    expect(screen.getByText(/off the table/i)).toBeInTheDocument();
  });

  describe('the throw sequence', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('plays throw, then catch, then the flash with the number', () => {
      const state = useGameStore.getState().state!;
      useGameStore.setState({ state: { ...state, phase: { name: 'rolling', face: 5, offTable: false } } });
      render(<DiceRoller />);

      expect(currentClip()).toBe(THROW);

      // Halfway is still the throw; the swaps are on absolute offsets from mount.
      act(() => void vi.advanceTimersByTime(1000));
      expect(currentClip()).toBe(THROW);

      act(() => void vi.advanceTimersByTime(DICE_ANIMATION_MS));
      expect(currentClip()).toBe(FLASH);
      expect(screen.getByRole('status')).toHaveTextContent('5');
    });

    it('reaches the catch clip before the flash', () => {
      const state = useGameStore.getState().state!;
      useGameStore.setState({ state: { ...state, phase: { name: 'rolling', face: 2, offTable: false } } });
      render(<DiceRoller />);

      // Long enough for the throw to finish, short of the flash.
      act(() => void vi.advanceTimersByTime(2600));
      expect(currentClip()).toBe(CATCH);
    });
  });
});
