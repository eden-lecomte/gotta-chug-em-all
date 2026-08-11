import { assetUrl } from './assets';
import type { StarterId } from './types';

export interface Starter {
  readonly id: StarterId;
  readonly label: string;
  readonly dex: number;
  readonly sprite: string;
  readonly animated: string;
  readonly cry: string;
}

const DEX: Record<StarterId, [label: string, dex: number]> = {
  bulbasaur: ['Bulbasaur', 1],
  charmander: ['Charmander', 4],
  squirtle: ['Squirtle', 7],
  caterpie: ['Caterpie', 10],
  weedle: ['Weedle', 13],
  pidgey: ['Pidgey', 16],
  pikachu: ['Pikachu', 25],
  nidorina: ['Nidorina', 29],
  nidoran: ['Nidoran', 32],
  poliwag: ['Poliwag', 60],
};

export const STARTERS: readonly Starter[] = Object.freeze(
  (Object.keys(DEX) as StarterId[]).map((id) => {
    const [label, dex] = DEX[id];
    return Object.freeze({
      id,
      label,
      dex,
      sprite: assetUrl(`/img/sprites/${dex}.png`),
      animated: assetUrl(`/img/sprites/animated/${dex}.gif`),
      cry: assetUrl(`/audio/cries/${dex}.ogg`),
    });
  }),
);

export const STARTER_IDS: readonly StarterId[] = STARTERS.map((s) => s.id);

export function getStarter(id: StarterId): Starter {
  const found = STARTERS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown starter: ${id}`);
  return found;
}
