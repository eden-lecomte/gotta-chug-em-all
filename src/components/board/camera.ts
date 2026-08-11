/** Base CSS size the board is laid out at, before the camera scales it. */
export const BOARD_PX = 1000;

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export interface CameraOpts {
  readonly viewport: Viewport;
  /** Board-percentage point to centre, or null to centre the whole board. */
  readonly focus: { x: number; y: number } | null;
  /** 1 fits the whole board; higher zooms in on the focus. */
  readonly zoom: number;
  /**
   * Where down the viewport the focus point lands: 0 is the top edge, 0.5 the
   * middle, 1 the bottom. Raising the focus keeps it clear of a card sitting
   * over the lower part of the screen.
   */
  readonly anchorY?: number;
}

/**
 * Compute a `translate(x, y) scale(s)` for a wrapper with transform-origin 0 0.
 * Everything the old Leaflet map did for us, minus the gesture conflicts.
 */
export function cameraTransform({ viewport, focus, zoom, anchorY = 0.5 }: CameraOpts): {
  scale: number;
  x: number;
  y: number;
} {
  if (viewport.width <= 0 || viewport.height <= 0) return { scale: 0, x: 0, y: 0 };

  const fit = Math.min(viewport.width, viewport.height) / BOARD_PX;
  const scale = fit * zoom;

  const targetX = focus ? (focus.x / 100) * BOARD_PX * scale : (BOARD_PX * scale) / 2;
  const targetY = focus ? (focus.y / 100) * BOARD_PX * scale : (BOARD_PX * scale) / 2;

  return {
    scale,
    x: viewport.width / 2 - targetX,
    // The whole board is always centred; only a focus point can be anchored.
    y: (focus ? viewport.height * anchorY : viewport.height / 2) - targetY,
  };
}

export function transformString(t: { scale: number; x: number; y: number }): string {
  return `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
}
