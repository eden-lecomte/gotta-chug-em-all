import { STARTERS } from '../../data/starters';
import type { Gender, StarterId } from '../../data/types';
import { useLobbyStore } from './lobbyStore';

const GENDERS: ReadonlyArray<{ value: Gender; label: string }> = [
  { value: 'm', label: 'Guy' },
  { value: 'f', label: 'Girl' },
  { value: 'x', label: 'Rather not say' },
];

export default function StarterPicker() {
  const { drafts, pickingIndex, setStarter, setGender, setPickingIndex, setStep } = useLobbyStore();
  const current = drafts[pickingIndex];
  if (!current) return null;

  const taken = new Set(
    drafts.filter((_, i) => i !== pickingIndex).map((d) => d.starter).filter(Boolean) as StarterId[],
  );

  const choose = (starter: StarterId) => {
    setStarter(pickingIndex, starter);
    if (pickingIndex + 1 < drafts.length) setPickingIndex(pickingIndex + 1);
    else setStep('config');
  };

  const back = () => {
    if (pickingIndex > 0) setPickingIndex(pickingIndex - 1);
    else setStep('names');
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-pokemon text-2xl text-accent">{current.name}, pick your favourite Pokémon!</h2>

      <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {STARTERS.map((starter) => (
          <li key={starter.id}>
            <button
              type="button"
              disabled={taken.has(starter.id)}
              onClick={() => choose(starter.id)}
              className="aspect-square w-full rounded-xl bg-surface0 bg-contain bg-center bg-no-repeat ring-2 ring-transparent enabled:active:ring-accent disabled:opacity-25"
              style={{ backgroundImage: `url(${starter.sprite})` }}
            >
              <span className="sr-only">{starter.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-subtext">
          Optional — only used by one square that splits the table by gender.
        </legend>
        <div className="flex gap-2">
          {GENDERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGender(pickingIndex, option.value)}
              data-selected={String(current.gender === option.value)}
              className="min-h-12 flex-1 rounded-lg bg-surface0 px-3 text-sm data-[selected=true]:bg-blue data-[selected=true]:text-crust"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button type="button" onClick={back} className="min-h-12 rounded-lg bg-surface0 text-subtext">
        Back
      </button>
    </section>
  );
}
