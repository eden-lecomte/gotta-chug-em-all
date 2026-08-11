import { useEffect, useRef, useState } from 'react';
import { cameraTransform, transformString, type Viewport } from './camera';

/**
 * Measures the viewport element and returns the transform that centres `focus`.
 * Re-measures on resize and orientation change via ResizeObserver.
 */
export function useCamera(focus: { x: number; y: number } | null, zoom: number, anchorY?: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, transform: transformString(cameraTransform({ viewport, focus, zoom, anchorY })) };
}
