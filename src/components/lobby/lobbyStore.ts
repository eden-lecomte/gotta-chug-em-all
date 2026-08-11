import { create } from 'zustand';
import type { Gender, StarterId } from '../../data/types';

export interface LobbyDraft {
  name: string;
  starter: StarterId | null;
  gender: Gender;
}

export type LobbyStep = 'names' | 'starters' | 'config';

/** Ten starters are available, so eight players still leaves a choice for the last. */
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;

interface LobbyStore {
  step: LobbyStep;
  drafts: LobbyDraft[];
  /** Index of the player currently choosing a starter. */
  pickingIndex: number;
  error: string | null;
  addName: (name: string) => void;
  removeName: (index: number) => void;
  setStarter: (index: number, starter: StarterId) => void;
  setGender: (index: number, gender: Gender) => void;
  setStep: (step: LobbyStep) => void;
  setPickingIndex: (index: number) => void;
  reset: () => void;
}

export const useLobbyStore = create<LobbyStore>((set, get) => ({
  step: 'names',
  drafts: [],
  pickingIndex: 0,
  error: null,

  addName: (raw) => {
    const name = raw.trim();
    if (!name) return;
    const { drafts } = get();
    if (drafts.length >= MAX_PLAYERS) {
      set({ error: `That's the maximum of ${MAX_PLAYERS} players.` });
      return;
    }
    if (drafts.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      set({ error: `${name} is already playing.` });
      return;
    }
    set({ drafts: [...drafts, { name, starter: null, gender: 'x' }], error: null });
  },

  removeName: (index) =>
    set({ drafts: get().drafts.filter((_, i) => i !== index), error: null }),

  setStarter: (index, starter) =>
    set({ drafts: get().drafts.map((d, i) => (i === index ? { ...d, starter } : d)) }),

  setGender: (index, gender) =>
    set({ drafts: get().drafts.map((d, i) => (i === index ? { ...d, gender } : d)) }),

  setStep: (step) => set({ step, error: null }),
  setPickingIndex: (pickingIndex) => set({ pickingIndex }),
  reset: () => set({ step: 'names', drafts: [], pickingIndex: 0, error: null }),
}));
