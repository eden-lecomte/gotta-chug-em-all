import { useState } from 'react';
import { DEFAULT_CONFIG, type NewGameInput } from '../../engine/setup';
import type { StarterId } from '../../data/types';
import { useLobbyStore } from './lobbyStore';

interface GameConfigProps {
  onStart: (input: NewGameInput) => void;
}

export default function GameConfig({ onStart }: GameConfigProps) {
  const { drafts, setStep } = useLobbyStore();
  const [fullDrink, setFullDrink] = useState(DEFAULT_CONFIG.fullDrink);
  const [maxMissedTurns, setMaxMissedTurns] = useState(DEFAULT_CONFIG.maxMissedTurns);
  const [offTableChance, setOffTableChance] = useState(DEFAULT_CONFIG.offTableChance);
  const [trainerBattles, setTrainerBattles] = useState(DEFAULT_CONFIG.trainerBattles);

  const start = () => {
    onStart({
      boardId: 'original',
      // A fresh seed per game; recorded in the store so the game is replayable.
      seed: Math.floor(Math.random() * 2 ** 31),
      config: {
        fullDrink: Math.max(1, fullDrink),
        maxMissedTurns: Math.max(0, maxMissedTurns),
        offTableChance: Math.min(100, Math.max(0, offTableChance)),
        trainerBattles,
      },
      players: drafts.map((d) => ({
        name: d.name,
        starter: d.starter as StarterId,
        gender: d.gender,
      })),
    });
  };

  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-pokemon text-2xl text-accent">Game setup</h2>

      <label className="flex flex-col gap-1">
        <span>Drinks in a full vessel</span>
        <small className="text-subtext">How many sips it takes to finish a drink.</small>
        <input
          type="number" min={1} inputMode="numeric"
          className="min-h-12 rounded-lg bg-surface0 px-4"
          value={fullDrink}
          onChange={(e) => setFullDrink(Number(e.target.value))}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span>Cap on missed turns</span>
        <small className="text-subtext">The most turns a single square can cost you.</small>
        <input
          type="number" min={0} inputMode="numeric"
          className="min-h-12 rounded-lg bg-surface0 px-4"
          value={maxMissedTurns}
          onChange={(e) => setMaxMissedTurns(Number(e.target.value))}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span>Chance to roll off the table (%)</span>
        <small className="text-subtext">Roll off, finish your drink.</small>
        <input
          type="number" min={0} max={100} inputMode="numeric"
          className="min-h-12 rounded-lg bg-surface0 px-4"
          value={offTableChance}
          onChange={(e) => setOffTableChance(Number(e.target.value))}
        />
      </label>

      <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-surface0 px-4">
        <span className="flex flex-col">
          <span>Trainer battles</span>
          <small className="text-subtext">Land on an occupied square, both roll, loser drinks the gap.</small>
        </span>
        <input
          type="checkbox" className="size-6"
          checked={trainerBattles}
          onChange={(e) => setTrainerBattles(e.target.checked)}
        />
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={() => setStep('starters')} className="min-h-14 flex-1 rounded-xl bg-surface0 text-subtext">
          Back
        </button>
        <button type="button" onClick={start} className="min-h-14 flex-[2] rounded-xl bg-green font-pokemon text-lg text-crust">
          Ready to play!
        </button>
      </div>
    </section>
  );
}
