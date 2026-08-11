// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import PromptModal from '../PromptModal';
import { useGameStore } from '../../../store/gameStore';
import type { Prompt } from '../../../engine/types';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: false, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'x' },
    { name: 'Ash', starter: 'squirtle', gender: 'x' },
  ],
} as const;

function park(prompt: Prompt) {
  useGameStore.setState({
    state: { ...useGameStore.getState().state!, phase: { name: 'prompt', prompt } },
  });
}

describe('PromptModal', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('renders nothing when no prompt is pending', () => {
    const { container } = render(<PromptModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('gives drinks to a chosen player and confirms', async () => {
    const user = userEvent.setup();
    park({ id: 'givePlayers', drinks: 2, players: 1 });
    render(<PromptModal />);

    await user.click(screen.getByRole('button', { name: /Cheese/ }));
    await user.click(screen.getByRole('button', { name: /make them drink/i }));

    expect(useGameStore.getState().state!.players[1].drinks).toBe(2);
    expect(useGameStore.getState().state!.phase.name).not.toBe('prompt');
  });

  it('does not offer the active player as a target', () => {
    park({ id: 'givePlayers', drinks: 1, players: 1 });
    render(<PromptModal />);
    expect(screen.queryByRole('button', { name: /Eden/ })).not.toBeInTheDocument();
  });

  it('blocks confirming until every drink is assigned', async () => {
    const user = userEvent.setup();
    park({ id: 'givePlayers', drinks: 1, players: 2 });
    render(<PromptModal />);

    const confirm = screen.getByRole('button', { name: /make them drink/i });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Cheese/ }));
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Ash/ }));
    expect(confirm).toBeEnabled();
  });

  it('spreads "all" across everyone else', async () => {
    const user = userEvent.setup();
    park({ id: 'givePlayers', drinks: 1, players: 'all' });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: /Cheese/ }));
    await user.click(screen.getByRole('button', { name: /Ash/ }));
    await user.click(screen.getByRole('button', { name: /make them drink/i }));
    expect(useGameStore.getState().state!.players.map((p) => p.drinks)).toEqual([0, 1, 1]);
  });

  it('moves a chosen player for Haunter', async () => {
    const user = userEvent.setup();
    const state = useGameStore.getState().state!;
    useGameStore.setState({
      state: {
        ...state,
        players: [state.players[0], { ...state.players[1], square: 30 }, state.players[2]],
        phase: { name: 'prompt', prompt: { id: 'choosePlayer', purpose: 'move', squares: -10 } },
      },
    });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: /Cheese/ }));
    expect(useGameStore.getState().state!.players[1].square).toBe(20);
  });

  it('asks the Snorlax yes/no question', async () => {
    const user = userEvent.setup();
    park({ id: 'snorlaxSong' });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: /we sang/i }));
    expect(useGameStore.getState().state!.players[0].drinks).toBe(0);
  });

  it('charges 4 for refusing to sing', async () => {
    const user = userEvent.setup();
    park({ id: 'snorlaxSong' });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: /take the 4/i }));
    expect(useGameStore.getState().state!.players[0].drinks).toBe(4);
  });

  it('offers the evolution choice', async () => {
    const user = userEvent.setup();
    park({ id: 'evolution' });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: /evolve/i }));
    expect(useGameStore.getState().state!.players[0].drinks).toBe(4);
  });

  it('takes a Saffron guess between 1 and 6', async () => {
    const user = userEvent.setup();
    park({ id: 'saffronNumber' });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: '4' }));
    const player = useGameStore.getState().state!.players[0];
    expect(player.drinks === 2 || player.extraTurns === 1).toBe(true);
  });

  it('runs a chugging contest between two players', async () => {
    const user = userEvent.setup();
    park({ id: 'chuggingContest' });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: /Cheese/ }));
    await user.click(screen.getByRole('button', { name: /Cheese won/i }));
    expect(useGameStore.getState().state!.players[1].extraTurns).toBe(1);
    expect(useGameStore.getState().state!.players[0].missedTurns).toBe(1);
  });
});
