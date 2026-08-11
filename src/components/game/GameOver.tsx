import { getStarter } from '../../data/starters';
import { scoreboard } from '../../engine/selectors';
import { useGameStore } from '../../store/gameStore';
import { useLobbyStore } from '../lobby/lobbyStore';

export default function GameOver() {
  const state = useGameStore((s) => s.state);
  const resetGame = useGameStore((s) => s.reset);
  const resetLobby = useLobbyStore((s) => s.reset);

  if (!state || state.phase.name !== 'gameOver') return null;

  const standings = scoreboard(state);
  const winner = standings[0].player;
  const heaviest = [...state.players].sort((a, b) => b.drinks - a.drinks)[0];

  const playAgain = () => {
    resetGame();
    resetLobby();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col gap-5 overflow-y-auto bg-crust p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <h1 className="font-pokemon text-3xl text-yellow">{winner.name} wins!</h1>
      <p className="text-subtext">
        {heaviest.name} drank the most, at {heaviest.drinks}. Hydrate.
      </p>

      <ol className="flex flex-col gap-2">
        {standings.map(({ player, rank }) => (
          <li key={player.id} className="flex items-center gap-3 rounded-xl bg-surface0 p-3">
            <span className="w-6 font-pokemon text-lg text-subtext">{rank}</span>
            <img src={getStarter(player.starter).sprite} alt="" className="size-10" />
            <span className="flex-1">{player.name}</span>
            <span className="text-sm text-subtext">square {player.square}</span>
            <span className="font-pokemon text-xl text-yellow">{player.drinks}</span>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={playAgain}
        className="mt-auto min-h-14 rounded-xl bg-green font-pokemon text-xl text-crust"
      >
        Play again
      </button>
    </div>
  );
}
