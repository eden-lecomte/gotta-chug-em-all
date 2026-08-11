import { create } from 'zustand';
import { assetUrl } from '../data/assets';

/** Long-form music, as opposed to a one-shot cry. */
export type Cue = 'intro' | 'win';

const CUE_SRC: Record<Cue, string> = {
  intro: assetUrl('/audio/pokerap.mp3'),
  win: assetUrl('/audio/pokerap.mp3'),
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

/**
 * Every element this module has created, by source.
 *
 * Kept so muting can reach sound that is already playing. Setting `muted` rather
 * than pausing means the Pokérap keeps its position: unmuting drops you back
 * into wherever the track has got to instead of restarting it.
 */
const elements = new Map<string, HTMLAudioElement>();

function applyMuted(muted: boolean): void {
  for (const element of elements.values()) element.muted = muted;
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
    applyMuted(muted);
    set({ muted });
  },
}));

function element(src: string): HTMLAudioElement {
  let found = elements.get(src);
  if (!found) {
    found = new Audio(src);
    elements.set(src, found);
  }
  found.muted = useAudioStore.getState().muted;
  return found;
}

function play(src: string): void {
  const audio = element(src);
  audio.currentTime = 0;
  // Autoplay policy can still reject, and not every implementation returns a
  // promise at all. A missing sound must never break a turn.
  void Promise.resolve(audio.play()).catch(() => {});
}

/**
 * Start a piece of music. Played even while muted, silently, so that unmuting
 * mid-track brings it in rather than leaving the player with nothing until the
 * next cue.
 */
export function playCue(cue: Cue): void {
  play(CUE_SRC[cue]);
}

/** Sound off the Pokémon whose trainer is up, by national dex number. */
export function playCry(dex: number): void {
  play(assetUrl(`/audio/cries/${dex}.ogg`));
}
