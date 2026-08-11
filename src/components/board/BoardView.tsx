import { BOARD_ORIGINAL, getSquare } from '../../data/boards/original';
import type { Player } from '../../engine/types';
import { BOARD_PX } from './camera';
import Token from './Token';
import { useCamera } from './useCamera';

interface BoardViewProps {
  players: readonly Player[];
  activeId: string;
  focusSquare: number;
  /** 1 shows the whole board; the game screen zooms in on the active token. */
  zoom?: number;
  onTokenArrive?: () => void;
}

/** Spread tokens sharing a square around a small circle so none is hidden. */
function fanOffset(index: number, total: number): { dx: number; dy: number } {
  if (total <= 1) return { dx: 0, dy: 0 };
  const angle = (index / total) * Math.PI * 2;
  const radius = 2.2;
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
}

export default function BoardView({
  players, activeId, focusSquare, zoom = 2.2, onTokenArrive,
}: BoardViewProps) {
  const focus = getSquare(BOARD_ORIGINAL, focusSquare);
  const { ref, transform } = useCamera({ x: focus.x, y: focus.y }, zoom);

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden bg-crust">
      <div
        className="absolute left-0 top-0 origin-top-left transition-transform duration-500 ease-out"
        style={{ width: BOARD_PX, height: BOARD_PX, transform }}
      >
        <img
          src={BOARD_ORIGINAL.image}
          alt="Original board"
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          draggable={false}
        />
        {players.map((player) => {
          const square = getSquare(BOARD_ORIGINAL, player.square);
          const sharing = players.filter((p) => p.square === player.square);
          const { dx, dy } = fanOffset(sharing.indexOf(player), sharing.length);
          return (
            <Token
              key={player.id}
              player={player}
              x={square.x + dx}
              y={square.y + dy}
              active={player.id === activeId}
              onArrive={player.id === activeId ? onTokenArrive : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
