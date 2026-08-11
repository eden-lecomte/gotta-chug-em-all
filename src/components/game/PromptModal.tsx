import { useState } from 'react';
import { activePlayer } from '../../engine/selectors';
import type { PromptResult } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import Modal from '../ui/Modal';
import PlayerPicker from './PlayerPicker';

const PRIMARY = 'min-h-14 flex-1 rounded-xl bg-accent font-pokemon text-lg text-crust disabled:opacity-30';
const SECONDARY = 'min-h-14 flex-1 rounded-xl bg-surface0 font-pokemon text-lg text-text';

export default function PromptModal() {
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [opponentId, setOpponentId] = useState<string | null>(null);

  if (!state || state.phase.name !== 'prompt') return null;
  const prompt = state.phase.prompt;
  const active = activePlayer(state);
  const others = state.players.filter((p) => p.id !== active.id);

  const resolve = (result: PromptResult) => {
    setTally({});
    setOpponentId(null);
    dispatch({ type: 'RESOLVE_PROMPT', result });
  };

  switch (prompt.id) {
    case 'givePlayers': {
      const seats = prompt.players === 'all' ? others.length : prompt.players;
      const budget = prompt.drinks * seats;
      const assigned = Object.values(tally).reduce((sum, v) => sum + v, 0);
      const remaining = budget - assigned;

      return (
        <Modal
          title={`Hand out ${budget} drink${budget === 1 ? '' : 's'}`}
          actions={
            <button
              type="button"
              disabled={remaining > 0}
              onClick={() =>
                resolve({
                  id: 'givePlayers',
                  assignments: Object.entries(tally).map(([playerId, drinks]) => ({ playerId, drinks })),
                })
              }
              className={PRIMARY}
            >
              Make them drink
            </button>
          }
        >
          <p className="text-subtext">
            {remaining > 0 ? `${remaining} left to hand out.` : 'All assigned.'}
          </p>
          <PlayerPicker
            players={others}
            tally={tally}
            disabled={remaining <= 0}
            // One tap hands a player the prompt's full per-player amount, so
            // "2 drinks to 1 player" is one tap rather than two on the same face.
            onPick={(id) => setTally((t) => ({ ...t, [id]: (t[id] ?? 0) + prompt.drinks }))}
          />
        </Modal>
      );
    }

    case 'choosePlayer': {
      const title =
        prompt.purpose === 'move'
          ? `Move someone ${Math.abs(prompt.squares)} squares ${prompt.squares < 0 ? 'back' : 'forward'}`
          : 'Choose a target';
      return (
        <Modal title={title} actions={null}>
          <PlayerPicker
            players={others}
            onPick={(playerId) => resolve({ id: 'choosePlayer', playerId })}
          />
        </Modal>
      );
    }

    case 'snorlaxSong':
      return (
        <Modal
          title="A sleeping Snorlax blocks your path"
          actions={
            <>
              <button type="button" className={SECONDARY} onClick={() => resolve({ id: 'snorlaxSong', sang: false })}>
                Take the 4
              </button>
              <button type="button" className={PRIMARY} onClick={() => resolve({ id: 'snorlaxSong', sang: true })}>
                We sang!
              </button>
            </>
          }
        >
          <p>Belt out a song of the group's choice to wake him, or take 4 drinks.</p>
        </Modal>
      );

    case 'koffingSmoke':
      return (
        <Modal
          title="Koffing used Haze!"
          actions={
            <>
              <button type="button" className={SECONDARY} onClick={() => resolve({ id: 'koffingSmoke', smoked: false })}>
                Take the 2
              </button>
              <button type="button" className={PRIMARY} onClick={() => resolve({ id: 'koffingSmoke', smoked: true })}>
                Smoked it
              </button>
            </>
          }
        >
          <p>Smoke whatever is nearby to avoid 2 drinks.</p>
        </Modal>
      );

    case 'evolution':
      return (
        <Modal
          title="What? Your Pokémon is evolving!"
          actions={
            <>
              <button type="button" className={SECONDARY} onClick={() => resolve({ id: 'evolution', evolve: false })}>
                Stop it
              </button>
              <button type="button" className={PRIMARY} onClick={() => resolve({ id: 'evolution', evolve: true })}>
                Evolve
              </button>
            </>
          }
        >
          <p>Evolve: drink 4 and walk past the next gym. Stop it: take an extra turn.</p>
        </Modal>
      );

    case 'saffronNumber':
      return (
        <Modal title="Saffron Gym — pick a number" actions={null}>
          <p className="text-subtext">Match the roll for an extra turn. Miss and drink 2.</p>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((guess) => (
              <button
                key={guess}
                type="button"
                onClick={() => resolve({ id: 'saffronNumber', guess })}
                className="min-h-16 rounded-xl bg-surface0 font-pokemon text-2xl"
              >
                {guess}
              </button>
            ))}
          </div>
        </Modal>
      );

    case 'pokeballCatch':
      return (
        <Modal
          title="You throw a Pokéball!"
          actions={
            <>
              <button type="button" className={SECONDARY} onClick={() => resolve({ id: 'pokeballCatch', onBoard: false })}>
                Not on the board
              </button>
              <button type="button" className={PRIMARY} onClick={() => resolve({ id: 'pokeballCatch', onBoard: true })}>
                Throw for it
              </button>
            </>
          }
        >
          <p>
            If your favourite Pokémon is on the board, throw: a 1-3 catches it, a 4-6 and it got
            away for 3 drinks. If it is not on the board, sadly drink 3.
          </p>
        </Modal>
      );

    case 'chuggingContest': {
      if (!opponentId) {
        return (
          <Modal title="Pick your chugging opponent" actions={null}>
            <PlayerPicker players={others} onPick={setOpponentId} />
          </Modal>
        );
      }
      const opponent = state.players.find((p) => p.id === opponentId)!;
      return (
        <Modal
          title="Who finished first?"
          actions={
            <>
              <button
                type="button"
                className={SECONDARY}
                onClick={() => resolve({ id: 'chuggingContest', opponentId, winnerId: active.id })}
              >
                {active.name} won
              </button>
              <button
                type="button"
                className={PRIMARY}
                onClick={() => resolve({ id: 'chuggingContest', opponentId, winnerId: opponentId })}
              >
                {opponent.name} won
              </button>
            </>
          }
        >
          <p>Winner takes an extra turn. Loser misses one.</p>
        </Modal>
      );
    }
  }
}
