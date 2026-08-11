import { describe, it, expect } from 'vitest';
import { BOARD_PX, cameraTransform } from '../camera';

describe('cameraTransform', () => {
  const viewport = { width: 400, height: 800 };

  it('fits the whole board inside the shorter viewport axis at zoom 1', () => {
    const { scale } = cameraTransform({ viewport, focus: null, zoom: 1 });
    expect(scale).toBeCloseTo(400 / BOARD_PX, 5);
  });

  it('centres the board when nothing is focused', () => {
    const { x, y } = cameraTransform({ viewport, focus: null, zoom: 1 });
    const scale = 400 / BOARD_PX;
    expect(x).toBeCloseTo(viewport.width / 2 - (BOARD_PX * scale) / 2, 5);
    expect(y).toBeCloseTo(viewport.height / 2 - (BOARD_PX * scale) / 2, 5);
  });

  it('centres the focused point in the viewport', () => {
    const focus = { x: 25, y: 75 };
    const { scale, x, y } = cameraTransform({ viewport, focus, zoom: 2 });
    expect(x + (focus.x / 100) * BOARD_PX * scale).toBeCloseTo(viewport.width / 2, 5);
    expect(y + (focus.y / 100) * BOARD_PX * scale).toBeCloseTo(viewport.height / 2, 5);
  });

  it('anchors the focused point higher in the viewport when asked', () => {
    const focus = { x: 25, y: 75 };
    const { scale, y } = cameraTransform({ viewport, focus, zoom: 2, anchorY: 0.25 });
    expect(y + (focus.y / 100) * BOARD_PX * scale).toBeCloseTo(viewport.height * 0.25, 5);
  });

  it('ignores the anchor when the whole board is shown', () => {
    const anchored = cameraTransform({ viewport, focus: null, zoom: 1, anchorY: 0.1 });
    const centred = cameraTransform({ viewport, focus: null, zoom: 1 });
    expect(anchored.y).toBeCloseTo(centred.y, 5);
  });

  it('multiplies the fit scale by the zoom factor', () => {
    const base = cameraTransform({ viewport, focus: null, zoom: 1 }).scale;
    expect(cameraTransform({ viewport, focus: { x: 50, y: 50 }, zoom: 2.5 }).scale).toBeCloseTo(base * 2.5, 5);
  });

  it('returns a zero scale for a viewport that has not been measured yet', () => {
    expect(cameraTransform({ viewport: { width: 0, height: 0 }, focus: null, zoom: 1 }).scale).toBe(0);
  });
});
