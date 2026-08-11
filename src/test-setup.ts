import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Vitest runs without `globals`, so Testing Library never registers its own
// automatic cleanup and renders pile up across tests in the same file — the
// second `render` in a file would find two of every element. Register it here,
// but only where there is a DOM to clean: this file also loads for the
// node-environment engine tests.
if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);
}
