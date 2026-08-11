import { create } from 'zustand';

export type SfxName = 'roll' | 'move' | 'drink' | 'win';

/**
 * The Pokérap is the only audio asset carried over from the legacy build, so
 * every cue points at it for now. Drop distinct files into `public/audio/` and
 * change only this map — nothing else needs to know.
 */
const SFX_SRC: Record<SfxName, string> = {
  roll: '/audio/pokerap.mp3',
  move: '/audio/pokerap.mp3',
  drink: '/audio/pokerap.mp3',
  win: '/audio/pokerap.mp3',
};

const STORAGE_KEY = 'gcea:muted';

interface AudioStore {
  muted: boolean;
  toggleMute: () => void;
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  // Muted by default: browsers block autoplay and nobody wants a surprise
  // Pokérap on mobile data.
  muted: readMuted(),
  toggleMute: () => {
    const muted = !get().muted;
    try {
      localStorage.setItem(STORAGE_KEY, String(muted));
    } catch {
      // Private browsing; the preference just will not persist.
    }
    set({ muted });
  },
}));

const cache = new Map<SfxName, HTMLAudioElement>();

export function playSfx(name: SfxName): void {
  if (useAudioStore.getState().muted) return;
  let element = cache.get(name);
  if (!element) {
    element = new Audio(SFX_SRC[name]);
    cache.set(name, element);
  }
  element.currentTime = 0;
  // Autoplay policy can still reject; a missing sound must never break a turn.
  void element.play().catch(() => {});
}
