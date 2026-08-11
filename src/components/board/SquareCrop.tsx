import { BOARD_ORIGINAL, getSquare } from '../../data/boards/original';

/**
 * How much of the board width the crop shows, as a percentage. Squares sit
 * roughly 8% apart, so this fills the frame with the landed square and clips
 * its neighbours at the edges. Every square on the board is far enough from the
 * edge that a window this wide never runs off it.
 */
const WINDOW_PERCENT = 13;

const ZOOM = 100 / WINDOW_PERCENT;

interface SquareCropProps {
  squareId: number;
}

/**
 * A zoomed-in cut of the board centred on one square, for showing inside the
 * card that describes it.
 *
 * The board is one image, so this is a scaled `<img>` in a clipping box rather
 * than a separate asset. Pinning the image's top-left to the box centre and
 * then translating it back by the square's own coordinates — as percentages of
 * the image, which is what a percentage `translate` means — puts that square
 * dead centre whatever aspect ratio the box happens to be.
 */
export default function SquareCrop({ squareId }: SquareCropProps) {
  const square = getSquare(BOARD_ORIGINAL, squareId);

  return (
    <div className="relative aspect-[5/3] w-full overflow-hidden rounded-xl bg-crust ring-1 ring-surface1">
      <img
        src={BOARD_ORIGINAL.image}
        alt={`Square ${squareId} on the ${BOARD_ORIGINAL.name} board`}
        draggable={false}
        className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
        style={{
          width: `${ZOOM * 100}%`,
          transform: `translate(${-square.x}%, ${-square.y}%)`,
        }}
      />
    </div>
  );
}
