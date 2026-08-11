import { getStarter } from '../../data/starters';
import type { Player } from '../../engine/types';

interface PlayerPickerProps {
  players: readonly Player[];
  onPick: (playerId: string) => void;
  /** Drinks assigned so far, keyed by player id, shown as a badge. */
  tally?: Readonly<Record<string, number>>;
  disabled?: boolean;
}

export default function PlayerPicker({ players, onPick, tally, disabled }: PlayerPickerProps) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {players.map((player) => (
        <li key={player.id}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(player.id)}
            className="flex min-h-16 w-full items-center gap-2 rounded-xl bg-surface0 px-3 text-left disabled:opacity-40"
          >
            <img src={getStarter(player.starter).sprite} alt="" className="size-10" />
            <span className="flex-1 truncate">{player.name}</span>
            {tally?.[player.id] ? (
              <span className="font-pokemon text-lg text-yellow">{tally[player.id]}</span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
