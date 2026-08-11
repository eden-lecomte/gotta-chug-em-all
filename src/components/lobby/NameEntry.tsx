import { useState, type FormEvent } from 'react';
import { MIN_PLAYERS, useLobbyStore } from './lobbyStore';

export default function NameEntry() {
  const { drafts, error, addName, removeName, setStep } = useLobbyStore();
  const [value, setValue] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    addName(value);
    setValue('');
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-pokemon text-2xl text-accent">Who's playing?</h2>

      <form onSubmit={submit} className="flex gap-2">
        <input
          className="min-h-12 flex-1 rounded-lg bg-surface0 px-4 text-base text-text placeholder:text-subtext"
          placeholder="Enter a name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          enterKeyHint="done"
        />
        <button type="submit" className="min-h-12 rounded-lg bg-accent px-4 font-semibold text-crust">
          Add
        </button>
      </form>

      {error && <p role="alert" className="text-sm text-red">{error}</p>}

      <ul className="flex flex-col gap-2">
        {drafts.map((draft, index) => (
          <li key={draft.name} className="flex min-h-12 items-center justify-between rounded-lg bg-surface0 px-4">
            <span>{draft.name}</span>
            <button
              type="button"
              aria-label={`Remove ${draft.name}`}
              onClick={() => removeName(index)}
              className="px-2 text-red"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={drafts.length < MIN_PLAYERS}
        onClick={() => setStep('starters')}
        className="min-h-14 rounded-xl bg-blue font-pokemon text-lg text-crust disabled:opacity-40"
      >
        Pick your Pokémon
      </button>
    </section>
  );
}
