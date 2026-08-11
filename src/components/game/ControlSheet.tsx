import { useState } from 'react';
import { activePlayer, scoreboard } from '../../engine/selectors';
import { STATUS_META } from '../../engine/statuses';
import { useGameStore } from '../../store/gameStore';
import Sheet from '../ui/Sheet';

export default function ControlSheet() {
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const [open, setOpen] = useState(false);

  if (!state) return null;
  const active = activePlayer(state);
  const canRoll = state.phase.name === 'idle';

  return (
    <>
      {/* Turn order and totals live in the header's ScorePanel now. */}
      <div className="flex flex-col gap-3 border-t border-surface0 bg-mantle p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {active.statuses.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {active.statuses.map((status) => (
              <li key={status.id} className="rounded-full bg-mauve/20 px-3 py-1 text-xs text-mauve">
                {STATUS_META[status.id].label}
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-14 rounded-xl bg-surface0 px-4 text-sm text-subtext"
          >
            Scores &amp; log
          </button>
          <button
            type="button"
            disabled={!canRoll}
            onClick={() => dispatch({ type: 'ROLL' })}
            className="min-h-14 flex-1 rounded-xl bg-accent font-pokemon text-xl text-crust disabled:opacity-30"
          >
            Roll the dice
          </button>
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Scores & log">
        <ol className="mb-4 flex flex-col gap-2">
          {scoreboard(state).map(({ player, rank }) => (
            <li key={player.id} className="flex items-center justify-between rounded-lg bg-surface0 px-3 py-2">
              <span>
                <span className="mr-2 text-subtext">#{rank}</span>
                {player.name}
              </span>
              <span className="text-sm text-subtext">
                square {player.square} · {player.drinks} drinks
              </span>
            </li>
          ))}
        </ol>

        <div role="log" className="flex flex-col-reverse gap-1 text-sm text-subtext">
          {state.log.map((entry) => (
            <p key={entry.seq}>{entry.text}</p>
          ))}
        </div>
      </Sheet>
    </>
  );
}
