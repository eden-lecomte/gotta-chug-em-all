import { create } from 'zustand';
import { reduce } from '../engine/reducer';
import { createGame, type NewGameInput } from '../engine/setup';
import type { Action, GameState } from '../engine/types';

interface GameStore {
  state: GameState | null;
  /**
   * Every action applied since `start`, in order. Replaying this list against
   * a fresh `createGame(input)` reproduces `state` exactly — the property that
   * makes server-authoritative multiplayer a drop-in later.
   */
  actionLog: Action[];
  input: NewGameInput | null;
  start: (input: NewGameInput) => void;
  dispatch: (action: Action) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  actionLog: [],
  input: null,

  start: (input) => set({ state: createGame(input), actionLog: [], input }),

  dispatch: (action) => {
    const { state } = get();
    if (!state) return;
    set({ state: reduce(state, action), actionLog: [...get().actionLog, action] });
  },

  reset: () => set({ state: null, actionLog: [], input: null }),
}));
