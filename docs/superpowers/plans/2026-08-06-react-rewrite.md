# Gotta Chug 'em All — React Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the jQuery/Leaflet Pokémon drinking board game as a mobile-friendly React app with a headless, deterministic rules engine, delivering a complete hotseat-playable v1 of board 1.

**Architecture:** A pure `reduce(state, action) -> state` engine with a seeded RNG holds all game logic and is unit-tested headlessly with zero React imports. Board squares become declarative `Effect[]` data instead of side-effecting closures, resolved through an effect queue that parks in state when it needs player input. The React layer is a thin renderer that dispatches serializable actions and reports animation completion back to the engine — no `setTimeout` chains.

**Tech Stack:** Vite 6, React 19, TypeScript 5.7, Zustand 5, Tailwind CSS 4, Motion (framer-motion) 11, Vitest 3.

## Global Constraints

- **Target is web, not React Native.** Hotseat play happens in one mobile browser; room-based multiplayer later uses room codes in the same web app. Do not introduce Expo or React Native.
- **The engine directory (`src/engine/`) must never import React, Zustand, or any DOM API.** It is pure TypeScript. Any test in `src/engine/__tests__/` must pass under Node with no jsdom.
- **All randomness flows through the seeded RNG in `GameState.seed`.** Never call `Math.random()` outside `src/engine/rng.ts`. This is what makes future multiplayer replayable.
- **All actions must be JSON-serializable.** No functions, class instances, `Date` objects, or `undefined`-valued keys in any `Action` payload.
- **Never mutate board data.** `BOARD_ORIGINAL` and every `Square` in it are `readonly`/frozen. The old code's worst bug was `square.gym()` writing results back into square objects.
- **Mobile first.** Every screen must be usable at 375×667 CSS px. Use `dvh` not `vh`. Respect `env(safe-area-inset-*)`.
- **Board coordinates are percentages** of board width/height (`x`, `y` in `0..100`), never pixels and never Leaflet lat/lng.
- **Styling:** Catppuccin Mocha palette with a Sky/Blue accent, defined once as Tailwind theme tokens.
- **Commit after every task.** Conventional commit prefixes (`feat:`, `fix:`, `chore:`, `test:`).

## File Structure

```
scripts/
  extract-legacy-squares.mjs   Reads legacy js/squares-original.js, emits JSON of coords+text
src/
  main.tsx                     React root
  App.tsx                      Phase router: lobby | game | gameOver
  index.css                    Tailwind entry + @font-face + Catppuccin tokens
  engine/
    types.ts                   Player, GameState, Action, Phase, Prompt, Status  (no logic)
    rng.ts                     Seeded mulberry32: rollDie, nextInt
    amount.ts                  resolveAmount() — the Amount expression evaluator
    targets.ts                 resolveTarget() — Target -> PlayerId[]
    effects.ts                 applyEffect() — one effect, returns state + queue changes
    statuses.ts                STATUS_META registry, expiry, turn-start hooks
    turn.ts                    Turn machine: phase transitions, movement, win check
    reducer.ts                 reduce(state, action) — the single entry point
    selectors.ts               Derived read helpers for UI
    setup.ts                   createGame() from lobby input
    __tests__/                 Vitest specs, one per module + integration.test.ts
  data/
    types.ts                   Board, Square, Effect, Amount, Target, StarterId
    starters.ts                The 10 selectable starters + sprite paths
    boards/original.ts         All 63 squares of board 1 as frozen data
  store/
    gameStore.ts               Zustand wrapper: state + dispatch + action log
  components/
    board/BoardView.tsx        Viewport, scale wrapper, camera
    board/Token.tsx            One player token, animated
    board/useCamera.ts         Fit-to-screen + follow-active-token math
    lobby/Lobby.tsx            Lobby step router
    lobby/NameEntry.tsx        Step 1
    lobby/StarterPicker.tsx    Step 2
    lobby/GameConfig.tsx       Step 3
    game/GameScreen.tsx        Board + control sheet + modal host
    game/ControlSheet.tsx      Bottom sheet: roll button, scoreboard, log
    game/DiceRoller.tsx        CSS die, no GIFs
    game/SquareModal.tsx       Landed-on-square card
    game/PromptModal.tsx       Prompt host, delegates by prompt kind
    game/PlayerPicker.tsx      Shared "choose N players" control
    game/GameOver.tsx          Final standings
    ui/Sheet.tsx               Reusable bottom sheet primitive
  audio/useAudio.ts            Howler-free tiny audio hook
```

---

## Task 1: Project scaffold and asset diet

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`
- Create: `public/fonts/PokemonSolid.ttf`, `public/fonts/PokemonHollow.ttf` (copied from legacy `fonts/`)
- Delete: `pokemon-sugimori.tar.gz`, `img/main-sprites/`, `js/ddslick.js`, `js/spiderfier.min.js`, `js/watch.js`, `css/maps/`, `js/maps/`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a working `npm run dev`, `npm run build`, `npm test`; legacy files remain at `js/` and `img/sprites/` for later tasks to read

The legacy site stays in the repo root for reference during migration. It is deleted in Task 26.

- [ ] **Step 1: Tag the legacy build so the old rule text stays reachable**

```bash
git tag v0-jquery
```

- [ ] **Step 2: Shed 56MB of unused assets**

`pokemon-sugimori.tar.gz` (13MB) is referenced nowhere. `img/main-sprites/` (43MB) is a duplicate of `img/sprites/`. The listed JS files are dead: `ddslick.js` is loaded but never called, `spiderfier`/`watch` are replaced by React.

```bash
git rm -r --cached pokemon-sugimori.tar.gz img/main-sprites js/maps css/maps js/ddslick.js js/spiderfier.min.js js/watch.js
rm -rf pokemon-sugimori.tar.gz img/main-sprites js/maps css/maps js/ddslick.js js/spiderfier.min.js js/watch.js
```

- [ ] **Step 3: Scaffold Vite**

```bash
npm create vite@latest . -- --template react-ts
npm install
npm install zustand motion
npm install -D tailwindcss @tailwindcss/vite vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom
```

When `npm create vite` warns the directory is not empty, choose "Ignore files and continue".

- [ ] **Step 4: Configure Vite with Tailwind and Vitest**

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Default to 'node' so engine and data tests stay DOM-free and fast.
    // Vitest 4 removed `environmentMatchGlobs`, so a test that needs a DOM
    // opts in per file with a `// @vitest-environment jsdom` pragma on line 1.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

Import `defineConfig` from `vitest/config`, not `vite` — the `vite` export does
not type the `test` field.

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Set up Tailwind with Catppuccin Mocha tokens and the Pokémon fonts**

```bash
mkdir -p public/fonts public/img
cp fonts/PokemonSolid.ttf fonts/PokemonHollow.ttf public/fonts/
cp img/board-original.png public/img/
```

Replace `src/index.css` entirely:

```css
@import "tailwindcss";

@theme {
  --color-base: #1e1e2e;
  --color-mantle: #181825;
  --color-crust: #11111b;
  --color-surface0: #313244;
  --color-surface1: #45475a;
  --color-text: #cdd6f4;
  --color-subtext: #a6adc8;
  --color-accent: #89dceb;
  --color-blue: #89b4fa;
  --color-green: #a6e3a1;
  --color-yellow: #f9e2af;
  --color-red: #f38ba8;
  --color-mauve: #cba6f7;
  --font-pokemon: "PokemonSolid", sans-serif;
}

@font-face {
  font-family: "PokemonSolid";
  src: url("/fonts/PokemonSolid.ttf") format("truetype");
  font-display: swap;
}
@font-face {
  font-family: "PokemonHollow";
  src: url("/fonts/PokemonHollow.ttf") format("truetype");
  font-display: swap;
}

html, body, #root {
  height: 100dvh;
  overscroll-behavior: none;
}

body {
  margin: 0;
  background: var(--color-crust);
  color: var(--color-text);
  -webkit-tap-highlight-color: transparent;
}
```

- [ ] **Step 6: Replace `index.html` with a mobile-correct shell**

The legacy file used `maximum-scale=1.0, user-scalable=0`, which iOS Safari ignores and which breaks accessibility zoom. Use `viewport-fit=cover` instead so `env(safe-area-inset-*)` works.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#1e1e2e" />
    <link rel="icon" href="/favicon.ico" />
    <title>Pokémon — Gotta Chug 'em All!</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write the failing smoke test**

Create `src/App.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the game title', () => {
    render(<App />);
    expect(screen.getByText(/Gotta Chug/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — the default Vite `App.tsx` renders "Vite + React", not the title.

- [ ] **Step 9: Write the minimal App**

Replace `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="grid h-dvh place-items-center p-6">
      <h1 className="font-pokemon text-4xl text-accent">Gotta Chug 'em All</h1>
    </main>
  );
}
```

Replace `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite+react+ts, drop 56MB of unused assets"
```

---

## Task 2: Seeded RNG

**Files:**
- Create: `src/engine/rng.ts`
- Test: `src/engine/__tests__/rng.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `nextInt(seed: number, maxExclusive: number): [value: number, nextSeed: number]`
  - `rollDie(seed: number): [face: number, nextSeed: number]` — face is 1..6
  - `rollPercent(seed: number): [value: number, nextSeed: number]` — value is 0..99

Every later engine module threads `seed` through and never calls `Math.random()`.

- [ ] **Step 1: Write the failing test**

Create `src/engine/__tests__/rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { nextInt, rollDie, rollPercent } from '../rng';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    expect(rollDie(12345)).toEqual(rollDie(12345));
  });

  it('produces a different seed each call so sequences advance', () => {
    const [, s1] = rollDie(12345);
    expect(s1).not.toBe(12345);
    const [a] = rollDie(12345);
    const [b] = rollDie(s1);
    expect([a, b].every((f) => f >= 1 && f <= 6)).toBe(true);
  });

  it('rollDie only ever returns 1..6', () => {
    let seed = 1;
    for (let i = 0; i < 10_000; i++) {
      const [face, next] = rollDie(seed);
      expect(face).toBeGreaterThanOrEqual(1);
      expect(face).toBeLessThanOrEqual(6);
      seed = next;
    }
  });

  it('rollDie covers all six faces over many rolls', () => {
    const seen = new Set<number>();
    let seed = 99;
    for (let i = 0; i < 500; i++) {
      const [face, next] = rollDie(seed);
      seen.add(face);
      seed = next;
    }
    expect(seen.size).toBe(6);
  });

  it('nextInt respects the exclusive upper bound', () => {
    let seed = 7;
    for (let i = 0; i < 1000; i++) {
      const [v, next] = nextInt(seed, 63);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(63);
      seed = next;
    }
  });

  it('rollPercent stays within 0..99', () => {
    let seed = 3;
    for (let i = 0; i < 1000; i++) {
      const [v, next] = rollPercent(seed);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(100);
      seed = next;
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/rng.test.ts`
Expected: FAIL — "Failed to resolve import '../rng'".

- [ ] **Step 3: Implement mulberry32**

Create `src/engine/rng.ts`:

```ts
/**
 * Seeded PRNG (mulberry32). Every random decision in the game flows through
 * here so a fixed seed replays an identical game — the property future
 * room-based multiplayer relies on.
 *
 * All functions are pure: they return [value, nextSeed] and never mutate.
 */

/** Advance the seed and produce a float in [0, 1). */
function step(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/** Random integer in [0, maxExclusive). */
export function nextInt(seed: number, maxExclusive: number): [number, number] {
  const [value, next] = step(seed);
  return [Math.floor(value * maxExclusive), next];
}

/** A standard six-sided die: 1..6. */
export function rollDie(seed: number): [number, number] {
  const [value, next] = nextInt(seed, 6);
  return [value + 1, next];
}

/** Percentage roll for chance-based config like "roll off the table". */
export function rollPercent(seed: number): [number, number] {
  return nextInt(seed, 100);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/rng.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.ts src/engine/__tests__/rng.test.ts
git commit -m "feat(engine): seeded deterministic rng"
```

---

## Task 3: Core data types

**Files:**
- Create: `src/data/types.ts`, `src/data/starters.ts`
- Test: `src/data/__tests__/starters.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: the `Effect`, `Amount`, `Target`, `Square`, `Board`, `StarterId`, `StatusId`, `PromptId` types used by every later task, plus `STARTERS`.

Types alone are not testable, so this task also lands the starter roster that gives it a test.

- [ ] **Step 1: Write the failing test**

Create `src/data/__tests__/starters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { STARTERS, STARTER_IDS } from '../starters';

describe('starters', () => {
  it('offers the ten legacy starters', () => {
    expect(STARTER_IDS).toHaveLength(10);
  });

  it('gives every starter a unique national dex sprite number', () => {
    const dex = STARTERS.map((s) => s.dex);
    expect(new Set(dex).size).toBe(dex.length);
  });

  it('points every starter at a still and an animated sprite', () => {
    for (const s of STARTERS) {
      expect(s.sprite).toBe(`/img/sprites/${s.dex}.png`);
      expect(s.animated).toBe(`/img/sprites/animated/${s.dex}.gif`);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/__tests__/starters.test.ts`
Expected: FAIL — "Failed to resolve import '../starters'".

- [ ] **Step 3: Write the type definitions**

Create `src/data/types.ts`:

```ts
export type StarterId =
  | 'bulbasaur' | 'charmander' | 'squirtle' | 'pikachu' | 'caterpie'
  | 'weedle' | 'pidgey' | 'nidoran' | 'nidorina' | 'poliwag';

export type Gender = 'm' | 'f' | 'x';

/**
 * A small expression language for "how many drinks". Kept declarative rather
 * than using closures so squares stay serializable and replayable.
 * `var` reads a value bound earlier in the same effect queue by a `roll` effect.
 */
export type Amount =
  | { kind: 'fixed'; value: number }
  | { kind: 'full' }                                    // config.fullDrink
  | { kind: 'perPlayer' }                               // one per player in game
  | { kind: 'var'; name: string }
  | { kind: 'sum'; a: Amount; b: Amount }
  | { kind: 'product'; a: Amount; b: Amount }
  | { kind: 'offset'; of: Amount; delta: number }
  | { kind: 'half'; of: Amount; round: 'up' | 'down' };

export type Target = 'self' | 'everyoneElse' | 'everyone' | 'sameGender';

export type StatusId =
  | 'zubats'          // must roll 3+ to leave this square
  | 'confuseRay'      // roll 1-3 to clear, otherwise miss the turn
  | 'stringShot'      // next move is halved (round up)
  | 'doubleMove'      // next move is doubled
  | 'reflect'         // drinks given to you rebound on the giver at 3x
  | 'possessed'       // flavour: anyone can make you fetch a drink
  | 'skipNextGym'     // pass through the next gold gym without stopping
  | 'inSilphCo'       // +2 drinks at the start of each of your turns
  | 'inSafariZone'    // roll before each turn for a Safari Zone penalty
  | 'inTower'         // flavour: no speaking in the Pokémon Tower
  | 'copying'         // Ditto: copy everything the next player does
  | 'nonDominantHand' // rest of game: drink with the other hand
  | 'ruleMaker';      // flavour: you made a house rule

/** When a status is removed. Checked by `tickStatuses`. */
export type StatusExpiry =
  | 'nextTurnStart'   // cleared at the start of the holder's next turn
  | 'afterNextTurn'   // survives one full turn, cleared at its end
  | 'leaveSquare'     // cleared when the holder moves off the square
  | 'rollToClear'     // survives until the holder rolls one of STATUS_META.clearsOn
  | 'endOfGame';      // never cleared

export type PromptId =
  | 'givePlayers'     // choose N players to receive drinks
  | 'choosePlayer'    // choose exactly one player (statuses, Haunter)
  | 'snorlaxSong'     // did you sing? yes = free, no = 4 drinks
  | 'evolution'       // evolve (4 + skip gym) or stop (extra turn)
  | 'saffronNumber'   // pick 1-6, then roll
  | 'chuggingContest' // pick an opponent, then report the winner
  | 'koffingSmoke'    // did you smoke? yes = free, no = 2 drinks
  | 'pokeballCatch';  // is your favourite on the board?

export type BranchCond =
  | { faces: readonly number[] }
  | { parity: 'even' | 'odd' };

export interface Branch {
  readonly when: BranchCond;
  readonly effects: readonly Effect[];
}

/**
 * Every rule on the board is one of these. The old code used arbitrary
 * `fn()` closures that mutated globals and the DOM; these are inert data
 * interpreted by `applyEffect`.
 */
export type Effect =
  /** Bind a die roll to a name usable by `{kind:'var'}` later in the queue. */
  | { kind: 'roll'; as: string }
  /** Roll, bind optionally, then splice in the matching branch's effects. */
  | { kind: 'rollBranch'; as?: string; branches: readonly Branch[] }
  /** Keep rolling while the condition holds; bind the number of continues. */
  | { kind: 'rollWhile'; continueWhen: BranchCond; as: string; max: number }
  /** Roll `times` dice; success if any face is in `succeedOn`. */
  | { kind: 'rollTimes'; times: number; succeedOn: readonly number[]; onSuccess: readonly Effect[]; onFail: readonly Effect[] }
  | { kind: 'drink'; target: Target; amount: Amount }
  /** Parks the queue on a `givePlayers` prompt. */
  | { kind: 'give'; amount: Amount; players: Amount | 'all' }
  | { kind: 'moveTo'; square: number }
  | { kind: 'moveBy'; squares: number }
  /** Parks on a `choosePlayer` prompt, then moves them. */
  | { kind: 'movePlayerBy'; squares: number }
  | { kind: 'extraTurn' }
  | { kind: 'missTurn'; amount: Amount }
  | { kind: 'applyStatus'; target: Target | 'chosen'; status: StatusId; expires: StatusExpiry }
  | { kind: 'setStarter'; starter: StarterId }
  /** Clefairy: pick a random square and apply its effects. */
  | { kind: 'randomSquare' }
  | { kind: 'ifAnyPlayerHasStatus'; status: StatusId; then: readonly Effect[]; otherwise: readonly Effect[] }
  | { kind: 'prompt'; prompt: PromptId }
  /** Pure flavour or a social rule the app cannot enforce. Shown, then acked. */
  | { kind: 'note'; text: string };

export type SquareKind = 'normal' | 'start' | 'goldGym' | 'silverZone' | 'finish';

export interface Square {
  readonly id: number;
  /** Percentage of board width, 0..100. */
  readonly x: number;
  /** Percentage of board height, 0..100. */
  readonly y: number;
  readonly kind: SquareKind;
  readonly text: string;
  readonly action: string;
  readonly effects: readonly Effect[];
}

export interface Board {
  readonly id: string;
  readonly name: string;
  readonly image: string;
  /** Board images are square; this is the natural pixel size of one side. */
  readonly imageSize: number;
  readonly squares: readonly Square[];
}
```

- [ ] **Step 4: Write the starter roster**

Dex numbers are taken from the legacy `css/pokemon.css` background-image paths so the existing sprites in `img/sprites/` resolve unchanged. Note the legacy code misspelled Poliwag as `polywag`; this fixes the id while keeping dex 60.

Create `src/data/starters.ts`:

```ts
import type { StarterId } from './types';

export interface Starter {
  readonly id: StarterId;
  readonly label: string;
  readonly dex: number;
  readonly sprite: string;
  readonly animated: string;
}

const DEX: Record<StarterId, [label: string, dex: number]> = {
  bulbasaur: ['Bulbasaur', 1],
  charmander: ['Charmander', 4],
  squirtle: ['Squirtle', 7],
  caterpie: ['Caterpie', 10],
  weedle: ['Weedle', 13],
  pidgey: ['Pidgey', 16],
  pikachu: ['Pikachu', 25],
  nidorina: ['Nidorina', 29],
  nidoran: ['Nidoran', 32],
  poliwag: ['Poliwag', 60],
};

export const STARTERS: readonly Starter[] = Object.freeze(
  (Object.keys(DEX) as StarterId[]).map((id) => {
    const [label, dex] = DEX[id];
    return Object.freeze({
      id,
      label,
      dex,
      sprite: `/img/sprites/${dex}.png`,
      animated: `/img/sprites/animated/${dex}.gif`,
    });
  }),
);

export const STARTER_IDS: readonly StarterId[] = STARTERS.map((s) => s.id);

export function getStarter(id: StarterId): Starter {
  const found = STARTERS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown starter: ${id}`);
  return found;
}
```

- [ ] **Step 5: Copy the sprites the starters need into `public/`**

```bash
mkdir -p public/img/sprites/animated
for n in 1 4 7 10 13 16 25 29 32 60; do
  cp "img/sprites/$n.png" public/img/sprites/
  cp "img/sprites/animated/$n.gif" public/img/sprites/animated/
done
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/data/__tests__/starters.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add src/data public/img
git commit -m "feat(data): effect/square types and starter roster"
```

---

## Task 4: Extract legacy square coordinates

**Files:**
- Create: `scripts/extract-legacy-squares.mjs`
- Create: `src/data/boards/original.coords.json`
- Test: `src/data/__tests__/coords.test.ts`

**Interfaces:**
- Consumes: `js/squares-original.js` (legacy, still in repo)
- Produces: `original.coords.json` — an array of `{ id, x, y, text, action }` consumed by Task 5.

**Why a script:** the legacy coordinates are Leaflet `CRS.Simple` lat/lng. With `maxZoom: 4`, `config.js` computes bounds at zoom 3 (scale `2^3 = 8`), so the 2216px board spans exactly `2216 / 8 = 277` units. Conversion is `x = lng / 277 * 100` and `y = -lat / 277 * 100`. Transcribing 63 pairs by hand invites typos; the script cannot typo.

- [ ] **Step 1: Write the extraction script**

The legacy file references globals (`fullDrink`, `diceRoll`, `$`, `map`…) at load time, so it is evaluated in a `vm` context with stubs.

Create `scripts/extract-legacy-squares.mjs`:

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';

/** The board spans 2216px / 2^3 = 277 CRS.Simple units on each axis. */
const SPAN = 277;

const src = readFileSync('js/squares-original.js', 'utf8');

// The legacy module runs statements at load time that touch jQuery, Leaflet and
// game globals. Stub them so it can be evaluated purely for its data.
const ctx = {
  fullDrink: 10, diceRoll: 0, numPlayers: 0, playerArray: [], turnCounter: 0,
  rollDice() {}, updateLog() {}, show_modal() {}, reRoll() {}, alert() {},
  map: { panTo() {} },
  $: Object.assign(() => ({ html() {}, append() {}, text() {} }), { isFunction: () => false }),
};
vm.createContext(ctx);
vm.runInContext(src, ctx);

const squares = ctx.gameSquares.map((s, id) => ({
  id,
  x: +((s.latlng[1] / SPAN) * 100).toFixed(3),
  y: +((-s.latlng[0] / SPAN) * 100).toFixed(3),
  text: s.text ?? '',
  action: s.action ?? '',
}));

// Legacy bug: square 53 was given square 50's coordinates. The board is a
// spiral; 53 belongs between 52 (58.484) and 54 (41.516) on the y=75.451 row.
squares[53].x = 49.819;
squares[53].y = 75.451;

mkdirSync('src/data/boards', { recursive: true });
writeFileSync('src/data/boards/original.coords.json', JSON.stringify(squares, null, 2) + '\n');
console.log(`Wrote ${squares.length} squares.`);
```

- [ ] **Step 2: Run the script**

Run: `node scripts/extract-legacy-squares.mjs`
Expected: `Wrote 63 squares.`

- [ ] **Step 3: Write the test that guards the conversion**

Create `src/data/__tests__/coords.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import coords from '../boards/original.coords.json';

describe('extracted coordinates', () => {
  it('has all 63 squares with sequential ids', () => {
    expect(coords).toHaveLength(63);
    coords.forEach((c, i) => expect(c.id).toBe(i));
  });

  it('places every square inside the board', () => {
    for (const c of coords) {
      expect(c.x).toBeGreaterThan(0);
      expect(c.x).toBeLessThan(100);
      expect(c.y).toBeGreaterThan(0);
      expect(c.y).toBeLessThan(100);
    }
  });

  it('converts Start to the bottom-left of the spiral', () => {
    expect(coords[0]).toMatchObject({ x: 15.884, y: 83.755 });
  });

  it('gives every square a unique position', () => {
    const keys = coords.map((c) => `${c.x},${c.y}`);
    expect(new Set(keys).size).toBe(63);
  });
});
```

The last assertion fails without the square-53 fix in the script — that is the point of it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/__tests__/coords.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Enable JSON module resolution**

Add to `tsconfig.json` under `compilerOptions`:

```json
"resolveJsonModule": true
```

- [ ] **Step 6: Commit**

```bash
git add scripts src/data/boards src/data/__tests__/coords.test.ts tsconfig.json
git commit -m "feat(data): extract board 1 coordinates from legacy leaflet latlng"
```

---

## Task 5: Board 1 square data

**Files:**
- Create: `src/data/boards/original.ts`
- Test: `src/data/__tests__/original.test.ts`

**Interfaces:**
- Consumes: `original.coords.json` (Task 4), types from `src/data/types.ts` (Task 3)
- Produces: `BOARD_ORIGINAL: Board`, `getSquare(board, id): Square`

This is the hand-translation of every legacy `fn()`/`gym()` closure into declarative effects. Four legacy bugs are fixed here rather than ported (see Step 1).

- [ ] **Step 1: Note the four rule bugs being corrected**

Fixed while translating, each with a test in Step 4:

| Square | Legacy bug | Correct rule |
|---|---|---|
| 6 Pewter Gym | wrote its result into `gameSquares[19]` (Vermilion), corrupting it permanently | writes nothing; branches to its own effects |
| 13 Cerulean Gym | loop added +1 to *every* player including self, then +1 again on top of `drink: 2` | self drinks 2, everyone else drinks 1 |
| 16 Meowth / 39 Team Rocket | `player.drinks = playerArray[turnCounter].drinks + 1` overwrote every player's tally with the current player's | 16: everyone else drinks 1. 39: everyone drinks 1 |
| 54 Electabuzz | `missTurn: true`, and `parseInt(true)` is `NaN`, so it never fired | misses exactly 1 turn |

- [ ] **Step 2: Write the failing test**

Create `src/data/__tests__/original.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BOARD_ORIGINAL, getSquare } from '../boards/original';

describe('board original', () => {
  it('has 63 squares ending in a finish square', () => {
    expect(BOARD_ORIGINAL.squares).toHaveLength(63);
    expect(BOARD_ORIGINAL.squares.at(-1)!.kind).toBe('finish');
    expect(BOARD_ORIGINAL.squares[0].kind).toBe('start');
  });

  it('marks the seven gold gyms', () => {
    const gold = BOARD_ORIGINAL.squares.filter((s) => s.kind === 'goldGym').map((s) => s.id);
    expect(gold).toEqual([6, 13, 19, 32, 43, 52, 58]);
  });

  it('is deeply frozen so no rule can mutate the board', () => {
    expect(Object.isFrozen(BOARD_ORIGINAL.squares)).toBe(true);
    expect(Object.isFrozen(BOARD_ORIGINAL.squares[6])).toBe(true);
    expect(Object.isFrozen(BOARD_ORIGINAL.squares[6].effects)).toBe(true);
  });

  it('links the two Abra squares to each other', () => {
    expect(getSquare(BOARD_ORIGINAL, 11).effects).toEqual([{ kind: 'moveTo', square: 28 }]);
    expect(getSquare(BOARD_ORIGINAL, 28).effects).toEqual([{ kind: 'moveTo', square: 11 }]);
  });

  it('fixes Pewter Gym so it no longer writes into Vermilion', () => {
    const json = JSON.stringify(getSquare(BOARD_ORIGINAL, 6).effects);
    expect(json).not.toContain('19');
    expect(getSquare(BOARD_ORIGINAL, 6).effects[0].kind).toBe('rollBranch');
  });

  it('fixes Meowth so only other players drink', () => {
    expect(getSquare(BOARD_ORIGINAL, 16).effects).toEqual([
      { kind: 'drink', target: 'everyoneElse', amount: { kind: 'fixed', value: 1 } },
    ]);
  });

  it('rounds both halves of Gary up, as the square text promises', () => {
    expect(getSquare(BOARD_ORIGINAL, 12).effects).toEqual([
      { kind: 'roll', as: 'gary' },
      { kind: 'drink', target: 'self', amount: { kind: 'half', of: { kind: 'var', name: 'gary' }, round: 'up' } },
      { kind: 'give', amount: { kind: 'half', of: { kind: 'var', name: 'gary' }, round: 'up' }, players: { kind: 'fixed', value: 1 } },
    ]);
  });

  it('fixes Electabuzz so it costs exactly one turn', () => {
    expect(getSquare(BOARD_ORIGINAL, 54).effects).toEqual([
      { kind: 'missTurn', amount: { kind: 'fixed', value: 1 } },
    ]);
  });

  it('gives every square non-empty display text', () => {
    for (const s of BOARD_ORIGINAL.squares) {
      expect(s.text.length).toBeGreaterThan(0);
    }
  });

  it('never references a square id outside the board', () => {
    const ids = new Set(BOARD_ORIGINAL.squares.map((s) => s.id));
    const walk = (effects: readonly unknown[]): void => {
      for (const e of effects as Array<Record<string, unknown>>) {
        if (e.kind === 'moveTo') expect(ids.has(e.square as number)).toBe(true);
        for (const v of Object.values(e)) if (Array.isArray(v)) walk(v);
        if (e.branches) for (const b of e.branches as Array<{ effects: readonly unknown[] }>) walk(b.effects);
      }
    };
    for (const s of BOARD_ORIGINAL.squares) walk(s.effects);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/data/__tests__/original.test.ts`
Expected: FAIL — "Failed to resolve import '../boards/original'".

- [ ] **Step 4: Write the board data**

Create `src/data/boards/original.ts`:

```ts
import type { Amount, Board, Effect, Square, SquareKind } from '../types';
import coords from './original.coords.json';

/** Shorthand for a plain numeric amount, used all over the rules below. */
const n = (value: number): Amount => ({ kind: 'fixed', value });

/** Per-square rule definitions, keyed by square id. Text/coords come from JSON. */
const RULES: Record<number, { kind?: SquareKind; effects: Effect[] }> = {
  0: { kind: 'start', effects: [] },

  1: { effects: [{ kind: 'drink', target: 'self', amount: { kind: 'full' } }] },

  2: {
    effects: [
      { kind: 'give', amount: n(1), players: n(1) },
      { kind: 'extraTurn' },
    ],
  },

  3: {
    effects: [
      { kind: 'applyStatus', target: 'everyoneElse', status: 'stringShot', expires: 'afterNextTurn' },
    ],
  },

  4: {
    effects: [
      { kind: 'drink', target: 'self', amount: n(2) },
      { kind: 'setStarter', starter: 'pikachu' },
    ],
  },

  5: { effects: [{ kind: 'give', amount: n(1), players: n(2) }] },

  // Pewter Gym. Legacy wrote its result into gameSquares[19]; it writes nothing now.
  6: {
    kind: 'goldGym',
    effects: [
      {
        kind: 'rollBranch',
        branches: [
          { when: { parity: 'even' }, effects: [{ kind: 'give', amount: n(1), players: n(1) }] },
          { when: { parity: 'odd' }, effects: [{ kind: 'drink', target: 'self', amount: n(1) }] },
        ],
      },
    ],
  },

  7: { effects: [{ kind: 'drink', target: 'sameGender', amount: n(1) }] },

  8: {
    effects: [
      { kind: 'drink', target: 'self', amount: n(1) },
      { kind: 'applyStatus', target: 'self', status: 'zubats', expires: 'leaveSquare' },
    ],
  },

  9: { effects: [{ kind: 'randomSquare' }] },

  10: { effects: [{ kind: 'extraTurn' }] },

  11: { effects: [{ kind: 'moveTo', square: 28 }] },

  // Gary: roll, then drink half and give half, both rounded up as the text says.
  12: {
    effects: [
      { kind: 'roll', as: 'gary' },
      { kind: 'drink', target: 'self', amount: { kind: 'half', of: { kind: 'var', name: 'gary' }, round: 'up' } },
      { kind: 'give', amount: { kind: 'half', of: { kind: 'var', name: 'gary' }, round: 'up' }, players: n(1) },
    ],
  },

  // Cerulean Gym. Legacy double-counted the current player; now 2 for you, 1 for the rest.
  13: {
    kind: 'goldGym',
    effects: [
      { kind: 'drink', target: 'self', amount: n(2) },
      { kind: 'drink', target: 'everyoneElse', amount: n(1) },
    ],
  },

  14: { effects: [{ kind: 'note', text: 'Invent a gesture. For the rest of the game, the last player to mimic it drinks 1.' }] },

  15: { effects: [{ kind: 'give', amount: n(1), players: n(1) }] },

  // Meowth Pay Day. Legacy overwrote every player's tally with the current player's.
  16: { effects: [{ kind: 'drink', target: 'everyoneElse', amount: n(1) }] },

  17: { effects: [{ kind: 'drink', target: 'self', amount: { kind: 'full' } }] },

  // S.S. Anne: lose A turns, drink B on each of them.
  18: {
    effects: [
      { kind: 'roll', as: 'turns' },
      { kind: 'roll', as: 'perTurn' },
      { kind: 'missTurn', amount: { kind: 'var', name: 'turns' } },
      {
        kind: 'drink',
        target: 'self',
        amount: { kind: 'product', a: { kind: 'var', name: 'turns' }, b: { kind: 'var', name: 'perTurn' } },
      },
    ],
  },

  19: {
    kind: 'goldGym',
    effects: [
      {
        kind: 'rollBranch',
        branches: [
          {
            when: { parity: 'even' },
            effects: [
              { kind: 'drink', target: 'self', amount: n(2) },
              { kind: 'missTurn', amount: n(1) },
            ],
          },
          { when: { parity: 'odd' }, effects: [{ kind: 'drink', target: 'self', amount: n(1) }] },
        ],
      },
    ],
  },

  20: { effects: [{ kind: 'applyStatus', target: 'self', status: 'doubleMove', expires: 'afterNextTurn' }] },

  21: { effects: [{ kind: 'note', text: 'Magikarp used Splash! But nothing happened.' }] },

  22: { effects: [{ kind: 'applyStatus', target: 'self', status: 'nonDominantHand', expires: 'endOfGame' }] },

  23: {
    kind: 'silverZone',
    effects: [
      { kind: 'drink', target: 'everyone', amount: n(1) },
      { kind: 'applyStatus', target: 'self', status: 'inTower', expires: 'leaveSquare' },
    ],
  },

  24: { kind: 'silverZone', effects: [{ kind: 'applyStatus', target: 'self', status: 'possessed', expires: 'leaveSquare' }] },

  25: { kind: 'silverZone', effects: [{ kind: 'movePlayerBy', squares: -10 }] },

  26: {
    kind: 'silverZone',
    effects: [
      { kind: 'note', text: 'Share a depressing story with the group.' },
      { kind: 'drink', target: 'everyone', amount: n(1) },
    ],
  },

  27: {
    kind: 'silverZone',
    effects: [
      {
        kind: 'ifAnyPlayerHasStatus',
        status: 'inSilphCo',
        then: [{ kind: 'drink', target: 'everyoneElse', amount: n(1) }],
        otherwise: [{ kind: 'drink', target: 'self', amount: n(3) }],
      },
    ],
  },

  28: { effects: [{ kind: 'moveTo', square: 11 }] },

  29: { effects: [{ kind: 'prompt', prompt: 'snorlaxSong' }] },

  30: {
    effects: [
      { kind: 'roll', as: 'gary2' },
      { kind: 'drink', target: 'self', amount: { kind: 'offset', of: { kind: 'var', name: 'gary2' }, delta: -1 } },
    ],
  },

  31: {
    effects: [
      { kind: 'note', text: 'Choose a new rule. Any violation costs a drink.' },
      { kind: 'applyStatus', target: 'self', status: 'ruleMaker', expires: 'endOfGame' },
    ],
  },

  32: {
    kind: 'goldGym',
    effects: [
      {
        kind: 'rollBranch',
        branches: [
          { when: { faces: [1, 2, 3] }, effects: [{ kind: 'missTurn', amount: n(1) }] },
          { when: { faces: [4, 5, 6] }, effects: [{ kind: 'drink', target: 'self', amount: { kind: 'full' } }] },
        ],
      },
    ],
  },

  33: { effects: [{ kind: 'note', text: 'Invent a gesture. For the rest of the game, the last player to mimic it drinks 1.' }] },

  34: { effects: [{ kind: 'prompt', prompt: 'evolution' }] },

  35: { effects: [{ kind: 'applyStatus', target: 'self', status: 'reflect', expires: 'leaveSquare' }] },

  36: { kind: 'silverZone', effects: [{ kind: 'applyStatus', target: 'self', status: 'inSilphCo', expires: 'leaveSquare' }] },

  37: { kind: 'silverZone', effects: [{ kind: 'drink', target: 'self', amount: { kind: 'perPlayer' } }] },

  // Lapras: the chosen player stays confused until they roll a 1-3, per the text.
  38: { kind: 'silverZone', effects: [{ kind: 'applyStatus', target: 'chosen', status: 'confuseRay', expires: 'rollToClear' }] },

  // Team Rocket. Legacy overwrote every player's tally.
  39: { kind: 'silverZone', effects: [{ kind: 'drink', target: 'everyone', amount: n(1) }] },

  40: {
    kind: 'silverZone',
    effects: [
      {
        kind: 'rollBranch',
        as: 'gio',
        branches: [
          { when: { faces: [1, 2, 3] }, effects: [{ kind: 'give', amount: { kind: 'var', name: 'gio' }, players: n(1) }] },
          { when: { faces: [4, 5, 6] }, effects: [{ kind: 'drink', target: 'self', amount: { kind: 'var', name: 'gio' } }] },
        ],
      },
    ],
  },

  41: { effects: [{ kind: 'extraTurn' }] },

  42: {
    effects: [
      { kind: 'roll', as: 'gary3' },
      { kind: 'drink', target: 'self', amount: { kind: 'var', name: 'gary3' } },
    ],
  },

  43: { kind: 'goldGym', effects: [{ kind: 'prompt', prompt: 'saffronNumber' }] },

  44: { effects: [{ kind: 'prompt', prompt: 'chuggingContest' }] },

  45: { effects: [{ kind: 'give', amount: { kind: 'full' }, players: n(1) }] },

  46: {
    effects: [
      { kind: 'note', text: "Copy everything the next player does during their turn." },
      { kind: 'applyStatus', target: 'self', status: 'copying', expires: 'afterNextTurn' },
    ],
  },

  47: {
    effects: [
      { kind: 'give', amount: n(4), players: n(1) },
      { kind: 'drink', target: 'self', amount: n(1) },
    ],
  },

  48: { kind: 'silverZone', effects: [{ kind: 'applyStatus', target: 'self', status: 'inSafariZone', expires: 'leaveSquare' }] },

  49: {
    kind: 'silverZone',
    effects: [
      {
        kind: 'rollBranch',
        branches: [
          { when: { faces: [1] }, effects: [{ kind: 'note', text: 'You caught the Dratini!' }] },
          { when: { faces: [2, 3, 4, 5, 6] }, effects: [{ kind: 'drink', target: 'self', amount: n(1) }] },
        ],
      },
    ],
  },

  50: { kind: 'silverZone', effects: [{ kind: 'drink', target: 'self', amount: n(2) }] },

  51: {
    kind: 'silverZone',
    effects: [
      {
        kind: 'rollBranch',
        branches: [
          { when: { faces: [1, 2, 3] }, effects: [{ kind: 'drink', target: 'self', amount: n(1) }] },
          { when: { faces: [4, 5, 6] }, effects: [{ kind: 'give', amount: n(2), players: n(1) }] },
        ],
      },
    ],
  },

  52: { kind: 'goldGym', effects: [{ kind: 'drink', target: 'self', amount: n(3) }] },

  53: { effects: [{ kind: 'drink', target: 'everyone', amount: { kind: 'full' } }] },

  // Electabuzz. Legacy used `missTurn: true`, and parseInt(true) is NaN.
  54: { effects: [{ kind: 'missTurn', amount: n(1) }] },

  55: { effects: [{ kind: 'drink', target: 'self', amount: { kind: 'full' } }] },

  56: { effects: [{ kind: 'note', text: 'Waterfall! Everyone starts drinking, and you can only stop when the player to your right stops.' }] },

  57: {
    effects: [
      {
        kind: 'rollTimes',
        times: 3,
        succeedOn: [5, 6],
        onSuccess: [{ kind: 'note', text: 'You escaped the glitch.' }],
        onFail: [{ kind: 'moveTo', square: 0 }],
      },
    ],
  },

  58: {
    kind: 'goldGym',
    effects: [
      { kind: 'rollWhile', continueWhen: { parity: 'even' }, as: 'evens', max: 20 },
      {
        kind: 'drink',
        target: 'self',
        amount: { kind: 'product', a: { kind: 'var', name: 'evens' }, b: n(2) },
      },
    ],
  },

  59: { effects: [{ kind: 'prompt', prompt: 'koffingSmoke' }] },

  60: { effects: [{ kind: 'note', text: 'Everyone older than you drinks 2.' }] },

  61: { effects: [{ kind: 'prompt', prompt: 'pokeballCatch' }] },

  62: {
    kind: 'finish',
    effects: [
      { kind: 'roll', as: 'persian' },
      { kind: 'give', amount: n(1), players: { kind: 'var', name: 'persian' } },
    ],
  },
};

const squares: readonly Square[] = Object.freeze(
  coords.map((c) => {
    const rule = RULES[c.id] ?? { effects: [] };
    return Object.freeze({
      id: c.id,
      x: c.x,
      y: c.y,
      kind: rule.kind ?? 'normal',
      text: c.text,
      action: c.action,
      effects: Object.freeze(rule.effects),
    }) as Square;
  }),
);

export const BOARD_ORIGINAL: Board = Object.freeze({
  id: 'original',
  name: 'Original',
  image: '/img/board-original.webp',
  imageSize: 2216,
  squares,
});

export function getSquare(board: Board, id: number): Square {
  const square = board.squares[id];
  if (!square) throw new Error(`Square ${id} does not exist on board ${board.id}`);
  return square;
}
```

- [ ] **Step 5: Typecheck the board data**

Every effect must satisfy the `Effect` union. This is the step that catches a
mistranslated rule before any test runs.

Run: `npx tsc --noEmit`
Expected: no errors. A complaint about an `effects` entry means that square's
rule does not match any `Effect` variant — fix the data, not the type.

- [ ] **Step 6: Convert the board image to WebP**

Use **lossless** WebP. The board is flat-colour pixel art with tiny per-square
text — the content lossy encoding handles worst. Lossy `--quality 82` was
measured at 1293KB, *twice* the size of the source PNG, on top of visibly
degrading the square text. Lossless is 328KB.

```bash
npx --yes sharp-cli -i img/board-original.png -o public/img/ --format webp --lossless
rm -f public/img/board-original.png
ls -lh public/img/board-original.webp
```

Expected: `board-original.webp` exists at roughly 328KB, well under the 644KB
original. Sharp drops the source's alpha channel, which is fully opaque, so the
RGB data stays byte-identical.

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/data/__tests__/original.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 8: Commit**

```bash
git add src/data public/img
git commit -m "feat(data): board 1 squares as declarative effects, fixing 4 legacy rule bugs"
```

---

## Task 6: Engine state types and value resolution

**Files:**
- Create: `src/engine/types.ts`, `src/engine/amount.ts`, `src/engine/targets.ts`
- Test: `src/engine/__tests__/amount.test.ts`, `src/engine/__tests__/targets.test.ts`

**Interfaces:**
- Consumes: `Amount`, `Target`, `Effect`, `StatusId`, `StatusExpiry`, `PromptId`, `StarterId`, `Gender` from `src/data/types.ts`
- Produces:
  - `GameState`, `Player`, `PlayerId`, `Phase`, `Prompt`, `PromptResult`, `Action`, `GameConfig`, `LogEntry`, `Status`
  - `resolveAmount(amount: Amount, ctx: ResolveCtx): number`
  - `resolveTarget(target: Target, state: GameState): PlayerId[]`
  - `updatePlayer(state, id, fn): GameState`, `activePlayer(state): Player`, `pushLog(state, kind, text): GameState`

- [ ] **Step 1: Write the engine state types**

Create `src/engine/types.ts`:

```ts
// Note: `Prompt`/`PromptResult` below spell their ids as literals rather than
// reusing `PromptId`, since each variant carries a different payload. Do not
// import `PromptId` here — it would be unused, which `noUnusedLocals` rejects.
import type {
  Effect, Gender, StarterId, StatusExpiry, StatusId,
} from '../data/types';

export type PlayerId = string;

export interface Status {
  readonly id: StatusId;
  readonly expires: StatusExpiry;
  /** Square the holder was on when a `leaveSquare` status was applied. */
  readonly appliedOnSquare: number;
}

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  readonly starter: StarterId;
  readonly gender: Gender;
  readonly square: number;
  readonly drinks: number;
  readonly missedTurns: number;
  readonly extraTurns: number;
  readonly statuses: readonly Status[];
  readonly finishedAtTurn: number | null;
}

export interface GameConfig {
  /** Drinks that constitute one full vessel. Legacy default 10. */
  readonly fullDrink: number;
  readonly trainerBattles: boolean;
  /** Percent chance per roll of knocking the die off the table. Legacy default 1. */
  readonly offTableChance: number;
  /** Cap on missed turns from a single effect. Legacy default 6. */
  readonly maxMissedTurns: number;
}

export type Prompt =
  | { readonly id: 'givePlayers'; readonly drinks: number; readonly players: number | 'all' }
  | { readonly id: 'choosePlayer'; readonly purpose: 'status'; readonly status: StatusId; readonly expires: StatusExpiry }
  | { readonly id: 'choosePlayer'; readonly purpose: 'move'; readonly squares: number }
  | { readonly id: 'snorlaxSong' }
  | { readonly id: 'evolution' }
  | { readonly id: 'saffronNumber' }
  | { readonly id: 'chuggingContest' }
  | { readonly id: 'koffingSmoke' }
  | { readonly id: 'pokeballCatch' };

export type PromptResult =
  | { readonly id: 'givePlayers'; readonly assignments: ReadonlyArray<{ playerId: PlayerId; drinks: number }> }
  | { readonly id: 'choosePlayer'; readonly playerId: PlayerId }
  | { readonly id: 'snorlaxSong'; readonly sang: boolean }
  | { readonly id: 'evolution'; readonly evolve: boolean }
  | { readonly id: 'saffronNumber'; readonly guess: number }
  | { readonly id: 'chuggingContest'; readonly opponentId: PlayerId; readonly winnerId: PlayerId }
  | { readonly id: 'koffingSmoke'; readonly smoked: boolean }
  | { readonly id: 'pokeballCatch'; readonly onBoard: boolean };

/**
 * The turn machine. The UI renders whatever the phase says and reports
 * animation completion back as an action — the engine never sleeps.
 */
export type Phase =
  | { readonly name: 'idle' }
  | { readonly name: 'rolling'; readonly face: number; readonly offTable: boolean }
  | { readonly name: 'moving'; readonly remaining: number }
  | { readonly name: 'landed' }
  | { readonly name: 'resolving' }
  | { readonly name: 'prompt'; readonly prompt: Prompt }
  | { readonly name: 'note'; readonly text: string }
  | { readonly name: 'battle'; readonly opponentId: PlayerId; readonly rolls: readonly [number, number] }
  | { readonly name: 'turnEnd' }
  | { readonly name: 'gameOver' };

export type LogKind = 'turn' | 'roll' | 'drink' | 'move' | 'status' | 'info';

export interface LogEntry {
  readonly seq: number;
  readonly kind: LogKind;
  readonly text: string;
}

export interface GameState {
  readonly boardId: string;
  readonly config: GameConfig;
  readonly players: readonly Player[];
  readonly activeIndex: number;
  readonly seed: number;
  readonly turnNumber: number;
  readonly phase: Phase;
  /** Effects still to apply for the current square. Drained by `drainQueue`. */
  readonly queue: readonly Effect[];
  /** Values bound by `roll`/`rollBranch`/`rollWhile`, cleared each turn. */
  readonly vars: Readonly<Record<string, number>>;
  readonly lastRoll: number | null;
  readonly log: readonly LogEntry[];
  readonly logSeq: number;
}

export type Action =
  | { readonly type: 'ROLL' }
  /** Dice animation finished; begin moving. */
  | { readonly type: 'DICE_SHOWN' }
  /** One token hop finished. */
  | { readonly type: 'STEP_DONE' }
  /** Player dismissed the square card; start resolving effects. */
  | { readonly type: 'DISMISS_SQUARE' }
  | { readonly type: 'ACK_NOTE' }
  | { readonly type: 'ACK_BATTLE' }
  | { readonly type: 'RESOLVE_PROMPT'; readonly result: PromptResult }
  | { readonly type: 'END_TURN' };

export interface ResolveCtx {
  readonly config: GameConfig;
  readonly playerCount: number;
  readonly vars: Readonly<Record<string, number>>;
}
```

- [ ] **Step 2: Write the failing amount test**

Create `src/engine/__tests__/amount.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveAmount } from '../amount';
import type { ResolveCtx } from '../types';

const ctx: ResolveCtx = {
  config: { fullDrink: 10, trainerBattles: true, offTableChance: 1, maxMissedTurns: 6 },
  playerCount: 4,
  vars: { gary: 5, turns: 3, perTurn: 2 },
};

describe('resolveAmount', () => {
  it('resolves a fixed amount', () => {
    expect(resolveAmount({ kind: 'fixed', value: 3 }, ctx)).toBe(3);
  });

  it('resolves full to the configured vessel size', () => {
    expect(resolveAmount({ kind: 'full' }, ctx)).toBe(10);
  });

  it('resolves perPlayer to the player count', () => {
    expect(resolveAmount({ kind: 'perPlayer' }, ctx)).toBe(4);
  });

  it('reads a bound variable', () => {
    expect(resolveAmount({ kind: 'var', name: 'gary' }, ctx)).toBe(5);
  });

  it('throws on an unbound variable rather than silently yielding NaN', () => {
    expect(() => resolveAmount({ kind: 'var', name: 'nope' }, ctx)).toThrow(/nope/);
  });

  it('rounds half up and half down as asked', () => {
    const gary = { kind: 'var', name: 'gary' } as const;
    expect(resolveAmount({ kind: 'half', of: gary, round: 'up' }, ctx)).toBe(3);
    expect(resolveAmount({ kind: 'half', of: gary, round: 'down' }, ctx)).toBe(2);
  });

  it('multiplies (S.S. Anne: 3 turns x 2 drinks = 6)', () => {
    expect(
      resolveAmount(
        { kind: 'product', a: { kind: 'var', name: 'turns' }, b: { kind: 'var', name: 'perTurn' } },
        ctx,
      ),
    ).toBe(6);
  });

  it('offsets and clamps at zero (Gary 30: roll 1 means drink 0, never -1)', () => {
    expect(resolveAmount({ kind: 'offset', of: { kind: 'fixed', value: 1 }, delta: -1 }, ctx)).toBe(0);
    expect(resolveAmount({ kind: 'offset', of: { kind: 'fixed', value: 1 }, delta: -5 }, ctx)).toBe(0);
  });

  it('sums nested amounts', () => {
    expect(
      resolveAmount({ kind: 'sum', a: { kind: 'fixed', value: 2 }, b: { kind: 'full' } }, ctx),
    ).toBe(12);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/amount.test.ts`
Expected: FAIL — "Failed to resolve import '../amount'".

- [ ] **Step 4: Implement the amount evaluator**

Create `src/engine/amount.ts`:

```ts
import type { Amount } from '../data/types';
import type { ResolveCtx } from './types';

/**
 * Evaluate an Amount expression to a concrete number of drinks/turns.
 * Results are clamped at zero — no rule in the game means "drink -1".
 */
export function resolveAmount(amount: Amount, ctx: ResolveCtx): number {
  return Math.max(0, evaluate(amount, ctx));
}

function evaluate(amount: Amount, ctx: ResolveCtx): number {
  switch (amount.kind) {
    case 'fixed':
      return amount.value;
    case 'full':
      return ctx.config.fullDrink;
    case 'perPlayer':
      return ctx.playerCount;
    case 'var': {
      const value = ctx.vars[amount.name];
      if (value === undefined) {
        throw new Error(`Amount referenced unbound variable "${amount.name}"`);
      }
      return value;
    }
    case 'sum':
      return evaluate(amount.a, ctx) + evaluate(amount.b, ctx);
    case 'product':
      return evaluate(amount.a, ctx) * evaluate(amount.b, ctx);
    case 'offset':
      return evaluate(amount.of, ctx) + amount.delta;
    case 'half': {
      const value = evaluate(amount.of, ctx) / 2;
      return amount.round === 'up' ? Math.ceil(value) : Math.floor(value);
    }
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/amount.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Write the failing targets test**

Create `src/engine/__tests__/targets.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveTarget, activePlayer, updatePlayer, pushLog } from '../targets';
import type { GameState, Player } from '../types';

function player(id: string, gender: Player['gender']): Player {
  return {
    id, name: id, starter: 'bulbasaur', gender, square: 0, drinks: 0,
    missedTurns: 0, extraTurns: 0, statuses: [], finishedAtTurn: null,
  };
}

const state = {
  boardId: 'original',
  config: { fullDrink: 10, trainerBattles: true, offTableChance: 1, maxMissedTurns: 6 },
  players: [player('a', 'm'), player('b', 'f'), player('c', 'm'), player('d', 'x')],
  activeIndex: 0,
  seed: 1, turnNumber: 1, phase: { name: 'idle' }, queue: [], vars: {},
  lastRoll: null, log: [], logSeq: 0,
} as unknown as GameState;

describe('resolveTarget', () => {
  it('resolves self to just the active player', () => {
    expect(resolveTarget('self', state)).toEqual(['a']);
  });

  it('resolves everyone to all players in seat order', () => {
    expect(resolveTarget('everyone', state)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('resolves everyoneElse by excluding the active player', () => {
    expect(resolveTarget('everyoneElse', state)).toEqual(['b', 'c', 'd']);
  });

  it('resolves sameGender to players matching the active player, including them', () => {
    expect(resolveTarget('sameGender', state)).toEqual(['a', 'c']);
  });

  it('falls back to self alone when the active player did not state a gender', () => {
    const anon = { ...state, players: [player('a', 'x'), player('b', 'f')] } as GameState;
    expect(resolveTarget('sameGender', anon)).toEqual(['a']);
  });
});

describe('state helpers', () => {
  it('activePlayer reads the player at activeIndex', () => {
    expect(activePlayer(state).id).toBe('a');
  });

  it('updatePlayer replaces one player without touching the others', () => {
    const next = updatePlayer(state, 'b', (p) => ({ ...p, drinks: p.drinks + 3 }));
    expect(next.players[1].drinks).toBe(3);
    expect(next.players[0]).toBe(state.players[0]);
    expect(state.players[1].drinks).toBe(0);
  });

  it('pushLog appends with a monotonic sequence number', () => {
    const next = pushLog(pushLog(state, 'info', 'one'), 'drink', 'two');
    expect(next.log.map((l) => l.seq)).toEqual([1, 2]);
    expect(next.logSeq).toBe(2);
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/targets.test.ts`
Expected: FAIL — "Failed to resolve import '../targets'".

- [ ] **Step 8: Implement targets and the shared state helpers**

Create `src/engine/targets.ts`:

```ts
import type { Target } from '../data/types';
import type { GameState, LogKind, Player, PlayerId } from './types';

export function activePlayer(state: GameState): Player {
  const player = state.players[state.activeIndex];
  if (!player) throw new Error(`No player at index ${state.activeIndex}`);
  return player;
}

/** Expand a Target into concrete player ids, in seat order. */
export function resolveTarget(target: Target, state: GameState): PlayerId[] {
  const active = activePlayer(state);
  switch (target) {
    case 'self':
      return [active.id];
    case 'everyone':
      return state.players.map((p) => p.id);
    case 'everyoneElse':
      return state.players.filter((p) => p.id !== active.id).map((p) => p.id);
    case 'sameGender':
      // 'x' means unstated, so the rule cannot include anyone else.
      if (active.gender === 'x') return [active.id];
      return state.players.filter((p) => p.gender === active.gender).map((p) => p.id);
  }
}

export function updatePlayer(
  state: GameState,
  id: PlayerId,
  fn: (player: Player) => Player,
): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === id ? fn(p) : p)),
  };
}

export function pushLog(state: GameState, kind: LogKind, text: string): GameState {
  const seq = state.logSeq + 1;
  return { ...state, logSeq: seq, log: [...state.log, { seq, kind, text }] };
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/targets.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 10: Commit**

```bash
git add src/engine
git commit -m "feat(engine): state types, amount evaluator and target resolution"
```

---

## Task 7: Effect interpreter — deterministic effects

**Files:**
- Create: `src/engine/effects.ts`
- Test: `src/engine/__tests__/effects.test.ts`
- Create: `src/engine/__tests__/factories.ts`

**Interfaces:**
- Consumes: `resolveAmount` (Task 6), `resolveTarget`/`updatePlayer`/`pushLog`/`activePlayer` (Task 6), `getSquare`/`BOARD_ORIGINAL` (Task 5)
- Produces:
  - `applyEffect(state: GameState, effect: Effect): GameState`
  - `drainQueue(state: GameState): GameState`
  - `giveDrinks(state, playerId, drinks, fromId): GameState` — the single place drinks are added, so Porygon's reflect can hook it

This task handles the effects that need no randomness and no player input. Tasks 8 and 9 extend the same `applyEffect` switch.

- [ ] **Step 1: Write the test factories**

Create `src/engine/__tests__/factories.ts`:

```ts
import type { GameConfig, GameState, Player } from '../types';
import type { Gender, StarterId } from '../../data/types';

export const DEFAULT_CONFIG: GameConfig = {
  fullDrink: 10,
  trainerBattles: false,
  offTableChance: 0,
  maxMissedTurns: 6,
};

export function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: id.toUpperCase(),
    starter: 'bulbasaur' as StarterId,
    gender: 'x' as Gender,
    square: 0,
    drinks: 0,
    missedTurns: 0,
    extraTurns: 0,
    statuses: [],
    finishedAtTurn: null,
    ...overrides,
  };
}

/** A game in the `resolving` phase, ready for effects to be applied. */
export function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    boardId: 'original',
    config: DEFAULT_CONFIG,
    players: [makePlayer('a'), makePlayer('b'), makePlayer('c')],
    activeIndex: 0,
    seed: 12345,
    turnNumber: 1,
    phase: { name: 'resolving' },
    queue: [],
    vars: {},
    lastRoll: null,
    log: [],
    logSeq: 0,
    ...overrides,
  };
}
```

- [ ] **Step 2: Write the failing test**

Create `src/engine/__tests__/effects.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyEffect, drainQueue, giveDrinks } from '../effects';
import { makePlayer, makeState } from './factories';

describe('drink effect', () => {
  it('adds drinks to the active player', () => {
    const next = applyEffect(makeState(), { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 3 } });
    expect(next.players[0].drinks).toBe(3);
    expect(next.players[1].drinks).toBe(0);
  });

  it('adds drinks to everyone else without touching the active player', () => {
    const next = applyEffect(makeState(), { kind: 'drink', target: 'everyoneElse', amount: { kind: 'fixed', value: 1 } });
    expect(next.players.map((p) => p.drinks)).toEqual([0, 1, 1]);
  });

  it('resolves a full drink through config', () => {
    const next = applyEffect(makeState(), { kind: 'drink', target: 'self', amount: { kind: 'full' } });
    expect(next.players[0].drinks).toBe(10);
  });

  it('logs what happened', () => {
    const next = applyEffect(makeState(), { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } });
    expect(next.log.at(-1)!.text).toMatch(/A drinks 2/);
  });
});

describe('movement effects', () => {
  it('moveTo jumps to an absolute square', () => {
    const next = applyEffect(makeState(), { kind: 'moveTo', square: 28 });
    expect(next.players[0].square).toBe(28);
  });

  it('moveBy walks backwards and clamps at Start', () => {
    const state = makeState({ players: [makePlayer('a', { square: 4 })] });
    expect(applyEffect(state, { kind: 'moveBy', squares: -10 }).players[0].square).toBe(0);
  });

  it('moveBy clamps at the final square', () => {
    const state = makeState({ players: [makePlayer('a', { square: 60 })] });
    expect(applyEffect(state, { kind: 'moveBy', squares: 10 }).players[0].square).toBe(62);
  });
});

describe('turn effects', () => {
  it('extraTurn banks a turn for the active player', () => {
    expect(applyEffect(makeState(), { kind: 'extraTurn' }).players[0].extraTurns).toBe(1);
  });

  it('missTurn is capped by config.maxMissedTurns', () => {
    const state = makeState({ config: { ...makeState().config, maxMissedTurns: 4 } });
    const next = applyEffect(state, { kind: 'missTurn', amount: { kind: 'fixed', value: 6 } });
    expect(next.players[0].missedTurns).toBe(4);
  });
});

describe('status effects', () => {
  it('applies a status to the active player and records the square', () => {
    const state = makeState({ players: [makePlayer('a', { square: 8 })] });
    const next = applyEffect(state, { kind: 'applyStatus', target: 'self', status: 'zubats', expires: 'leaveSquare' });
    expect(next.players[0].statuses).toEqual([{ id: 'zubats', expires: 'leaveSquare', appliedOnSquare: 8 }]);
  });

  it('does not stack the same status twice', () => {
    let state = makeState();
    const effect = { kind: 'applyStatus', target: 'self', status: 'reflect', expires: 'leaveSquare' } as const;
    state = applyEffect(applyEffect(state, effect), effect);
    expect(state.players[0].statuses).toHaveLength(1);
  });
});

describe('setStarter effect', () => {
  it('swaps the active player token', () => {
    const next = applyEffect(makeState(), { kind: 'setStarter', starter: 'pikachu' });
    expect(next.players[0].starter).toBe('pikachu');
  });
});

describe('note effect', () => {
  it('parks the phase on a note so the UI can show it', () => {
    const next = applyEffect(makeState(), { kind: 'note', text: 'Do a waterfall' });
    expect(next.phase).toEqual({ name: 'note', text: 'Do a waterfall' });
  });
});

describe('giveDrinks with reflect', () => {
  it('rebounds 3x onto the giver when the receiver has Porygon reflect', () => {
    const state = makeState({
      players: [
        makePlayer('a'),
        makePlayer('b', { statuses: [{ id: 'reflect', expires: 'leaveSquare', appliedOnSquare: 35 }] }),
      ],
    });
    const next = giveDrinks(state, 'b', 2, 'a');
    expect(next.players[1].drinks).toBe(0);
    expect(next.players[0].drinks).toBe(6);
  });

  it('applies normally when the receiver has no reflect', () => {
    const next = giveDrinks(makeState(), 'b', 2, 'a');
    expect(next.players[1].drinks).toBe(2);
    expect(next.players[0].drinks).toBe(0);
  });
});

describe('drainQueue', () => {
  it('applies every queued effect in order', () => {
    const state = makeState({
      queue: [
        { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 1 } },
        { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } },
      ],
    });
    const next = drainQueue(state);
    expect(next.players[0].drinks).toBe(3);
    expect(next.queue).toHaveLength(0);
    expect(next.phase).toEqual({ name: 'turnEnd' });
  });

  it('stops and keeps the remaining queue when an effect parks the phase', () => {
    const state = makeState({
      queue: [
        { kind: 'note', text: 'pause here' },
        { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 5 } },
      ],
    });
    const next = drainQueue(state);
    expect(next.phase).toEqual({ name: 'note', text: 'pause here' });
    expect(next.queue).toHaveLength(1);
    expect(next.players[0].drinks).toBe(0);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/effects.test.ts`
Expected: FAIL — "Failed to resolve import '../effects'".

- [ ] **Step 4: Implement the interpreter**

Create `src/engine/effects.ts`:

```ts
import type { Effect } from '../data/types';
import { BOARD_ORIGINAL } from '../data/boards/original';
import { resolveAmount } from './amount';
import { activePlayer, pushLog, resolveTarget, updatePlayer } from './targets';
import type { GameState, PlayerId, ResolveCtx } from './types';

const LAST_SQUARE = BOARD_ORIGINAL.squares.length - 1;

function ctxOf(state: GameState): ResolveCtx {
  return { config: state.config, playerCount: state.players.length, vars: state.vars };
}

function nameOf(state: GameState, id: PlayerId): string {
  return state.players.find((p) => p.id === id)?.name ?? id;
}

/**
 * The single place drinks are added to a player. Porygon's `reflect` status
 * rebounds given drinks onto the giver at 3x, so every path that awards a
 * drink from one player to another must go through here.
 */
export function giveDrinks(
  state: GameState,
  toId: PlayerId,
  drinks: number,
  fromId: PlayerId | null,
): GameState {
  if (drinks <= 0) return state;
  const receiver = state.players.find((p) => p.id === toId);
  if (!receiver) throw new Error(`Unknown player ${toId}`);

  const reflects = receiver.statuses.some((s) => s.id === 'reflect');
  if (reflects && fromId && fromId !== toId) {
    const rebound = drinks * 3;
    const next = updatePlayer(state, fromId, (p) => ({ ...p, drinks: p.drinks + rebound }));
    return pushLog(
      next,
      'drink',
      `${nameOf(state, toId)} reflected it — ${nameOf(state, fromId)} drinks ${rebound}`,
    );
  }

  const next = updatePlayer(state, toId, (p) => ({ ...p, drinks: p.drinks + drinks }));
  return pushLog(next, 'drink', `${nameOf(state, toId)} drinks ${drinks}`);
}

function clampSquare(square: number): number {
  return Math.min(LAST_SQUARE, Math.max(0, square));
}

/**
 * Apply exactly one effect. Effects that need randomness (Task 8) or player
 * input (Task 9) extend this switch. An effect may park the phase — `drainQueue`
 * checks for that and stops.
 */
export function applyEffect(state: GameState, effect: Effect): GameState {
  switch (effect.kind) {
    case 'drink': {
      const amount = resolveAmount(effect.amount, ctxOf(state));
      const ids = resolveTarget(effect.target, state);
      return ids.reduce((acc, id) => giveDrinks(acc, id, amount, null), state);
    }

    case 'moveTo': {
      const active = activePlayer(state);
      const next = updatePlayer(state, active.id, (p) => ({ ...p, square: clampSquare(effect.square) }));
      return pushLog(next, 'move', `${active.name} moves to square ${clampSquare(effect.square)}`);
    }

    case 'moveBy': {
      const active = activePlayer(state);
      const target = clampSquare(active.square + effect.squares);
      const next = updatePlayer(state, active.id, (p) => ({ ...p, square: target }));
      const verb = effect.squares < 0 ? 'is dragged back' : 'advances';
      return pushLog(next, 'move', `${active.name} ${verb} to square ${target}`);
    }

    case 'extraTurn': {
      const active = activePlayer(state);
      const next = updatePlayer(state, active.id, (p) => ({ ...p, extraTurns: p.extraTurns + 1 }));
      return pushLog(next, 'turn', `${active.name} takes another turn`);
    }

    case 'missTurn': {
      const active = activePlayer(state);
      const raw = resolveAmount(effect.amount, ctxOf(state));
      const turns = Math.min(raw, state.config.maxMissedTurns);
      if (turns <= 0) return state;
      const next = updatePlayer(state, active.id, (p) => ({ ...p, missedTurns: p.missedTurns + turns }));
      return pushLog(next, 'turn', `${active.name} misses ${turns} turn${turns === 1 ? '' : 's'}`);
    }

    case 'applyStatus': {
      if (effect.target === 'chosen') return state; // handled in Task 9
      const ids = resolveTarget(effect.target, state);
      const square = activePlayer(state).square;
      return ids.reduce((acc, id) => {
        const player = acc.players.find((p) => p.id === id)!;
        if (player.statuses.some((s) => s.id === effect.status)) return acc;
        const withStatus = updatePlayer(acc, id, (p) => ({
          ...p,
          statuses: [...p.statuses, { id: effect.status, expires: effect.expires, appliedOnSquare: square }],
        }));
        return pushLog(withStatus, 'status', `${nameOf(acc, id)} is now ${effect.status}`);
      }, state);
    }

    case 'setStarter': {
      const active = activePlayer(state);
      const next = updatePlayer(state, active.id, (p) => ({ ...p, starter: effect.starter }));
      return pushLog(next, 'info', `${active.name}'s Pokémon is now ${effect.starter}`);
    }

    case 'note':
      return { ...state, phase: { name: 'note', text: effect.text } };

    default:
      // Randomness (Task 8) and prompt (Task 9) effects land here until implemented.
      throw new Error(`Unhandled effect kind: ${(effect as { kind: string }).kind}`);
  }
}

/**
 * Apply queued effects until the queue empties or an effect parks the phase
 * (a note or a prompt). Resuming is just calling this again once the phase is
 * set back to 'resolving'.
 */
export function drainQueue(state: GameState): GameState {
  let current = state;
  while (current.queue.length > 0 && current.phase.name === 'resolving') {
    const [head, ...rest] = current.queue;
    current = applyEffect({ ...current, queue: rest }, head);
  }
  if (current.queue.length === 0 && current.phase.name === 'resolving') {
    return { ...current, phase: { name: 'turnEnd' } };
  }
  return current;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/effects.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 6: Commit**

```bash
git add src/engine
git commit -m "feat(engine): deterministic effect interpreter and queue drain"
```

---

## Task 8: Effect interpreter — random effects

**Files:**
- Modify: `src/engine/effects.ts` (extend the `applyEffect` switch)
- Test: `src/engine/__tests__/effects.random.test.ts`

**Interfaces:**
- Consumes: `rollDie` (Task 2), `applyEffect`/`drainQueue` (Task 7)
- Produces: `applyEffect` now handles `roll`, `rollBranch`, `rollWhile`, `rollTimes`, `randomSquare`, `ifAnyPlayerHasStatus`. Also exports `matchesCond(face, cond): boolean`.

Randomness advances `state.seed` and binds results into `state.vars`, keeping the whole thing replayable from a seed.

- [ ] **Step 1: Write the failing test**

Create `src/engine/__tests__/effects.random.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyEffect, drainQueue, matchesCond } from '../effects';
import { makePlayer, makeState } from './factories';
import { nextInt, rollDie } from '../rng';
import { BOARD_ORIGINAL } from '../../data/boards/original';

/** Find a seed whose next die roll is exactly `face`. */
function seedFor(face: number): number {
  for (let seed = 1; seed < 100_000; seed++) {
    if (rollDie(seed)[0] === face) return seed;
  }
  throw new Error(`No seed produced face ${face}`);
}

/** Find a seed whose next Metronome pick is exactly `index`. */
function seedForSquare(index: number): number {
  const size = BOARD_ORIGINAL.squares.length;
  for (let seed = 1; seed < 100_000; seed++) {
    if (nextInt(seed, size)[0] === index) return seed;
  }
  throw new Error(`No seed produced square ${index}`);
}

describe('matchesCond', () => {
  it('matches explicit faces', () => {
    expect(matchesCond(3, { faces: [1, 2, 3] })).toBe(true);
    expect(matchesCond(4, { faces: [1, 2, 3] })).toBe(false);
  });

  it('matches parity', () => {
    expect(matchesCond(4, { parity: 'even' })).toBe(true);
    expect(matchesCond(4, { parity: 'odd' })).toBe(false);
  });
});

describe('roll effect', () => {
  it('binds the face to a variable and advances the seed', () => {
    const state = makeState({ seed: seedFor(5) });
    const next = applyEffect(state, { kind: 'roll', as: 'gary' });
    expect(next.vars.gary).toBe(5);
    expect(next.lastRoll).toBe(5);
    expect(next.seed).not.toBe(state.seed);
  });
});

describe('rollBranch effect', () => {
  it('splices the matching branch to the front of the queue', () => {
    const state = makeState({
      seed: seedFor(4),
      queue: [{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 99 } }],
    });
    const next = applyEffect(state, {
      kind: 'rollBranch',
      branches: [
        { when: { parity: 'even' }, effects: [{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 1 } }] },
        { when: { parity: 'odd' }, effects: [{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 7 } }] },
      ],
    });
    expect(next.queue).toHaveLength(2);
    expect(next.queue[0]).toEqual({ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 1 } });
  });

  it('binds the face when `as` is given, so branches can reference it', () => {
    const state = makeState({ seed: seedFor(2), phase: { name: 'resolving' } });
    const next = drainQueue({
      ...state,
      queue: [
        {
          kind: 'rollBranch',
          as: 'gio',
          branches: [
            { when: { faces: [1, 2, 3] }, effects: [{ kind: 'drink', target: 'self', amount: { kind: 'var', name: 'gio' } }] },
            { when: { faces: [4, 5, 6] }, effects: [] },
          ],
        },
      ],
    });
    expect(next.players[0].drinks).toBe(2);
  });

  it('throws when no branch matches, rather than silently doing nothing', () => {
    expect(() =>
      applyEffect(makeState(), { kind: 'rollBranch', branches: [{ when: { faces: [] }, effects: [] }] }),
    ).toThrow(/no branch/i);
  });
});

describe('rollWhile effect (Cinnabar Gym)', () => {
  it('counts consecutive evens and binds the total', () => {
    const state = makeState({ seed: seedFor(2) });
    const next = applyEffect(state, { kind: 'rollWhile', continueWhen: { parity: 'even' }, as: 'evens', max: 20 });
    expect(next.vars.evens).toBeGreaterThanOrEqual(1);
  });

  it('binds zero when the first roll already fails the condition', () => {
    const state = makeState({ seed: seedFor(3) });
    const next = applyEffect(state, { kind: 'rollWhile', continueWhen: { parity: 'even' }, as: 'evens', max: 20 });
    expect(next.vars.evens).toBe(0);
  });

  it('counts exactly the evens rolled before the first odd', () => {
    // Independently replay the seed stream: the bound count must equal the
    // number of even faces before the first odd one, with no off-by-one.
    for (let seed = 1; seed < 500; seed++) {
      let s = seed;
      let expected = 0;
      for (;;) {
        const [face, next] = rollDie(s);
        s = next;
        if (face % 2 !== 0) break;
        expected += 1;
      }
      const out = applyEffect(makeState({ seed }), {
        kind: 'rollWhile', continueWhen: { parity: 'even' }, as: 'evens', max: 20,
      });
      expect(out.vars.evens).toBe(expected);
      expect(out.seed).toBe(s);
    }
  });

  it('never exceeds max', () => {
    let state = makeState({ seed: 1 });
    for (let i = 0; i < 200; i++) {
      state = applyEffect({ ...state, seed: state.seed + i }, {
        kind: 'rollWhile', continueWhen: { parity: 'even' }, as: 'evens', max: 3,
      });
      expect(state.vars.evens).toBeLessThanOrEqual(3);
    }
  });
});

describe('rollTimes effect (Missingno)', () => {
  it('queues onFail effects when no roll succeeds', () => {
    // succeedOn an impossible face guarantees failure regardless of seed.
    const next = applyEffect(makeState(), {
      kind: 'rollTimes', times: 3, succeedOn: [],
      onSuccess: [{ kind: 'extraTurn' }],
      onFail: [{ kind: 'moveTo', square: 0 }],
    });
    expect(next.queue).toEqual([{ kind: 'moveTo', square: 0 }]);
  });

  it('queues onSuccess effects when any roll succeeds', () => {
    const next = applyEffect(makeState(), {
      kind: 'rollTimes', times: 3, succeedOn: [1, 2, 3, 4, 5, 6],
      onSuccess: [{ kind: 'extraTurn' }],
      onFail: [{ kind: 'moveTo', square: 0 }],
    });
    expect(next.queue).toEqual([{ kind: 'extraTurn' }]);
  });
});

describe('randomSquare effect (Clefairy)', () => {
  it('queues the effects of some other square', () => {
    const next = applyEffect(makeState(), { kind: 'randomSquare' });
    expect(next.log.at(-1)!.text).toMatch(/Metronome/i);
  });

  it('copies what the chosen square makes you drink', () => {
    // Square 52 (Fuchsia Gym) is a plain "drink 3", so the copy is unambiguous.
    const next = applyEffect(makeState({ seed: seedForSquare(52) }), { kind: 'randomSquare' });
    expect(next.queue).toEqual(BOARD_ORIGINAL.squares[52].effects);
  });

  it('keeps the roll that a copied amount depends on', () => {
    // Square 12 (Gary) binds `gary` and then spends it. Dropping the binder
    // would make resolveAmount throw on an unbound variable mid-turn.
    const state = applyEffect(makeState({ seed: seedForSquare(12) }), { kind: 'randomSquare' });
    expect(state.queue.map((e) => e.kind)).toEqual(['roll', 'drink', 'give']);
    expect(() => drainQueue(state)).not.toThrow();
  });

  it('drops movement, statuses and prompts rather than copying them', () => {
    // Square 25 (Haunter) only moves another player, so there is nothing to
    // drink or give and the legacy fallback applies.
    const next = applyEffect(makeState({ seed: seedForSquare(25) }), { kind: 'randomSquare' });
    expect(next.queue).toEqual([{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } }]);
  });

  it('never teleports the player by copying an Abra square', () => {
    const next = applyEffect(makeState({ seed: seedForSquare(11) }), { kind: 'randomSquare' });
    expect(JSON.stringify(next.queue)).not.toContain('moveTo');
  });

  it('falls back to drinking 2 when the chosen square has no effects', () => {
    // Square 0 (Start) is the only effect-less square, so pin the seed to it
    // rather than scanning for any queue that happens to contain a 2.
    const start = BOARD_ORIGINAL.squares[0];
    expect(start.effects).toHaveLength(0);
    const next = applyEffect(makeState({ seed: seedForSquare(0) }), { kind: 'randomSquare' });
    expect(next.queue).toEqual([{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } }]);
  });
});

describe('ifAnyPlayerHasStatus effect (Mysterious Ghost)', () => {
  const effect = {
    kind: 'ifAnyPlayerHasStatus',
    status: 'inSilphCo',
    then: [{ kind: 'drink', target: 'everyoneElse', amount: { kind: 'fixed', value: 1 } }],
    otherwise: [{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 3 } }],
  } as const;

  it('queues `then` when someone holds the status', () => {
    const state = makeState({
      players: [
        makePlayer('a'),
        makePlayer('b', { statuses: [{ id: 'inSilphCo', expires: 'leaveSquare', appliedOnSquare: 36 }] }),
      ],
    });
    expect(applyEffect(state, effect).queue).toEqual(effect.then);
  });

  it('queues `otherwise` when nobody does', () => {
    expect(applyEffect(makeState(), effect).queue).toEqual(effect.otherwise);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/effects.random.test.ts`
Expected: FAIL — `matchesCond` is not exported and the effects throw "Unhandled effect kind".

- [ ] **Step 3: Extend the interpreter**

In `src/engine/effects.ts`, add these imports at the top:

```ts
import type { BranchCond } from '../data/types';
import { nextInt, rollDie } from './rng';
import { getSquare } from '../data/boards/original';
```

Add these helpers above `applyEffect`. `copyableEffects`/`paysADrink` implement
the agreed Metronome rule: square 9 copies only what another square makes you
drink or give, never its movement, statuses or prompts, and pays 2 when the
copy would pay nothing. Roll binders are kept regardless, since dropping a
`roll` while keeping the `drink` that reads its variable throws at runtime.

```ts
/**
 * What Metronome copies from another square: what it makes you drink or give,
 * plus the rolls those amounts depend on. Movement, statuses, prompts, flavour
 * and a nested Metronome are dropped — square 9 promises only "drink or give
 * what it says". Dropping a `roll` while keeping the `drink` that reads its
 * variable would throw on an unbound var, so binders are always kept.
 */
function copyableEffects(effects: readonly Effect[]): Effect[] {
  const out: Effect[] = [];
  for (const effect of effects) {
    switch (effect.kind) {
      case 'drink':
      case 'give':
      case 'roll':
      case 'rollWhile':
        out.push(effect);
        break;
      case 'rollBranch':
        out.push({
          ...effect,
          branches: effect.branches.map((b) => ({ ...b, effects: copyableEffects(b.effects) })),
        });
        break;
      case 'rollTimes':
        out.push({
          ...effect,
          onSuccess: copyableEffects(effect.onSuccess),
          onFail: copyableEffects(effect.onFail),
        });
        break;
      case 'ifAnyPlayerHasStatus':
        out.push({
          ...effect,
          then: copyableEffects(effect.then),
          otherwise: copyableEffects(effect.otherwise),
        });
        break;
      default:
        break;
    }
  }
  return out;
}

/** Whether a copied tree can still make anyone drink, at any branch depth. */
function paysADrink(effects: readonly Effect[]): boolean {
  return effects.some((effect) => {
    switch (effect.kind) {
      case 'drink':
      case 'give':
        return true;
      case 'rollBranch':
        return effect.branches.some((b) => paysADrink(b.effects));
      case 'rollTimes':
        return paysADrink(effect.onSuccess) || paysADrink(effect.onFail);
      case 'ifAnyPlayerHasStatus':
        return paysADrink(effect.then) || paysADrink(effect.otherwise);
      default:
        return false;
    }
  });
}

export function matchesCond(face: number, cond: BranchCond): boolean {
  return 'faces' in cond ? cond.faces.includes(face) : (face % 2 === 0) === (cond.parity === 'even');
}
```

Then replace the `default:` clause of the `applyEffect` switch with these cases, keeping `default` last:

```ts
    case 'roll': {
      const [face, seed] = rollDie(state.seed);
      const next = { ...state, seed, lastRoll: face, vars: { ...state.vars, [effect.as]: face } };
      return pushLog(next, 'roll', `${activePlayer(state).name} rolled ${face}`);
    }

    case 'rollBranch': {
      const [face, seed] = rollDie(state.seed);
      const branch = effect.branches.find((b) => matchesCond(face, b.when));
      if (!branch) throw new Error(`Rolled ${face} but no branch matched`);
      const vars = effect.as ? { ...state.vars, [effect.as]: face } : state.vars;
      const next = {
        ...state,
        seed,
        lastRoll: face,
        vars,
        queue: [...branch.effects, ...state.queue],
      };
      return pushLog(next, 'roll', `${activePlayer(state).name} rolled ${face}`);
    }

    case 'rollWhile': {
      let seed = state.seed;
      let count = 0;
      let face = 0;
      while (count < effect.max) {
        [face, seed] = rollDie(seed);
        if (!matchesCond(face, effect.continueWhen)) break;
        count += 1;
      }
      const next = { ...state, seed, lastRoll: face, vars: { ...state.vars, [effect.as]: count } };
      return pushLog(next, 'roll', `${activePlayer(state).name} kept rolling — ${count} in a row`);
    }

    case 'rollTimes': {
      let seed = state.seed;
      let succeeded = false;
      const faces: number[] = [];
      for (let i = 0; i < effect.times; i++) {
        const [face, nextSeed] = rollDie(seed);
        seed = nextSeed;
        faces.push(face);
        if (effect.succeedOn.includes(face)) succeeded = true;
      }
      const chosen = succeeded ? effect.onSuccess : effect.onFail;
      const next = {
        ...state,
        seed,
        lastRoll: faces.at(-1) ?? state.lastRoll,
        queue: [...chosen, ...state.queue],
      };
      return pushLog(next, 'roll', `${activePlayer(state).name} rolled ${faces.join(', ')}`);
    }

    case 'randomSquare': {
      const [index, seed] = nextInt(state.seed, BOARD_ORIGINAL.squares.length);
      const square = getSquare(BOARD_ORIGINAL, index);
      // Metronome copies what the square makes you drink or give. A square that
      // pays nothing — flavour, movement, a status, or Start — falls back to
      // the legacy "if no drink is given or taken, just drink 2" rule.
      const copyable = copyableEffects(square.effects);
      const copied = paysADrink(copyable)
        ? copyable
        : ([{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } }] as const);
      const next = { ...state, seed, queue: [...copied, ...state.queue] };
      return pushLog(next, 'info', `Metronome copied square ${index}: ${square.text}`);
    }

    case 'ifAnyPlayerHasStatus': {
      const held = state.players.some((p) => p.statuses.some((s) => s.id === effect.status));
      const chosen = held ? effect.then : effect.otherwise;
      return { ...state, queue: [...chosen, ...state.queue] };
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/effects.random.test.ts`
Expected: PASS, 20 tests.

- [ ] **Step 5: Run the whole suite to check nothing regressed**

Run: `npm test`
Expected: PASS, all tests from Tasks 1-8.

- [ ] **Step 6: Commit**

```bash
git add src/engine
git commit -m "feat(engine): seeded random effects — branches, repeats, metronome"
```

---

## Task 9: Effect interpreter — prompts and player input

**Files:**
- Modify: `src/engine/effects.ts`
- Create: `src/engine/prompts.ts`
- Test: `src/engine/__tests__/prompts.test.ts`

**Interfaces:**
- Consumes: `applyEffect`/`drainQueue`/`giveDrinks` (Tasks 7-8)
- Produces:
  - `applyEffect` now handles `give`, `movePlayerBy`, `applyStatus` with `target: 'chosen'`, and `prompt`
  - `resolvePrompt(state: GameState, result: PromptResult): GameState` — validates the result, applies it, and returns the state with `phase` back to `resolving`

Every effect here parks the queue by setting `phase` to `{ name: 'prompt', prompt }`. The UI dispatches `RESOLVE_PROMPT`, `resolvePrompt` applies it, and `drainQueue` resumes.

- [ ] **Step 1: Write the failing test**

Create `src/engine/__tests__/prompts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyEffect, drainQueue } from '../effects';
import { resolvePrompt } from '../prompts';
import { makePlayer, makeState } from './factories';
import { rollDie } from '../rng';

/** Find a seed whose next die roll is exactly `face`. */
function seedFor(face: number): number {
  for (let seed = 1; seed < 100_000; seed++) {
    if (rollDie(seed)[0] === face) return seed;
  }
  throw new Error(`No seed produced face ${face}`);
}

describe('give effect', () => {
  it('parks on a givePlayers prompt with the resolved drink count', () => {
    const next = applyEffect(makeState(), {
      kind: 'give', amount: { kind: 'fixed', value: 1 }, players: { kind: 'fixed', value: 2 },
    });
    expect(next.phase).toEqual({ name: 'prompt', prompt: { id: 'givePlayers', drinks: 1, players: 2 } });
  });

  it('resolves players: "all" to every other player', () => {
    const next = applyEffect(makeState(), {
      kind: 'give', amount: { kind: 'fixed', value: 1 }, players: 'all',
    });
    expect(next.phase).toEqual({ name: 'prompt', prompt: { id: 'givePlayers', drinks: 1, players: 'all' } });
  });

  it('applies the assignments and returns to resolving', () => {
    let state = applyEffect(makeState(), {
      kind: 'give', amount: { kind: 'fixed', value: 2 }, players: { kind: 'fixed', value: 1 },
    });
    state = resolvePrompt(state, { id: 'givePlayers', assignments: [{ playerId: 'b', drinks: 2 }] });
    expect(state.players[1].drinks).toBe(2);
    expect(state.phase).toEqual({ name: 'resolving' });
  });

  it('routes given drinks through reflect', () => {
    let state = makeState({
      players: [
        makePlayer('a'),
        makePlayer('b', { statuses: [{ id: 'reflect', expires: 'leaveSquare', appliedOnSquare: 35 }] }),
      ],
    });
    state = applyEffect(state, { kind: 'give', amount: { kind: 'fixed', value: 1 }, players: { kind: 'fixed', value: 1 } });
    state = resolvePrompt(state, { id: 'givePlayers', assignments: [{ playerId: 'b', drinks: 1 }] });
    expect(state.players[0].drinks).toBe(3);
    expect(state.players[1].drinks).toBe(0);
  });

  it('rejects assignments that hand out more drinks than allowed', () => {
    const state = applyEffect(makeState(), {
      kind: 'give', amount: { kind: 'fixed', value: 1 }, players: { kind: 'fixed', value: 1 },
    });
    expect(() =>
      resolvePrompt(state, { id: 'givePlayers', assignments: [{ playerId: 'b', drinks: 5 }] }),
    ).toThrow(/more drinks than/i);
  });
});

describe('movePlayerBy effect (Haunter)', () => {
  it('parks on choosePlayer then moves the chosen player back', () => {
    let state = makeState({ players: [makePlayer('a', { square: 25 }), makePlayer('b', { square: 20 })] });
    state = applyEffect(state, { kind: 'movePlayerBy', squares: -10 });
    expect(state.phase).toEqual({ name: 'prompt', prompt: { id: 'choosePlayer', purpose: 'move', squares: -10 } });
    state = resolvePrompt(state, { id: 'choosePlayer', playerId: 'b' });
    expect(state.players[1].square).toBe(10);
    expect(state.phase).toEqual({ name: 'resolving' });
  });
});

describe('applyStatus to a chosen player (Lapras)', () => {
  it('parks then applies the status to the chosen player', () => {
    let state = applyEffect(makeState(), {
      kind: 'applyStatus', target: 'chosen', status: 'confuseRay', expires: 'afterNextTurn',
    });
    expect(state.phase.name).toBe('prompt');
    state = resolvePrompt(state, { id: 'choosePlayer', playerId: 'c' });
    expect(state.players[2].statuses[0].id).toBe('confuseRay');
  });
});

describe('question prompts', () => {
  it('Snorlax: singing costs nothing, refusing costs 4', () => {
    // resolvePrompt only queues the penalty; drainQueue is what applies it.
    const parked = applyEffect(makeState(), { kind: 'prompt', prompt: 'snorlaxSong' });
    expect(drainQueue(resolvePrompt(parked, { id: 'snorlaxSong', sang: true })).players[0].drinks).toBe(0);
    expect(drainQueue(resolvePrompt(parked, { id: 'snorlaxSong', sang: false })).players[0].drinks).toBe(4);
  });

  it('Koffing: smoking costs nothing, refusing costs 2', () => {
    const parked = applyEffect(makeState(), { kind: 'prompt', prompt: 'koffingSmoke' });
    expect(drainQueue(resolvePrompt(parked, { id: 'koffingSmoke', smoked: true })).players[0].drinks).toBe(0);
    expect(drainQueue(resolvePrompt(parked, { id: 'koffingSmoke', smoked: false })).players[0].drinks).toBe(2);
  });

  it('Evolution: evolving costs 4 and skips the next gym; stopping grants a turn', () => {
    const parked = applyEffect(makeState(), { kind: 'prompt', prompt: 'evolution' });
    const evolved = drainQueue(resolvePrompt(parked, { id: 'evolution', evolve: true }));
    expect(evolved.players[0].drinks).toBe(4);
    expect(evolved.players[0].statuses.map((s) => s.id)).toContain('skipNextGym');

    const stopped = drainQueue(resolvePrompt(parked, { id: 'evolution', evolve: false }));
    expect(stopped.players[0].extraTurns).toBe(1);
  });

  it('Saffron: guessing the roll grants an extra turn, missing costs 2', () => {
    const parked = applyEffect(makeState({ seed: 4242 }), { kind: 'prompt', prompt: 'saffronNumber' });
    const results = [1, 2, 3, 4, 5, 6].map((guess) =>
      drainQueue(resolvePrompt(parked, { id: 'saffronNumber', guess })),
    );
    const wins = results.filter((r) => r.players[0].extraTurns === 1);
    const losses = results.filter((r) => r.players[0].drinks === 2);
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(5);
  });

  it('Chugging contest: winner gets a turn, loser misses one', () => {
    const parked = applyEffect(makeState(), { kind: 'prompt', prompt: 'chuggingContest' });
    const next = drainQueue(resolvePrompt(parked, { id: 'chuggingContest', opponentId: 'b', winnerId: 'b' }));
    expect(next.players[1].extraTurns).toBe(1);
    expect(next.players[0].missedTurns).toBe(1);
  });

  it('Pokeball: favourite not on the board means drink 3', () => {
    const parked = applyEffect(makeState(), { kind: 'prompt', prompt: 'pokeballCatch' });
    const next = drainQueue(resolvePrompt(parked, { id: 'pokeballCatch', onBoard: false }));
    expect(next.players[0].drinks).toBe(3);
  });

  it('Pokeball: on the board, a 1-3 catches it free and a 4-6 costs 3', () => {
    const attempt = (seed: number) => {
      const parked = applyEffect(makeState({ seed }), { kind: 'prompt', prompt: 'pokeballCatch' });
      return drainQueue(resolvePrompt(parked, { id: 'pokeballCatch', onBoard: true }));
    };
    expect(attempt(seedFor(2)).players[0].drinks).toBe(0);
    expect(attempt(seedFor(5)).players[0].drinks).toBe(3);
  });

  it('rejects a result that does not match the pending prompt', () => {
    const parked = applyEffect(makeState(), { kind: 'prompt', prompt: 'snorlaxSong' });
    expect(() => resolvePrompt(parked, { id: 'koffingSmoke', smoked: true })).toThrow(/does not match/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/prompts.test.ts`
Expected: FAIL — "Failed to resolve import '../prompts'".

- [ ] **Step 3: Add the parking effects to the interpreter**

In `src/engine/effects.ts`, add these cases before `default:`:

```ts
    case 'give': {
      const drinks = resolveAmount(effect.amount, ctxOf(state));
      const players =
        effect.players === 'all' ? ('all' as const) : resolveAmount(effect.players, ctxOf(state));
      if (drinks <= 0 || players === 0) return state;
      return { ...state, phase: { name: 'prompt', prompt: { id: 'givePlayers', drinks, players } } };
    }

    case 'movePlayerBy':
      return {
        ...state,
        phase: { name: 'prompt', prompt: { id: 'choosePlayer', purpose: 'move', squares: effect.squares } },
      };

    case 'prompt':
      return { ...state, phase: { name: 'prompt', prompt: { id: effect.prompt } as Prompt } };
```

Change the existing `applyStatus` case's first line from returning `state` to parking:

```ts
      if (effect.target === 'chosen') {
        return {
          ...state,
          phase: {
            name: 'prompt',
            prompt: { id: 'choosePlayer', purpose: 'status', status: effect.status, expires: effect.expires },
          },
        };
      }
```

Add `Prompt` to the type import from `./types`.

- [ ] **Step 4: Implement prompt resolution**

Create `src/engine/prompts.ts`:

```ts
import type { Effect } from '../data/types';
import { giveDrinks } from './effects';
import { rollDie } from './rng';
import { activePlayer, pushLog, updatePlayer } from './targets';
import type { GameState, PromptResult } from './types';

function drink(value: number): Effect {
  return { kind: 'drink', target: 'self', amount: { kind: 'fixed', value } };
}

/** Put the queue back into motion after a prompt is answered. */
function resume(state: GameState, queued: readonly Effect[] = []): GameState {
  return { ...state, phase: { name: 'resolving' }, queue: [...queued, ...state.queue] };
}

/**
 * Apply a player's answer to the pending prompt. Throws if the answer does not
 * match what was asked — a mismatched result means a UI bug, and silently
 * ignoring it would desync a future multiplayer session.
 */
export function resolvePrompt(state: GameState, result: PromptResult): GameState {
  if (state.phase.name !== 'prompt') {
    throw new Error(`No prompt is pending (phase is ${state.phase.name})`);
  }
  const prompt = state.phase.prompt;
  if (prompt.id !== result.id) {
    throw new Error(`Result "${result.id}" does not match pending prompt "${prompt.id}"`);
  }
  const active = activePlayer(state);

  switch (result.id) {
    case 'givePlayers': {
      if (prompt.id !== 'givePlayers') throw new Error('Prompt shape mismatch');
      const total = result.assignments.reduce((sum, a) => sum + a.drinks, 0);
      const allowed =
        prompt.players === 'all'
          ? prompt.drinks * Math.max(0, state.players.length - 1)
          : prompt.drinks * prompt.players;
      if (total > allowed) {
        throw new Error(`Assigned ${total} drinks, more drinks than the allowed ${allowed}`);
      }
      const applied = result.assignments.reduce(
        (acc, a) => giveDrinks(acc, a.playerId, a.drinks, active.id),
        state,
      );
      return resume(applied);
    }

    case 'choosePlayer': {
      if (prompt.id !== 'choosePlayer') throw new Error('Prompt shape mismatch');
      const target = state.players.find((p) => p.id === result.playerId);
      if (!target) throw new Error(`Unknown player ${result.playerId}`);

      if (prompt.purpose === 'move') {
        const square = Math.min(62, Math.max(0, target.square + prompt.squares));
        const moved = updatePlayer(state, target.id, (p) => ({ ...p, square }));
        return resume(pushLog(moved, 'move', `${target.name} is moved to square ${square}`));
      }

      if (target.statuses.some((s) => s.id === prompt.status)) return resume(state);
      const withStatus = updatePlayer(state, target.id, (p) => ({
        ...p,
        statuses: [...p.statuses, { id: prompt.status, expires: prompt.expires, appliedOnSquare: target.square }],
      }));
      return resume(pushLog(withStatus, 'status', `${target.name} is now ${prompt.status}`));
    }

    case 'snorlaxSong':
      return resume(state, result.sang ? [] : [drink(4)]);

    case 'koffingSmoke':
      return resume(state, result.smoked ? [] : [drink(2)]);

    case 'evolution':
      return resume(
        state,
        result.evolve
          ? [drink(4), { kind: 'applyStatus', target: 'self', status: 'skipNextGym', expires: 'endOfGame' }]
          : [{ kind: 'extraTurn' }],
      );

    case 'saffronNumber': {
      const [face, seed] = rollDie(state.seed);
      const rolled = pushLog({ ...state, seed, lastRoll: face }, 'roll', `Psychic roll: ${face}`);
      return resume(rolled, result.guess === face ? [{ kind: 'extraTurn' }] : [drink(2)]);
    }

    case 'chuggingContest': {
      const loserId = result.winnerId === active.id ? result.opponentId : active.id;
      const withWin = updatePlayer(state, result.winnerId, (p) => ({ ...p, extraTurns: p.extraTurns + 1 }));
      const withLoss = updatePlayer(withWin, loserId, (p) => ({
        ...p,
        missedTurns: p.missedTurns + 1,
      }));
      return resume(pushLog(withLoss, 'turn', `Chug-off won by ${result.winnerId}`));
    }

    case 'pokeballCatch': {
      // Not on the board is a flat 3. On the board, you throw for it: 1-3
      // catches it, 4-6 and it got away.
      if (!result.onBoard) return resume(state, [drink(3)]);
      const [face, seed] = rollDie(state.seed);
      const rolled = pushLog({ ...state, seed, lastRoll: face }, 'roll', `Pokéball roll: ${face}`);
      return resume(rolled, face <= 3 ? [] : [drink(3)]);
    }
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/prompts.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 6: Commit**

```bash
git add src/engine
git commit -m "feat(engine): prompt-parking effects and prompt resolution"
```

---

## Task 10: Status lifecycle

**Files:**
- Create: `src/engine/statuses.ts`
- Test: `src/engine/__tests__/statuses.test.ts`

**Interfaces:**
- Consumes: `updatePlayer`/`pushLog` (Task 6)
- Produces:
  - `STATUS_META: Record<StatusId, { label: string; blurb: string }>`
  - `movementFor(player: Player, roll: number): number` — applies stringShot/doubleMove
  - `hasStatus(player: Player, id: StatusId): boolean`
  - `clearStatus(state, playerId, id): GameState`
  - `clearOnLeaveSquare(state, playerId, newSquare): GameState`
  - `expireAfterTurn(state, playerId): GameState`
  - `turnStartEffects(player: Player): Effect[]` — Silph Co / Safari Zone upkeep

- [ ] **Step 1: Write the failing test**

Create `src/engine/__tests__/statuses.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  STATUS_META, clearByRoll, clearOnLeaveSquare, clearStatus, expireAfterTurn,
  hasStatus, movementFor, rollToClearStatuses, turnStartEffects,
} from '../statuses';
import { makePlayer, makeState } from './factories';
import type { Status } from '../types';
import { BOARD_ORIGINAL, getSquare } from '../../data/boards/original';

const status = (id: Status['id'], expires: Status['expires'], square = 0): Status =>
  ({ id, expires, appliedOnSquare: square });

describe('STATUS_META', () => {
  it('describes every status the board can apply', () => {
    for (const id of ['zubats', 'confuseRay', 'stringShot', 'doubleMove', 'reflect',
      'possessed', 'skipNextGym', 'inSilphCo', 'inSafariZone', 'inTower', 'copying',
      'nonDominantHand', 'ruleMaker'] as const) {
      expect(STATUS_META[id].label.length).toBeGreaterThan(0);
    }
  });
});

describe('movementFor', () => {
  it('is the raw roll with no statuses', () => {
    expect(movementFor(makePlayer('a'), 4)).toBe(4);
  });

  it('halves and rounds up under String Shot', () => {
    const p = makePlayer('a', { statuses: [status('stringShot', 'afterNextTurn')] });
    expect(movementFor(p, 5)).toBe(3);
    expect(movementFor(p, 4)).toBe(2);
    expect(movementFor(p, 1)).toBe(1);
  });

  it('doubles on the bicycle', () => {
    const p = makePlayer('a', { statuses: [status('doubleMove', 'afterNextTurn')] });
    expect(movementFor(p, 3)).toBe(6);
  });

  it('doubles then halves when both apply, never dropping below 1', () => {
    const p = makePlayer('a', {
      statuses: [status('doubleMove', 'afterNextTurn'), status('stringShot', 'afterNextTurn')],
    });
    expect(movementFor(p, 3)).toBe(3);
    expect(movementFor(p, 1)).toBe(1);
  });
});

describe('clearOnLeaveSquare', () => {
  it('drops leaveSquare statuses once the player moves off', () => {
    const state = makeState({
      players: [makePlayer('a', { square: 36, statuses: [status('inSilphCo', 'leaveSquare', 36)] })],
    });
    expect(clearOnLeaveSquare(state, 'a', 37).players[0].statuses).toHaveLength(0);
  });

  it('keeps them while the player stays put', () => {
    const state = makeState({
      players: [makePlayer('a', { square: 36, statuses: [status('inSilphCo', 'leaveSquare', 36)] })],
    });
    expect(clearOnLeaveSquare(state, 'a', 36).players[0].statuses).toHaveLength(1);
  });

  it('never drops endOfGame statuses', () => {
    const state = makeState({
      players: [makePlayer('a', { square: 22, statuses: [status('nonDominantHand', 'endOfGame', 22)] })],
    });
    expect(clearOnLeaveSquare(state, 'a', 40).players[0].statuses).toHaveLength(1);
  });
});

describe('expireAfterTurn', () => {
  it('drops afterNextTurn statuses at the end of the turn', () => {
    const state = makeState({ players: [makePlayer('a', { statuses: [status('doubleMove', 'afterNextTurn')] })] });
    expect(expireAfterTurn(state, 'a').players[0].statuses).toHaveLength(0);
  });

  it('leaves leaveSquare statuses alone', () => {
    const state = makeState({ players: [makePlayer('a', { statuses: [status('reflect', 'leaveSquare')] })] });
    expect(expireAfterTurn(state, 'a').players[0].statuses).toHaveLength(1);
  });

  it('leaves rollToClear statuses alone — only a roll clears those', () => {
    const state = makeState({ players: [makePlayer('a', { statuses: [status('confuseRay', 'rollToClear')] })] });
    expect(expireAfterTurn(state, 'a').players[0].statuses).toHaveLength(1);
  });
});

describe('clearStatus and hasStatus', () => {
  it('removes one status by id', () => {
    const state = makeState({
      players: [makePlayer('a', { statuses: [status('zubats', 'leaveSquare'), status('reflect', 'leaveSquare')] })],
    });
    const next = clearStatus(state, 'a', 'zubats');
    expect(hasStatus(next.players[0], 'zubats')).toBe(false);
    expect(hasStatus(next.players[0], 'reflect')).toBe(true);
  });
});

describe('rollToClear statuses (Lapras Confuse Ray)', () => {
  const confused = makeState({
    players: [makePlayer('a', { statuses: [status('confuseRay', 'rollToClear', 38)] })],
  });

  it('lists the statuses that need a roll to shake off', () => {
    expect(rollToClearStatuses(confused.players[0]).map((s) => s.id)).toEqual(['confuseRay']);
    expect(rollToClearStatuses(makePlayer('b'))).toEqual([]);
  });

  it('clears Confuse Ray on a 1-3 and keeps it on a 4-6', () => {
    for (const roll of [1, 2, 3]) {
      expect(hasStatus(clearByRoll(confused, 'a', roll).players[0], 'confuseRay')).toBe(false);
    }
    for (const roll of [4, 5, 6]) {
      expect(hasStatus(clearByRoll(confused, 'a', roll).players[0], 'confuseRay')).toBe(true);
    }
  });

  it('leaves statuses that expire some other way untouched', () => {
    const state = makeState({ players: [makePlayer('a', { statuses: [status('doubleMove', 'afterNextTurn')] })] });
    expect(clearByRoll(state, 'a', 1).players[0].statuses).toHaveLength(1);
  });

  it('is how square 38 applies Confuse Ray', () => {
    expect(getSquare(BOARD_ORIGINAL, 38).effects).toEqual([
      { kind: 'applyStatus', target: 'chosen', status: 'confuseRay', expires: 'rollToClear' },
    ]);
    expect(STATUS_META.confuseRay.clearsOn).toEqual([1, 2, 3]);
  });
});

describe('turnStartEffects', () => {
  it('is empty for a player with no zone statuses', () => {
    expect(turnStartEffects(makePlayer('a'))).toEqual([]);
  });

  it('charges 2 drinks per turn inside Silph Co', () => {
    const p = makePlayer('a', { statuses: [status('inSilphCo', 'leaveSquare', 36)] });
    expect(turnStartEffects(p)).toEqual([
      { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } },
    ]);
  });

  it('rolls the Safari Zone table before the turn', () => {
    const p = makePlayer('a', { statuses: [status('inSafariZone', 'leaveSquare', 48)] });
    const effects = turnStartEffects(p);
    expect(effects).toHaveLength(1);
    expect(effects[0].kind).toBe('rollBranch');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/statuses.test.ts`
Expected: FAIL — "Failed to resolve import '../statuses'".

- [ ] **Step 3: Implement the status registry**

Create `src/engine/statuses.ts`:

```ts
import type { Effect, StatusId } from '../data/types';
import { updatePlayer } from './targets';
import type { GameState, Player, PlayerId, Status } from './types';

/**
 * `clearsOn` lists the die faces that shake a `rollToClear` status off. It is
 * only meaningful for statuses the board applies with that expiry.
 */
export const STATUS_META: Record<StatusId, {
  label: string;
  blurb: string;
  clearsOn?: readonly number[];
}> = {
  zubats: { label: 'Confused by Zubats', blurb: 'Roll 3 or more to escape this square.' },
  confuseRay: {
    label: 'Confused',
    blurb: 'Roll 1-3 to snap out of it, or lose the turn.',
    clearsOn: [1, 2, 3],
  },
  stringShot: { label: 'String Shot', blurb: 'Your next move is halved, rounded up.' },
  doubleMove: { label: 'On the bicycle', blurb: 'Your next move is doubled.' },
  reflect: { label: 'Tri Attack', blurb: 'Drinks given to you rebound on the giver at 3x.' },
  possessed: { label: 'Possessed', blurb: 'Anyone may make you fetch them a drink.' },
  skipNextGym: { label: 'Evolved', blurb: 'Walk straight past the next gold gym.' },
  inSilphCo: { label: 'Inside Silph Co.', blurb: 'Drink 2 at the start of every turn.' },
  inSafariZone: { label: 'In the Safari Zone', blurb: 'Roll the Safari table before each turn.' },
  inTower: { label: 'In the Pokémon Tower', blurb: 'No speaking. Each slip costs a drink.' },
  copying: { label: 'Transformed', blurb: 'Copy everything the next player does.' },
  nonDominantHand: { label: 'Sand-Attack', blurb: 'Drink with your non-dominant hand.' },
  ruleMaker: { label: 'Rule maker', blurb: 'You set a house rule. Violations cost a drink.' },
};

export function hasStatus(player: Player, id: StatusId): boolean {
  return player.statuses.some((s) => s.id === id);
}

/** Apply movement modifiers. Bicycle doubles first, then String Shot halves. */
export function movementFor(player: Player, roll: number): number {
  let steps = roll;
  if (hasStatus(player, 'doubleMove')) steps *= 2;
  if (hasStatus(player, 'stringShot')) steps = Math.ceil(steps / 2);
  return Math.max(1, steps);
}

export function clearStatus(state: GameState, playerId: PlayerId, id: StatusId): GameState {
  return updatePlayer(state, playerId, (p) => ({
    ...p,
    statuses: p.statuses.filter((s) => s.id !== id),
  }));
}

/** Drop zone statuses once the holder has actually left the square that applied them. */
export function clearOnLeaveSquare(
  state: GameState,
  playerId: PlayerId,
  newSquare: number,
): GameState {
  return updatePlayer(state, playerId, (p) => ({
    ...p,
    statuses: p.statuses.filter((s) => s.expires !== 'leaveSquare' || s.appliedOnSquare === newSquare),
  }));
}

export function expireAfterTurn(state: GameState, playerId: PlayerId): GameState {
  return updatePlayer(state, playerId, (p) => ({
    ...p,
    statuses: p.statuses.filter((s) => s.expires !== 'afterNextTurn' && s.expires !== 'nextTurnStart'),
  }));
}

/**
 * Statuses that no clock removes — the holder has to roll them off. The turn
 * machine rolls once for these before the turn proper, and a holder still
 * carrying one afterwards loses the turn.
 */
export function rollToClearStatuses(player: Player): readonly Status[] {
  return player.statuses.filter((s) => s.expires === 'rollToClear');
}

/** Remove every `rollToClear` status whose `clearsOn` contains this face. */
export function clearByRoll(state: GameState, playerId: PlayerId, roll: number): GameState {
  return updatePlayer(state, playerId, (p) => ({
    ...p,
    statuses: p.statuses.filter(
      (s) => s.expires !== 'rollToClear' || !(STATUS_META[s.id].clearsOn ?? []).includes(roll),
    ),
  }));
}

/** Upkeep charged before a player rolls, driven by which zone they are standing in. */
export function turnStartEffects(player: Player): Effect[] {
  const effects: Effect[] = [];

  if (hasStatus(player, 'inSilphCo')) {
    effects.push({ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } });
  }

  if (hasStatus(player, 'inSafariZone')) {
    effects.push({
      kind: 'rollBranch',
      branches: [
        {
          when: { faces: [1, 2] },
          effects: [{ kind: 'give', amount: { kind: 'fixed', value: 1 }, players: { kind: 'fixed', value: 1 } }],
        },
        {
          when: { faces: [3, 4] },
          effects: [
            { kind: 'missTurn', amount: { kind: 'fixed', value: 1 } },
            { kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 4 } },
          ],
        },
        {
          when: { faces: [5, 6] },
          effects: [{ kind: 'drink', target: 'self', amount: { kind: 'fixed', value: 2 } }],
        },
      ],
    });
  }

  return effects;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/statuses.test.ts`
Expected: PASS, 19 tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine
git commit -m "feat(engine): status registry, movement modifiers and zone upkeep"
```

---

## Task 11: Turn machine and reducer

**Files:**
- Modify: `src/engine/types.ts` (add `queueExit`)
- Modify: `src/engine/effects.ts` (`drainQueue` honours `queueExit`)
- Modify: `src/engine/__tests__/factories.ts` (add `queueExit`)
- Create: `src/engine/turn.ts`, `src/engine/reducer.ts`
- Test: `src/engine/__tests__/turn.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 6-10
- Produces:
  - `reduce(state: GameState, action: Action): GameState` — the only entry point the UI uses
  - `beginTurn(state): GameState`, `advanceTurn(state): GameState` from `turn.ts`

- [ ] **Step 1: Add `queueExit` to the state**

The queue is drained both for square effects (which end the turn) and for turn-start upkeep (which must land back on `idle` so the player can roll). Storing the exit phase keeps that serializable across a prompt pause.

In `src/engine/types.ts`, add to `GameState` after `queue`:

```ts
  /** Phase to enter when the queue empties. Turn-start upkeep exits to 'idle'. */
  readonly queueExit: 'idle' | 'turnEnd';
```

In `src/engine/__tests__/factories.ts`, add to `makeState`'s defaults after `queue: []`:

```ts
    queueExit: 'turnEnd',
```

In `src/engine/effects.ts`, replace the tail of `drainQueue`:

```ts
  if (current.queue.length === 0 && current.phase.name === 'resolving') {
    return { ...current, phase: { name: current.queueExit } };
  }
  return current;
```

- [ ] **Step 2: Write the failing test**

Create `src/engine/__tests__/turn.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../reducer';
import { makePlayer, makeState } from './factories';
import { rollDie } from '../rng';
import type { GameState } from '../types';

function seedFor(face: number): number {
  for (let seed = 1; seed < 100_000; seed++) if (rollDie(seed)[0] === face) return seed;
  throw new Error(`No seed produced face ${face}`);
}

/** Roll, watch the dice, then walk the token all the way to its square. */
function rollAndWalk(state: GameState): GameState {
  let s = reduce(reduce(state, { type: 'ROLL' }), { type: 'DICE_SHOWN' });
  let guard = 0;
  while (s.phase.name === 'moving') {
    s = reduce(s, { type: 'STEP_DONE' });
    if (++guard > 100) throw new Error('Movement did not terminate');
  }
  return s;
}

describe('rolling', () => {
  it('goes idle -> rolling -> moving -> landed', () => {
    const state = makeState({ seed: seedFor(3), phase: { name: 'idle' } });
    const rolling = reduce(state, { type: 'ROLL' });
    expect(rolling.phase).toMatchObject({ name: 'rolling', face: 3 });

    const moving = reduce(rolling, { type: 'DICE_SHOWN' });
    expect(moving.phase).toEqual({ name: 'moving', remaining: 3 });

    const landed = rollAndWalk(state);
    expect(landed.phase).toEqual({ name: 'landed' });
    expect(landed.players[0].square).toBe(3);
  });

  it('ignores ROLL outside the idle phase', () => {
    const state = makeState({ phase: { name: 'landed' } });
    expect(reduce(state, { type: 'ROLL' })).toBe(state);
  });

  it('halves movement under String Shot', () => {
    const state = makeState({
      seed: seedFor(5),
      phase: { name: 'idle' },
      players: [makePlayer('a', { statuses: [{ id: 'stringShot', expires: 'afterNextTurn', appliedOnSquare: 3 }] })],
    });
    expect(rollAndWalk(state).players[0].square).toBe(3);
  });
});

describe('gold gyms', () => {
  it('stops a player who would pass straight through', () => {
    const state = makeState({
      seed: seedFor(5),
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 3 })],
    });
    // Square 6 is Pewter Gym; a 5 from square 3 would reach 8.
    expect(rollAndWalk(state).players[0].square).toBe(6);
  });

  it('lets an evolved player walk past and consumes the status', () => {
    const state = makeState({
      seed: seedFor(5),
      phase: { name: 'idle' },
      players: [makePlayer('a', {
        square: 3,
        statuses: [{ id: 'skipNextGym', expires: 'endOfGame', appliedOnSquare: 34 }],
      })],
    });
    const landed = rollAndWalk(state);
    expect(landed.players[0].square).toBe(8);
    expect(landed.players[0].statuses).toHaveLength(0);
  });
});

describe('zubats', () => {
  it('pins the player and costs a drink on a roll of 1 or 2', () => {
    const state = makeState({
      seed: seedFor(2),
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 8, statuses: [{ id: 'zubats', expires: 'leaveSquare', appliedOnSquare: 8 }] })],
    });
    const landed = rollAndWalk(state);
    expect(landed.players[0].square).toBe(8);
    expect(landed.players[0].drinks).toBe(1);
  });

  it('lets the player leave on a roll of 3 or more', () => {
    const state = makeState({
      seed: seedFor(4),
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 8, statuses: [{ id: 'zubats', expires: 'leaveSquare', appliedOnSquare: 8 }] })],
    });
    const landed = rollAndWalk(state);
    expect(landed.players[0].square).toBe(12);
    expect(landed.players[0].statuses).toHaveLength(0);
  });
});

describe('confuse ray', () => {
  const confused = (seed: number) => makeState({
    seed,
    phase: { name: 'idle' },
    players: [makePlayer('a', { square: 20, statuses: [{ id: 'confuseRay', expires: 'rollToClear', appliedOnSquare: 38 }] })],
  });

  it('costs the turn and keeps the status on a 4-6', () => {
    const landed = rollAndWalk(confused(seedFor(5)));
    expect(landed.players[0].square).toBe(20);
    expect(landed.players[0].statuses.map((s) => s.id)).toEqual(['confuseRay']);
    expect(landed.phase).toEqual({ name: 'turnEnd' });
  });

  it('clears on a 1-3 and the player moves that many squares', () => {
    const landed = rollAndWalk(confused(seedFor(3)));
    expect(landed.players[0].statuses).toHaveLength(0);
    expect(landed.players[0].square).toBe(23);
  });
});

describe('resolving and ending a turn', () => {
  it('queues the landed square effects on DISMISS_SQUARE', () => {
    // Square 50 is Tauros: drink 2, no prompts.
    let state = makeState({ phase: { name: 'landed' }, players: [makePlayer('a', { square: 50 }), makePlayer('b')] });
    state = reduce(state, { type: 'DISMISS_SQUARE' });
    expect(state.players[0].drinks).toBe(2);
    expect(state.phase).toEqual({ name: 'turnEnd' });
  });

  it('passes the turn to the next player on END_TURN', () => {
    const state = makeState({ phase: { name: 'turnEnd' } });
    expect(reduce(state, { type: 'END_TURN' }).activeIndex).toBe(1);
  });

  it('keeps the turn with a player who banked an extra turn', () => {
    const state = makeState({
      phase: { name: 'turnEnd' },
      players: [makePlayer('a', { extraTurns: 1 }), makePlayer('b')],
    });
    const next = reduce(state, { type: 'END_TURN' });
    expect(next.activeIndex).toBe(0);
    expect(next.players[0].extraTurns).toBe(0);
    expect(next.phase).toEqual({ name: 'idle' });
  });

  it('skips a player who owes missed turns and decrements the debt', () => {
    const state = makeState({
      phase: { name: 'turnEnd' },
      players: [makePlayer('a'), makePlayer('b', { missedTurns: 2 }), makePlayer('c')],
    });
    const next = reduce(state, { type: 'END_TURN' });
    expect(next.activeIndex).toBe(2);
    expect(next.players[1].missedTurns).toBe(1);
  });

  it('charges Silph Co upkeep before the next player can roll', () => {
    const state = makeState({
      phase: { name: 'turnEnd' },
      players: [
        makePlayer('a'),
        makePlayer('b', { square: 36, statuses: [{ id: 'inSilphCo', expires: 'leaveSquare', appliedOnSquare: 36 }] }),
      ],
    });
    const next = reduce(state, { type: 'END_TURN' });
    expect(next.players[1].drinks).toBe(2);
    expect(next.phase).toEqual({ name: 'idle' });
  });

  it('clears per-turn statuses when the turn passes', () => {
    const state = makeState({
      phase: { name: 'turnEnd' },
      players: [makePlayer('a', { statuses: [{ id: 'doubleMove', expires: 'afterNextTurn', appliedOnSquare: 20 }] }), makePlayer('b')],
    });
    expect(reduce(state, { type: 'END_TURN' }).players[0].statuses).toHaveLength(0);
  });
});

describe('winning', () => {
  it('ends the game when a player reaches the final square', () => {
    const state = makeState({
      seed: seedFor(2),
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 61 }), makePlayer('b')],
    });
    let s = rollAndWalk(state);
    s = reduce(s, { type: 'DISMISS_SQUARE' });
    while (s.phase.name === 'prompt') {
      s = reduce(s, { type: 'RESOLVE_PROMPT', result: { id: 'givePlayers', assignments: [] } });
    }
    s = reduce(s, { type: 'END_TURN' });
    expect(s.phase).toEqual({ name: 'gameOver' });
    expect(s.players[0].finishedAtTurn).not.toBeNull();
  });
});

describe('notes', () => {
  it('parks on a note and resumes on ACK_NOTE', () => {
    // Square 21 is Magikarp Splash: a single note.
    let state = makeState({ phase: { name: 'landed' }, players: [makePlayer('a', { square: 21 })] });
    state = reduce(state, { type: 'DISMISS_SQUARE' });
    expect(state.phase.name).toBe('note');
    state = reduce(state, { type: 'ACK_NOTE' });
    expect(state.phase).toEqual({ name: 'turnEnd' });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/turn.test.ts`
Expected: FAIL — "Failed to resolve import '../reducer'".

- [ ] **Step 4: Implement the turn helpers**

Create `src/engine/turn.ts`:

```ts
import { BOARD_ORIGINAL, getSquare } from '../data/boards/original';
import { drainQueue } from './effects';
import { clearOnLeaveSquare, clearStatus, expireAfterTurn, hasStatus, turnStartEffects } from './statuses';
import { activePlayer, pushLog, updatePlayer } from './targets';
import type { GameState } from './types';

export const LAST_SQUARE = BOARD_ORIGINAL.squares.length - 1;

/**
 * Move the active token exactly one square. Returns the state plus whether
 * movement should stop here — gold gyms are mandatory stops unless the player
 * evolved and banked a `skipNextGym`.
 */
export function stepOnce(state: GameState): { state: GameState; stop: boolean } {
  const active = activePlayer(state);
  const target = Math.min(LAST_SQUARE, active.square + 1);

  let next = updatePlayer(state, active.id, (p) => ({ ...p, square: target }));
  next = clearOnLeaveSquare(next, active.id, target);

  if (target === LAST_SQUARE) return { state: next, stop: true };

  const square = getSquare(BOARD_ORIGINAL, target);
  if (square.kind === 'goldGym') {
    if (hasStatus(active, 'skipNextGym')) {
      const past = clearStatus(next, active.id, 'skipNextGym');
      return {
        state: pushLog(past, 'move', `${active.name} evolved past ${square.text}`),
        stop: false,
      };
    }
    return { state: next, stop: true };
  }

  return { state: next, stop: false };
}

/**
 * Set up the player whose turn it now is: run zone upkeep, then hand control
 * back with phase 'idle' so they can roll.
 */
export function beginTurn(state: GameState): GameState {
  const active = activePlayer(state);
  const upkeep = turnStartEffects(active);

  const fresh: GameState = {
    ...state,
    vars: {},
    lastRoll: null,
    queue: upkeep,
    queueExit: 'idle',
    phase: upkeep.length > 0 ? { name: 'resolving' } : { name: 'idle' },
  };

  const logged = pushLog(fresh, 'turn', `${active.name}'s turn`);
  return upkeep.length > 0 ? drainQueue(logged) : logged;
}

/**
 * Hand the turn on. A banked extra turn keeps it with the current player;
 * otherwise seats advance, skipping anyone who owes missed turns.
 */
export function advanceTurn(state: GameState): GameState {
  const active = activePlayer(state);

  if (state.players.some((p) => p.finishedAtTurn !== null)) {
    return { ...state, phase: { name: 'gameOver' } };
  }

  let next = expireAfterTurn(state, active.id);

  if (active.extraTurns > 0) {
    next = updatePlayer(next, active.id, (p) => ({ ...p, extraTurns: p.extraTurns - 1 }));
    return beginTurn({ ...next, turnNumber: next.turnNumber + 1 });
  }

  let index = state.activeIndex;
  for (let hop = 0; hop < next.players.length; hop++) {
    index = (index + 1) % next.players.length;
    const candidate = next.players[index];
    if (candidate.missedTurns > 0) {
      next = updatePlayer(next, candidate.id, (p) => ({ ...p, missedTurns: p.missedTurns - 1 }));
      next = pushLog(next, 'turn', `${candidate.name} misses this turn`);
      continue;
    }
    return beginTurn({ ...next, activeIndex: index, turnNumber: next.turnNumber + 1 });
  }

  // Everyone owed a missed turn; play returns to whoever is up next anyway.
  return beginTurn({ ...next, activeIndex: index, turnNumber: next.turnNumber + 1 });
}
```

- [ ] **Step 5: Implement the reducer**

Create `src/engine/reducer.ts`:

```ts
import { BOARD_ORIGINAL, getSquare } from '../data/boards/original';
import { drainQueue, giveDrinks } from './effects';
import { resolvePrompt } from './prompts';
import { rollDie, rollPercent } from './rng';
import { clearByRoll, clearStatus, hasStatus, movementFor, rollToClearStatuses } from './statuses';
import { activePlayer, pushLog, updatePlayer } from './targets';
import { advanceTurn, LAST_SQUARE, stepOnce } from './turn';
import type { Action, GameState } from './types';

/** A player pinned in place this turn: the roll happened, the move does not. */
function pinnedInPlace(state: GameState, face: number, offTable: boolean): GameState {
  return { ...state, phase: { name: 'rolling', face, offTable }, queue: [], queueExit: 'turnEnd' };
}

/**
 * The single entry point for every state change. Pure and total: an action
 * that does not apply in the current phase returns the state unchanged.
 */
export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'ROLL': {
      if (state.phase.name !== 'idle') return state;
      const active = activePlayer(state);

      const [face, afterDie] = rollDie(state.seed);
      const [chance, afterChance] = rollPercent(afterDie);
      const offTable = chance < state.config.offTableChance;

      let next: GameState = { ...state, seed: afterChance, lastRoll: face };
      next = pushLog(next, 'roll', `${active.name} rolled ${face}`);

      if (offTable) {
        next = giveDrinks(next, active.id, next.config.fullDrink, null);
        next = pushLog(next, 'info', `${active.name} knocked the die off the table!`);
      }

      // Confuse Ray: this same roll is the attempt to shake it off. Fail and
      // the turn is spent; succeed and the roll still moves you.
      if (rollToClearStatuses(active).length > 0) {
        next = clearByRoll(next, active.id, face);
        if (rollToClearStatuses(activePlayer(next)).length > 0) {
          next = pushLog(next, 'status', `${active.name} is still confused and loses the turn`);
          return pinnedInPlace(next, face, offTable);
        }
        next = pushLog(next, 'status', `${active.name} snapped out of it`);
      }

      // Zubats pins you here on a 1 or 2, and costs a drink.
      if (hasStatus(active, 'zubats')) {
        if (face <= 2) {
          next = giveDrinks(next, active.id, 1, null);
          next = pushLog(next, 'info', `${active.name} is still swarmed by Zubats`);
          return pinnedInPlace(next, face, offTable);
        }
        next = clearStatus(next, active.id, 'zubats');
      }

      return { ...next, phase: { name: 'rolling', face, offTable } };
    }

    case 'DICE_SHOWN': {
      if (state.phase.name !== 'rolling') return state;
      const active = activePlayer(state);
      // A pinned player — swarmed or still confused — already had their turn
      // resolved during ROLL.
      if (hasStatus(active, 'zubats') || rollToClearStatuses(active).length > 0) {
        return { ...state, phase: { name: 'turnEnd' } };
      }
      const steps = movementFor(active, state.phase.face);
      return { ...state, phase: { name: 'moving', remaining: steps } };
    }

    case 'STEP_DONE': {
      if (state.phase.name !== 'moving') return state;
      const { state: moved, stop } = stepOnce(state);
      const remaining = state.phase.remaining - 1;
      const done = stop || remaining <= 0 || activePlayer(moved).square === LAST_SQUARE;
      return { ...moved, phase: done ? { name: 'landed' } : { name: 'moving', remaining } };
    }

    case 'DISMISS_SQUARE': {
      if (state.phase.name !== 'landed') return state;
      const active = activePlayer(state);

      if (active.square === LAST_SQUARE) {
        const finished = updatePlayer(state, active.id, (p) => ({ ...p, finishedAtTurn: state.turnNumber }));
        return pushLog(finished, 'info', `${active.name} finished the board!`);
      }

      const square = getSquare(BOARD_ORIGINAL, active.square);
      return drainQueue({
        ...state,
        queue: [...square.effects],
        queueExit: 'turnEnd',
        phase: { name: 'resolving' },
      });
    }

    case 'ACK_NOTE': {
      if (state.phase.name !== 'note') return state;
      return drainQueue({ ...state, phase: { name: 'resolving' } });
    }

    case 'ACK_BATTLE': {
      if (state.phase.name !== 'battle') return state;
      return drainQueue({ ...state, phase: { name: 'resolving' } });
    }

    case 'RESOLVE_PROMPT': {
      if (state.phase.name !== 'prompt') return state;
      return drainQueue(resolvePrompt(state, action.result));
    }

    case 'END_TURN': {
      if (state.phase.name !== 'turnEnd' && state.phase.name !== 'landed') return state;
      return advanceTurn(state);
    }
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/turn.test.ts`
Expected: PASS, 17 tests.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS, everything from Tasks 1-11.

- [ ] **Step 8: Commit**

```bash
git add src/engine
git commit -m "feat(engine): turn machine and reducer"
```

---

## Task 12: Trainer battles

**Files:**
- Modify: `src/engine/reducer.ts`
- Test: `src/engine/__tests__/battle.test.ts`

**Interfaces:**
- Consumes: `reduce` (Task 11)
- Produces: `STEP_DONE` now parks on `{ name: 'battle', opponentId, rolls }` when the active player lands on an occupied square and `config.trainerBattles` is on. `ACK_BATTLE` applies the result and hands back to the normal `landed` flow, so the square card still shows.

Rule: both trainers roll, the lower roll drinks the difference. A tie is a no-op.

- [ ] **Step 1: Write the failing test**

Create `src/engine/__tests__/battle.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../reducer';
import { makePlayer, makeState } from './factories';
import type { GameState } from '../types';

function walkTo(state: GameState): GameState {
  let s = reduce(reduce(state, { type: 'ROLL' }), { type: 'DICE_SHOWN' });
  let guard = 0;
  while (s.phase.name === 'moving') {
    s = reduce(s, { type: 'STEP_DONE' });
    if (++guard > 100) throw new Error('Movement did not terminate');
  }
  return s;
}

const battleConfig = { fullDrink: 10, trainerBattles: true, offTableChance: 0, maxMissedTurns: 6 };

describe('trainer battles', () => {
  it('starts a battle when landing on an occupied square', () => {
    const state = makeState({
      config: battleConfig,
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 0 }), makePlayer('b', { square: 1 })],
    });
    let seen = false;
    for (let seed = 1; seed < 200 && !seen; seed++) {
      const landed = walkTo({ ...state, seed });
      if (landed.players[0].square === landed.players[1].square) {
        expect(landed.phase.name).toBe('battle');
        seen = true;
      }
    }
    expect(seen).toBe(true);
  });

  it('makes the lower roller drink the difference', () => {
    const state = makeState({
      config: battleConfig,
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 0 }), makePlayer('b', { square: 1 })],
    });
    for (let seed = 1; seed < 500; seed++) {
      const landed = walkTo({ ...state, seed });
      if (landed.phase.name !== 'battle') continue;
      const [mine, theirs] = landed.phase.rolls;
      const before = landed.players.map((p) => p.drinks);
      const after = reduce(landed, { type: 'ACK_BATTLE' }).players.map((p) => p.drinks);
      const diff = Math.abs(mine - theirs);
      if (mine > theirs) expect(after[1] - before[1]).toBe(diff);
      else if (theirs > mine) expect(after[0] - before[0]).toBe(diff);
      else expect(after).toEqual(before);
      return;
    }
    throw new Error('No battle occurred across 500 seeds');
  });

  it('never battles when the config disables it', () => {
    const state = makeState({
      config: { ...battleConfig, trainerBattles: false },
      phase: { name: 'idle' },
      players: [makePlayer('a', { square: 0 }), makePlayer('b', { square: 1 })],
    });
    for (let seed = 1; seed < 200; seed++) {
      expect(walkTo({ ...state, seed }).phase.name).not.toBe('battle');
    }
  });

  it('never battles on the Start square, where everyone begins', () => {
    const state = makeState({
      config: battleConfig,
      phase: { name: 'moving', remaining: 1 },
      players: [makePlayer('a', { square: 62 }), makePlayer('b', { square: 0 })],
    });
    expect(reduce(state, { type: 'STEP_DONE' }).phase.name).not.toBe('battle');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/battle.test.ts`
Expected: FAIL — the phase is `landed`, never `battle`.

- [ ] **Step 3: Add the battle check to `STEP_DONE`**

In `src/engine/reducer.ts`, replace the `STEP_DONE` case:

```ts
    case 'STEP_DONE': {
      if (state.phase.name !== 'moving') return state;
      const { state: moved, stop } = stepOnce(state);
      const remaining = state.phase.remaining - 1;
      const active = activePlayer(moved);
      const done = stop || remaining <= 0 || active.square === LAST_SQUARE;
      if (!done) return { ...moved, phase: { name: 'moving', remaining } };

      const opponent = moved.players.find(
        (p) => p.id !== active.id && p.square === active.square && p.finishedAtTurn === null,
      );
      // Start is where everyone begins, so it is never contested.
      if (moved.config.trainerBattles && opponent && active.square !== 0) {
        const [mine, afterMine] = rollDie(moved.seed);
        const [theirs, afterTheirs] = rollDie(afterMine);
        const withRolls = pushLog(
          { ...moved, seed: afterTheirs },
          'info',
          `Trainer battle! ${active.name} rolled ${mine}, ${opponent.name} rolled ${theirs}`,
        );
        return { ...withRolls, phase: { name: 'battle', opponentId: opponent.id, rolls: [mine, theirs] } };
      }

      return { ...moved, phase: { name: 'landed' } };
    }
```

- [ ] **Step 4: Apply the battle result on `ACK_BATTLE`**

Replace the `ACK_BATTLE` case:

```ts
    case 'ACK_BATTLE': {
      if (state.phase.name !== 'battle') return state;
      const { opponentId, rolls } = state.phase;
      const [mine, theirs] = rolls;
      const active = activePlayer(state);
      const diff = Math.abs(mine - theirs);

      let next = state;
      if (diff > 0) {
        const loserId = mine > theirs ? opponentId : active.id;
        next = giveDrinks(next, loserId, diff, null);
      }
      // The square's own rule still applies, so fall through to the normal
      // landed flow rather than resolving here — the player still needs to see
      // the square card.
      return { ...next, phase: { name: 'landed' } };
    }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/battle.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add src/engine
git commit -m "feat(engine): optional trainer battles on contested squares"
```

---

## Task 13: Game setup and full-game integration test

**Files:**
- Create: `src/engine/setup.ts`, `src/engine/selectors.ts`
- Test: `src/engine/__tests__/integration.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 6-12
- Produces:
  - `createGame(input: NewGameInput): GameState`
  - `scoreboard(state): Array<{ player: Player; rank: number }>`, `currentSquare(state): Square`, `isMyTurn(state, id): boolean`

- [ ] **Step 1: Write the failing test**

The integration test drives a whole game to completion with an auto-answering prompt handler, then asserts invariants and determinism. It is the regression net for every later UI change.

Create `src/engine/__tests__/integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createGame } from '../setup';
import { reduce } from '../reducer';
import { BOARD_ORIGINAL } from '../../data/boards/original';
import type { Action, GameState, PromptResult } from '../types';

/** Answer whatever prompt is pending in a fixed, deterministic way. */
function answer(state: GameState): PromptResult {
  if (state.phase.name !== 'prompt') throw new Error('Not prompting');
  const prompt = state.phase.prompt;
  const others = state.players.filter((_, i) => i !== state.activeIndex);
  switch (prompt.id) {
    case 'givePlayers': {
      const count = prompt.players === 'all' ? others.length : prompt.players;
      return {
        id: 'givePlayers',
        assignments: others.slice(0, count).map((p) => ({ playerId: p.id, drinks: prompt.drinks })),
      };
    }
    case 'choosePlayer':
      return { id: 'choosePlayer', playerId: (others[0] ?? state.players[state.activeIndex]).id };
    case 'snorlaxSong': return { id: 'snorlaxSong', sang: true };
    case 'koffingSmoke': return { id: 'koffingSmoke', smoked: false };
    case 'evolution': return { id: 'evolution', evolve: true };
    case 'saffronNumber': return { id: 'saffronNumber', guess: 4 };
    case 'chuggingContest':
      return { id: 'chuggingContest', opponentId: others[0].id, winnerId: others[0].id };
    case 'pokeballCatch': return { id: 'pokeballCatch', onBoard: true };
  }
}

/** Play until gameOver, or throw if the machine stalls. */
function playToCompletion(start: GameState): GameState {
  let state = start;
  for (let tick = 0; tick < 20_000; tick++) {
    if (state.phase.name === 'gameOver') return state;
    const action: Action =
      state.phase.name === 'idle' ? { type: 'ROLL' }
      : state.phase.name === 'rolling' ? { type: 'DICE_SHOWN' }
      : state.phase.name === 'moving' ? { type: 'STEP_DONE' }
      : state.phase.name === 'landed' ? { type: 'DISMISS_SQUARE' }
      : state.phase.name === 'note' ? { type: 'ACK_NOTE' }
      : state.phase.name === 'battle' ? { type: 'ACK_BATTLE' }
      : state.phase.name === 'prompt' ? { type: 'RESOLVE_PROMPT', result: answer(state) }
      : { type: 'END_TURN' };
    const next = reduce(state, action);
    if (next === state) throw new Error(`Stalled in phase ${state.phase.name}`);
    state = next;
  }
  throw new Error('Game did not finish within 20000 ticks');
}

const input = {
  boardId: 'original',
  seed: 20260806,
  config: { fullDrink: 10, trainerBattles: true, offTableChance: 1, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'm' },
    { name: 'Ash', starter: 'squirtle', gender: 'f' },
  ],
} as const;

describe('createGame', () => {
  it('seats every player on Start with a clean slate', () => {
    const state = createGame(input);
    expect(state.players).toHaveLength(3);
    expect(state.players.every((p) => p.square === 0 && p.drinks === 0)).toBe(true);
    expect(state.activeIndex).toBe(0);
    expect(state.phase).toEqual({ name: 'idle' });
  });

  it('gives every player a distinct id', () => {
    const state = createGame(input);
    expect(new Set(state.players.map((p) => p.id)).size).toBe(3);
  });

  it('rejects a game with fewer than two players', () => {
    expect(() => createGame({ ...input, players: [input.players[0]] })).toThrow(/at least 2/i);
  });
});

describe('a full game', () => {
  it('reaches gameOver with someone on the final square', () => {
    const final = playToCompletion(createGame(input));
    expect(final.phase).toEqual({ name: 'gameOver' });
    expect(final.players.some((p) => p.finishedAtTurn !== null)).toBe(true);
  });

  it('never produces a negative or fractional drink total', () => {
    const final = playToCompletion(createGame(input));
    for (const p of final.players) {
      expect(p.drinks).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(p.drinks)).toBe(true);
    }
  });

  it('never lets a token leave the board', () => {
    const final = playToCompletion(createGame(input));
    for (const p of final.players) {
      expect(p.square).toBeGreaterThanOrEqual(0);
      expect(p.square).toBeLessThanOrEqual(62);
    }
  });

  it('writes a log with strictly increasing sequence numbers', () => {
    const final = playToCompletion(createGame(input));
    const seqs = final.log.map((l) => l.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
  });

  it('replays identically from the same seed', () => {
    const a = playToCompletion(createGame(input));
    const b = playToCompletion(createGame(input));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('diverges from a different seed', () => {
    const a = playToCompletion(createGame(input));
    const b = playToCompletion(createGame({ ...input, seed: 999 }));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('never mutates the board data', () => {
    const before = JSON.stringify(BOARD_ORIGINAL);
    playToCompletion(createGame(input));
    expect(JSON.stringify(BOARD_ORIGINAL)).toBe(before);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/engine/__tests__/integration.test.ts`
Expected: FAIL — "Failed to resolve import '../setup'".

- [ ] **Step 3: Implement setup**

Create `src/engine/setup.ts`:

```ts
import type { Gender, StarterId } from '../data/types';
import type { GameConfig, GameState, Player } from './types';

export interface NewPlayerInput {
  readonly name: string;
  readonly starter: StarterId;
  readonly gender: Gender;
}

export interface NewGameInput {
  readonly boardId: string;
  readonly seed: number;
  readonly config: GameConfig;
  readonly players: readonly NewPlayerInput[];
}

export const DEFAULT_CONFIG: GameConfig = {
  fullDrink: 10,
  trainerBattles: true,
  offTableChance: 1,
  maxMissedTurns: 6,
};

export function createGame(input: NewGameInput): GameState {
  if (input.players.length < 2) {
    throw new Error('A game needs at least 2 players');
  }

  const players: Player[] = input.players.map((p, index) => ({
    id: `p${index}`,
    name: p.name.trim() || `Trainer ${index + 1}`,
    starter: p.starter,
    gender: p.gender,
    square: 0,
    drinks: 0,
    missedTurns: 0,
    extraTurns: 0,
    statuses: [],
    finishedAtTurn: null,
  }));

  return {
    boardId: input.boardId,
    config: input.config,
    players,
    activeIndex: 0,
    seed: input.seed,
    turnNumber: 1,
    phase: { name: 'idle' },
    queue: [],
    queueExit: 'turnEnd',
    vars: {},
    lastRoll: null,
    log: [{ seq: 1, kind: 'turn', text: `${players[0].name}'s turn` }],
    logSeq: 1,
  };
}
```

- [ ] **Step 4: Implement selectors**

Create `src/engine/selectors.ts`:

```ts
import { BOARD_ORIGINAL, getSquare } from '../data/boards/original';
import type { Square } from '../data/types';
import { activePlayer } from './targets';
import type { GameState, Player, PlayerId } from './types';

export { activePlayer };

export function currentSquare(state: GameState): Square {
  return getSquare(BOARD_ORIGINAL, activePlayer(state).square);
}

export function squareOf(state: GameState, player: Player): Square {
  return getSquare(BOARD_ORIGINAL, player.square);
}

export function isMyTurn(state: GameState, id: PlayerId): boolean {
  return activePlayer(state).id === id;
}

/** Standings: furthest along the board first, fewest drinks breaking ties. */
export function scoreboard(state: GameState): Array<{ player: Player; rank: number }> {
  const sorted = [...state.players].sort(
    (a, b) => b.square - a.square || a.drinks - b.drinks || a.name.localeCompare(b.name),
  );
  return sorted.map((player, index) => ({ player, rank: index + 1 }));
}

/** Players stacked on the same square, so tokens can be fanned out. */
export function playersOnSquare(state: GameState, squareId: number): Player[] {
  return state.players.filter((p) => p.square === squareId);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/engine/__tests__/integration.test.ts`
Expected: PASS, 10 tests.

If "Stalled in phase X" is thrown, the reducer is missing a transition out of phase X — fix the reducer, not the test.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS. The engine is now complete and fully headless.

- [ ] **Step 7: Commit**

```bash
git add src/engine
git commit -m "feat(engine): game setup, selectors and full-game integration test"
```

---

## Task 14: Zustand store

**Files:**
- Create: `src/store/gameStore.ts`
- Test: `src/store/__tests__/gameStore.test.ts`

**Interfaces:**
- Consumes: `createGame`, `reduce`, `NewGameInput` (Tasks 11, 13)
- Produces: `useGameStore` with `{ state, actionLog, start(input), dispatch(action), reset() }`

The `actionLog` is the multiplayer seam: a serializable list that, replayed against the same seed, reproduces the game exactly.

- [ ] **Step 1: Write the failing test**

Create `src/store/__tests__/gameStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';
import { createGame } from '../../engine/setup';
import { reduce } from '../../engine/reducer';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: false, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'm' },
  ],
} as const;

describe('gameStore', () => {
  beforeEach(() => useGameStore.getState().reset());

  it('starts with no game', () => {
    expect(useGameStore.getState().state).toBeNull();
  });

  it('creates a game on start', () => {
    useGameStore.getState().start(input);
    expect(useGameStore.getState().state!.players).toHaveLength(2);
  });

  it('applies dispatched actions through the reducer', () => {
    useGameStore.getState().start(input);
    useGameStore.getState().dispatch({ type: 'ROLL' });
    expect(useGameStore.getState().state!.phase.name).toBe('rolling');
  });

  it('records every dispatched action for replay', () => {
    useGameStore.getState().start(input);
    useGameStore.getState().dispatch({ type: 'ROLL' });
    useGameStore.getState().dispatch({ type: 'DICE_SHOWN' });
    expect(useGameStore.getState().actionLog).toEqual([{ type: 'ROLL' }, { type: 'DICE_SHOWN' }]);
  });

  it('replaying the action log reproduces the same state', () => {
    useGameStore.getState().start(input);
    const store = useGameStore.getState();
    store.dispatch({ type: 'ROLL' });
    store.dispatch({ type: 'DICE_SHOWN' });
    store.dispatch({ type: 'STEP_DONE' });

    const live = useGameStore.getState().state!;
    const replayed = useGameStore.getState().actionLog.reduce(reduce, createGame(input));
    expect(JSON.stringify(replayed)).toBe(JSON.stringify(live));
  });

  it('ignores dispatches before a game exists', () => {
    useGameStore.getState().dispatch({ type: 'ROLL' });
    expect(useGameStore.getState().state).toBeNull();
    expect(useGameStore.getState().actionLog).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/store/__tests__/gameStore.test.ts`
Expected: FAIL — "Failed to resolve import '../gameStore'".

- [ ] **Step 3: Implement the store**

Create `src/store/gameStore.ts`:

```ts
import { create } from 'zustand';
import { reduce } from '../engine/reducer';
import { createGame, type NewGameInput } from '../engine/setup';
import type { Action, GameState } from '../engine/types';

interface GameStore {
  state: GameState | null;
  /**
   * Every action applied since `start`, in order. Replaying this list against
   * a fresh `createGame(input)` reproduces `state` exactly — the property that
   * makes server-authoritative multiplayer a drop-in later.
   */
  actionLog: Action[];
  input: NewGameInput | null;
  start: (input: NewGameInput) => void;
  dispatch: (action: Action) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  actionLog: [],
  input: null,

  start: (input) => set({ state: createGame(input), actionLog: [], input }),

  dispatch: (action) => {
    const { state } = get();
    if (!state) return;
    set({ state: reduce(state, action), actionLog: [...get().actionLog, action] });
  },

  reset: () => set({ state: null, actionLog: [], input: null }),
}));
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/store/__tests__/gameStore.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store
git commit -m "feat(store): zustand game store with replayable action log"
```

---

## Task 15: Board rendering and camera

**Files:**
- Create: `src/components/board/camera.ts`, `src/components/board/useCamera.ts`, `src/components/board/Token.tsx`, `src/components/board/BoardView.tsx`
- Test: `src/components/board/__tests__/camera.test.ts`, `src/components/board/__tests__/BoardView.test.tsx`

**Interfaces:**
- Consumes: `BOARD_ORIGINAL` (Task 5), `Player` (Task 6), `getStarter` (Task 3)
- Produces:
  - `BOARD_PX = 1000` — the CSS size the board is laid out at before scaling
  - `cameraTransform(opts: CameraOpts): { scale: number; x: number; y: number }`
  - `useCamera(focus, zoom)` returning a transform string plus a ref to attach to the viewport
  - `<BoardView players activeId focusSquare />`

**Why no Leaflet:** the old build pulled in Leaflet plus eight plugins (~400KB) to fit an image to the screen and place markers on it, and its pinch/pan gestures fight the page on mobile. A single CSS `transform` on a wrapper div does the same job in a few dozen lines.

- [ ] **Step 1: Write the failing camera test**

Create `src/components/board/__tests__/camera.test.ts`:

```ts
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

  it('multiplies the fit scale by the zoom factor', () => {
    const base = cameraTransform({ viewport, focus: null, zoom: 1 }).scale;
    expect(cameraTransform({ viewport, focus: { x: 50, y: 50 }, zoom: 2.5 }).scale).toBeCloseTo(base * 2.5, 5);
  });

  it('returns a zero scale for a viewport that has not been measured yet', () => {
    expect(cameraTransform({ viewport: { width: 0, height: 0 }, focus: null, zoom: 1 }).scale).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/board/__tests__/camera.test.ts`
Expected: FAIL — "Failed to resolve import '../camera'".

- [ ] **Step 3: Implement the camera maths**

Create `src/components/board/camera.ts`:

```ts
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
}

/**
 * Compute a `translate(x, y) scale(s)` for a wrapper with transform-origin 0 0.
 * Everything the old Leaflet map did for us, minus the gesture conflicts.
 */
export function cameraTransform({ viewport, focus, zoom }: CameraOpts): {
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
    y: viewport.height / 2 - targetY,
  };
}

export function transformString(t: { scale: number; x: number; y: number }): string {
  return `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/board/__tests__/camera.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing board test**

Create `src/components/board/__tests__/BoardView.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BoardView from '../BoardView';
import type { Player } from '../../../engine/types';

const players: Player[] = [
  { id: 'p0', name: 'Eden', starter: 'bulbasaur', gender: 'x', square: 0, drinks: 0,
    missedTurns: 0, extraTurns: 0, statuses: [], finishedAtTurn: null },
  { id: 'p1', name: 'Cheese', starter: 'charmander', gender: 'm', square: 6, drinks: 4,
    missedTurns: 0, extraTurns: 0, statuses: [], finishedAtTurn: null },
];

describe('BoardView', () => {
  it('renders the board image', () => {
    render(<BoardView players={players} activeId="p0" focusSquare={0} />);
    expect(screen.getByAltText(/original board/i)).toBeInTheDocument();
  });

  it('renders one token per player, labelled by name', () => {
    render(<BoardView players={players} activeId="p0" focusSquare={0} />);
    expect(screen.getByLabelText('Eden on square 0')).toBeInTheDocument();
    expect(screen.getByLabelText('Cheese on square 6')).toBeInTheDocument();
  });

  it('marks the active player token', () => {
    render(<BoardView players={players} activeId="p1" focusSquare={6} />);
    expect(screen.getByLabelText('Cheese on square 6')).toHaveAttribute('data-active', 'true');
    expect(screen.getByLabelText('Eden on square 0')).toHaveAttribute('data-active', 'false');
  });

  it('fans out tokens that share a square so neither is hidden', () => {
    const stacked = players.map((p) => ({ ...p, square: 6 }));
    render(<BoardView players={stacked} activeId="p0" focusSquare={6} />);
    const a = screen.getByLabelText('Eden on square 6');
    const b = screen.getByLabelText('Cheese on square 6');
    expect(a.style.left).not.toBe(b.style.left);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run src/components/board/__tests__/BoardView.test.tsx`
Expected: FAIL — "Failed to resolve import '../BoardView'".

- [ ] **Step 7: Implement the camera hook**

Create `src/components/board/useCamera.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import { cameraTransform, transformString, type Viewport } from './camera';

/**
 * Measures the viewport element and returns the transform that centres `focus`.
 * Re-measures on resize and orientation change via ResizeObserver.
 */
export function useCamera(focus: { x: number; y: number } | null, zoom: number) {
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

  return { ref, transform: transformString(cameraTransform({ viewport, focus, zoom })) };
}
```

- [ ] **Step 8: Implement Token and BoardView**

Create `src/components/board/Token.tsx`:

```tsx
import { motion } from 'motion/react';
import { getStarter } from '../../data/starters';
import type { Player } from '../../engine/types';

interface TokenProps {
  player: Player;
  x: number;
  y: number;
  active: boolean;
  onArrive?: () => void;
}

export default function Token({ player, x, y, active, onArrive }: TokenProps) {
  const starter = getStarter(player.starter);
  return (
    <motion.div
      aria-label={`${player.name} on square ${player.square}`}
      data-active={String(active)}
      className="absolute size-[7%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-crust bg-contain bg-center bg-no-repeat ring-2 data-[active=true]:ring-accent data-[active=false]:ring-surface1"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        backgroundImage: `url(${active ? starter.animated : starter.sprite})`,
      }}
      animate={{ left: `${x}%`, top: `${y}%` }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      onAnimationComplete={onArrive}
    />
  );
}
```

Create `src/components/board/BoardView.tsx`:

```tsx
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
```

- [ ] **Step 9: Stub ResizeObserver for jsdom**

Add to `src/test-setup.ts`:

```ts
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `npx vitest run src/components/board`
Expected: PASS, 9 tests.

- [ ] **Step 11: Commit**

```bash
git add src/components src/test-setup.ts
git commit -m "feat(board): css-transform board view and camera, replacing leaflet"
```

---

## Task 16: Lobby — name entry

**Files:**
- Create: `src/components/lobby/Lobby.tsx`, `src/components/lobby/NameEntry.tsx`, `src/components/lobby/lobbyStore.ts`
- Modify: `src/App.tsx`
- Test: `src/components/lobby/__tests__/NameEntry.test.tsx`

**Interfaces:**
- Consumes: `StarterId`, `Gender` (Task 3)
- Produces:
  - `useLobbyStore` with `{ step, drafts, addName, removeName, setStarter, setGender, next, back, reset }`
  - `LobbyDraft = { name: string; starter: StarterId | null; gender: Gender }`
  - `<Lobby onStart={(input) => void} />`

- [ ] **Step 1: Write the failing test**

Create `src/components/lobby/__tests__/NameEntry.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import NameEntry from '../NameEntry';
import { useLobbyStore } from '../lobbyStore';

describe('NameEntry', () => {
  beforeEach(() => useLobbyStore.getState().reset());

  it('adds a name on submit and clears the field', async () => {
    const user = userEvent.setup();
    render(<NameEntry />);
    const input = screen.getByPlaceholderText(/enter a name/i);
    await user.type(input, 'Eden{Enter}');
    expect(screen.getByText('Eden')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('rejects blank and whitespace-only names', async () => {
    const user = userEvent.setup();
    render(<NameEntry />);
    await user.type(screen.getByPlaceholderText(/enter a name/i), '   {Enter}');
    expect(useLobbyStore.getState().drafts).toHaveLength(0);
  });

  it('rejects a duplicate name', async () => {
    const user = userEvent.setup();
    render(<NameEntry />);
    const input = screen.getByPlaceholderText(/enter a name/i);
    await user.type(input, 'Eden{Enter}');
    await user.type(input, 'Eden{Enter}');
    expect(useLobbyStore.getState().drafts).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent(/already/i);
  });

  it('removes a name', async () => {
    const user = userEvent.setup();
    render(<NameEntry />);
    await user.type(screen.getByPlaceholderText(/enter a name/i), 'Eden{Enter}');
    await user.click(screen.getByLabelText('Remove Eden'));
    expect(useLobbyStore.getState().drafts).toHaveLength(0);
  });

  it('disables continue until two players are in', async () => {
    const user = userEvent.setup();
    render(<NameEntry />);
    const button = screen.getByRole('button', { name: /pick your pok/i });
    expect(button).toBeDisabled();
    await user.type(screen.getByPlaceholderText(/enter a name/i), 'Eden{Enter}');
    expect(button).toBeDisabled();
    await user.type(screen.getByPlaceholderText(/enter a name/i), 'Cheese{Enter}');
    expect(button).toBeEnabled();
  });

  it('caps the roster at eight players', async () => {
    const user = userEvent.setup();
    render(<NameEntry />);
    const input = screen.getByPlaceholderText(/enter a name/i);
    for (let i = 0; i < 10; i++) await user.type(input, `P${i}{Enter}`);
    expect(useLobbyStore.getState().drafts).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/lobby`
Expected: FAIL — "Failed to resolve import '../NameEntry'".

- [ ] **Step 3: Implement the lobby store**

Create `src/components/lobby/lobbyStore.ts`:

```ts
import { create } from 'zustand';
import type { Gender, StarterId } from '../../data/types';

export interface LobbyDraft {
  name: string;
  starter: StarterId | null;
  gender: Gender;
}

export type LobbyStep = 'names' | 'starters' | 'config';

/** Ten starters are available, so eight players still leaves a choice for the last. */
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;

interface LobbyStore {
  step: LobbyStep;
  drafts: LobbyDraft[];
  /** Index of the player currently choosing a starter. */
  pickingIndex: number;
  error: string | null;
  addName: (name: string) => void;
  removeName: (index: number) => void;
  setStarter: (index: number, starter: StarterId) => void;
  setGender: (index: number, gender: Gender) => void;
  setStep: (step: LobbyStep) => void;
  setPickingIndex: (index: number) => void;
  reset: () => void;
}

export const useLobbyStore = create<LobbyStore>((set, get) => ({
  step: 'names',
  drafts: [],
  pickingIndex: 0,
  error: null,

  addName: (raw) => {
    const name = raw.trim();
    if (!name) return;
    const { drafts } = get();
    if (drafts.length >= MAX_PLAYERS) {
      set({ error: `That's the maximum of ${MAX_PLAYERS} players.` });
      return;
    }
    if (drafts.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      set({ error: `${name} is already playing.` });
      return;
    }
    set({ drafts: [...drafts, { name, starter: null, gender: 'x' }], error: null });
  },

  removeName: (index) =>
    set({ drafts: get().drafts.filter((_, i) => i !== index), error: null }),

  setStarter: (index, starter) =>
    set({ drafts: get().drafts.map((d, i) => (i === index ? { ...d, starter } : d)) }),

  setGender: (index, gender) =>
    set({ drafts: get().drafts.map((d, i) => (i === index ? { ...d, gender } : d)) }),

  setStep: (step) => set({ step, error: null }),
  setPickingIndex: (pickingIndex) => set({ pickingIndex }),
  reset: () => set({ step: 'names', drafts: [], pickingIndex: 0, error: null }),
}));
```

- [ ] **Step 4: Implement NameEntry**

Create `src/components/lobby/NameEntry.tsx`:

```tsx
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
```

- [ ] **Step 5: Install the user-event helper**

```bash
npm install -D @testing-library/user-event
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/components/lobby`
Expected: PASS, 6 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/lobby package.json package-lock.json
git commit -m "feat(lobby): player name entry"
```

---

## Task 17: Lobby — starter and gender picker

**Files:**
- Create: `src/components/lobby/StarterPicker.tsx`
- Test: `src/components/lobby/__tests__/StarterPicker.test.tsx`

**Interfaces:**
- Consumes: `useLobbyStore` (Task 16), `STARTERS`/`getStarter` (Task 3)
- Produces: `<StarterPicker />`, which walks each player through choosing an unclaimed starter and an optional gender, then advances the store to `step: 'config'`.

Gender is optional and only exists for square 7 ("If you're a guy, guys drink"). Unset means the rule affects the roller alone, which `resolveTarget` already handles.

- [ ] **Step 1: Write the failing test**

Create `src/components/lobby/__tests__/StarterPicker.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import StarterPicker from '../StarterPicker';
import { useLobbyStore } from '../lobbyStore';

function seed(names: string[]) {
  const store = useLobbyStore.getState();
  store.reset();
  names.forEach((n) => useLobbyStore.getState().addName(n));
  useLobbyStore.getState().setStep('starters');
}

describe('StarterPicker', () => {
  beforeEach(() => seed(['Eden', 'Cheese']));

  it('prompts the first player by name', () => {
    render(<StarterPicker />);
    expect(screen.getByText(/Eden, pick your favourite/i)).toBeInTheDocument();
  });

  it('records the choice and moves to the next player', async () => {
    const user = userEvent.setup();
    render(<StarterPicker />);
    await user.click(screen.getByRole('button', { name: /bulbasaur/i }));
    expect(useLobbyStore.getState().drafts[0].starter).toBe('bulbasaur');
    expect(screen.getByText(/Cheese, pick your favourite/i)).toBeInTheDocument();
  });

  it('disables a starter another player already took', async () => {
    const user = userEvent.setup();
    render(<StarterPicker />);
    await user.click(screen.getByRole('button', { name: /bulbasaur/i }));
    expect(screen.getByRole('button', { name: /bulbasaur/i })).toBeDisabled();
  });

  it('records an optional gender', async () => {
    const user = userEvent.setup();
    render(<StarterPicker />);
    await user.click(screen.getByRole('button', { name: /^guy$/i }));
    expect(useLobbyStore.getState().drafts[0].gender).toBe('m');
  });

  it('advances to config once everyone has chosen', async () => {
    const user = userEvent.setup();
    render(<StarterPicker />);
    await user.click(screen.getByRole('button', { name: /bulbasaur/i }));
    await user.click(screen.getByRole('button', { name: /charmander/i }));
    expect(useLobbyStore.getState().step).toBe('config');
  });

  it('goes back to name entry', async () => {
    const user = userEvent.setup();
    render(<StarterPicker />);
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(useLobbyStore.getState().step).toBe('names');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/lobby/__tests__/StarterPicker.test.tsx`
Expected: FAIL — "Failed to resolve import '../StarterPicker'".

- [ ] **Step 3: Implement StarterPicker**

Create `src/components/lobby/StarterPicker.tsx`:

```tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/lobby/__tests__/StarterPicker.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/lobby
git commit -m "feat(lobby): starter and optional gender picker"
```

---

## Task 18: Lobby — config and game start

**Files:**
- Create: `src/components/lobby/GameConfig.tsx`, `src/components/lobby/Lobby.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`
- Test: `src/components/lobby/__tests__/GameConfig.test.tsx`, `src/components/lobby/__tests__/Lobby.test.tsx`

**Interfaces:**
- Consumes: `useLobbyStore` (Tasks 16-17), `useGameStore.start` (Task 14), `DEFAULT_CONFIG` (Task 13)
- Produces: `<Lobby />`, which on submit calls `useGameStore.start({ boardId, seed, config, players })`. `App` renders `Lobby` when `useGameStore().state` is null and `GameScreen` otherwise (`GameScreen` arrives in Task 19; until then App renders a placeholder).

- [ ] **Step 1: Write the failing tests**

Create `src/components/lobby/__tests__/GameConfig.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import GameConfig from '../GameConfig';
import { useLobbyStore } from '../lobbyStore';

beforeEach(() => {
  useLobbyStore.getState().reset();
  useLobbyStore.getState().addName('Eden');
  useLobbyStore.getState().addName('Cheese');
  useLobbyStore.getState().setStarter(0, 'bulbasaur');
  useLobbyStore.getState().setStarter(1, 'charmander');
  useLobbyStore.getState().setStep('config');
});

describe('GameConfig', () => {
  it('starts with the legacy defaults', () => {
    render(<GameConfig onStart={vi.fn()} />);
    expect(screen.getByLabelText(/full vessel/i)).toHaveValue(10);
    expect(screen.getByLabelText(/missed turns/i)).toHaveValue(6);
    expect(screen.getByLabelText(/off the table/i)).toHaveValue(1);
    expect(screen.getByLabelText(/trainer battles/i)).toBeChecked();
  });

  it('hands the edited config and the roster to onStart', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<GameConfig onStart={onStart} />);

    await user.clear(screen.getByLabelText(/full vessel/i));
    await user.type(screen.getByLabelText(/full vessel/i), '14');
    await user.click(screen.getByLabelText(/trainer battles/i));
    await user.click(screen.getByRole('button', { name: /ready to play/i }));

    expect(onStart).toHaveBeenCalledOnce();
    const input = onStart.mock.calls[0][0];
    expect(input.config).toMatchObject({ fullDrink: 14, trainerBattles: false });
    expect(input.players).toEqual([
      { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
      { name: 'Cheese', starter: 'charmander', gender: 'x' },
    ]);
    expect(typeof input.seed).toBe('number');
  });

  it('clamps a nonsense vessel size to at least 1', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<GameConfig onStart={onStart} />);
    await user.clear(screen.getByLabelText(/full vessel/i));
    await user.type(screen.getByLabelText(/full vessel/i), '0');
    await user.click(screen.getByRole('button', { name: /ready to play/i }));
    expect(onStart.mock.calls[0][0].config.fullDrink).toBe(1);
  });
});
```

Create `src/components/lobby/__tests__/Lobby.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import Lobby from '../Lobby';
import { useLobbyStore } from '../lobbyStore';
import { useGameStore } from '../../../store/gameStore';

beforeEach(() => {
  useLobbyStore.getState().reset();
  useGameStore.getState().reset();
});

describe('Lobby', () => {
  it('walks names to starters to config and starts a game', async () => {
    const user = userEvent.setup();
    render(<Lobby />);

    const input = screen.getByPlaceholderText(/enter a name/i);
    await user.type(input, 'Eden{Enter}');
    await user.type(input, 'Cheese{Enter}');
    await user.click(screen.getByRole('button', { name: /pick your pok/i }));

    await user.click(screen.getByRole('button', { name: /bulbasaur/i }));
    await user.click(screen.getByRole('button', { name: /charmander/i }));

    await user.click(screen.getByRole('button', { name: /ready to play/i }));

    const state = useGameStore.getState().state;
    expect(state).not.toBeNull();
    expect(state!.players.map((p) => p.name)).toEqual(['Eden', 'Cheese']);
    expect(state!.players.map((p) => p.starter)).toEqual(['bulbasaur', 'charmander']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/lobby`
Expected: FAIL — "Failed to resolve import '../GameConfig'".

- [ ] **Step 3: Implement GameConfig**

Create `src/components/lobby/GameConfig.tsx`:

```tsx
import { useState } from 'react';
import { DEFAULT_CONFIG, type NewGameInput } from '../../engine/setup';
import type { StarterId } from '../../data/types';
import { useLobbyStore } from './lobbyStore';

interface GameConfigProps {
  onStart: (input: NewGameInput) => void;
}

export default function GameConfig({ onStart }: GameConfigProps) {
  const { drafts, setStep } = useLobbyStore();
  const [fullDrink, setFullDrink] = useState(DEFAULT_CONFIG.fullDrink);
  const [maxMissedTurns, setMaxMissedTurns] = useState(DEFAULT_CONFIG.maxMissedTurns);
  const [offTableChance, setOffTableChance] = useState(DEFAULT_CONFIG.offTableChance);
  const [trainerBattles, setTrainerBattles] = useState(DEFAULT_CONFIG.trainerBattles);

  const start = () => {
    onStart({
      boardId: 'original',
      // A fresh seed per game; recorded in the store so the game is replayable.
      seed: Math.floor(Math.random() * 2 ** 31),
      config: {
        fullDrink: Math.max(1, fullDrink),
        maxMissedTurns: Math.max(0, maxMissedTurns),
        offTableChance: Math.min(100, Math.max(0, offTableChance)),
        trainerBattles,
      },
      players: drafts.map((d) => ({
        name: d.name,
        starter: d.starter as StarterId,
        gender: d.gender,
      })),
    });
  };

  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-pokemon text-2xl text-accent">Game setup</h2>

      <label className="flex flex-col gap-1">
        <span>Drinks in a full vessel</span>
        <small className="text-subtext">How many sips it takes to finish a drink.</small>
        <input
          type="number" min={1} inputMode="numeric"
          className="min-h-12 rounded-lg bg-surface0 px-4"
          value={fullDrink}
          onChange={(e) => setFullDrink(Number(e.target.value))}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span>Cap on missed turns</span>
        <small className="text-subtext">The most turns a single square can cost you.</small>
        <input
          type="number" min={0} inputMode="numeric"
          className="min-h-12 rounded-lg bg-surface0 px-4"
          value={maxMissedTurns}
          onChange={(e) => setMaxMissedTurns(Number(e.target.value))}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span>Chance to roll off the table (%)</span>
        <small className="text-subtext">Roll off, finish your drink.</small>
        <input
          type="number" min={0} max={100} inputMode="numeric"
          className="min-h-12 rounded-lg bg-surface0 px-4"
          value={offTableChance}
          onChange={(e) => setOffTableChance(Number(e.target.value))}
        />
      </label>

      <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-surface0 px-4">
        <span className="flex flex-col">
          <span>Trainer battles</span>
          <small className="text-subtext">Land on an occupied square, both roll, loser drinks the gap.</small>
        </span>
        <input
          type="checkbox" className="size-6"
          checked={trainerBattles}
          onChange={(e) => setTrainerBattles(e.target.checked)}
        />
      </label>

      <div className="flex gap-2">
        <button type="button" onClick={() => setStep('starters')} className="min-h-14 flex-1 rounded-xl bg-surface0 text-subtext">
          Back
        </button>
        <button type="button" onClick={start} className="min-h-14 flex-[2] rounded-xl bg-green font-pokemon text-lg text-crust">
          Ready to play!
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Implement the Lobby router**

Create `src/components/lobby/Lobby.tsx`:

```tsx
import { useGameStore } from '../../store/gameStore';
import GameConfig from './GameConfig';
import NameEntry from './NameEntry';
import StarterPicker from './StarterPicker';
import { useLobbyStore } from './lobbyStore';

export default function Lobby() {
  const step = useLobbyStore((s) => s.step);
  const start = useGameStore((s) => s.start);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <h1 className="font-pokemon text-3xl text-yellow">Gotta Chug 'em All</h1>
      {step === 'names' && <NameEntry />}
      {step === 'starters' && <StarterPicker />}
      {step === 'config' && <GameConfig onStart={start} />}
    </main>
  );
}
```

- [ ] **Step 5: Wire App to the store**

Replace `src/App.tsx`:

```tsx
import Lobby from './components/lobby/Lobby';
import { useGameStore } from './store/gameStore';

export default function App() {
  const state = useGameStore((s) => s.state);
  // GameScreen replaces this placeholder in Task 19.
  if (state) return <main className="grid h-dvh place-items-center">Game running</main>;
  return <Lobby />;
}
```

Replace `src/App.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';
import { useGameStore } from './store/gameStore';

describe('App', () => {
  beforeEach(() => useGameStore.getState().reset());

  it('shows the lobby when no game is running', () => {
    render(<App />);
    expect(screen.getByText(/Gotta Chug 'em All/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter a name/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/components/lobby src/App.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat(lobby): game config and start handoff"
```

---

## Task 19: Game screen shell and turn driver

**Files:**
- Create: `src/components/game/useTurnDriver.ts`, `src/components/game/GameScreen.tsx`
- Modify: `src/App.tsx`
- Test: `src/components/game/__tests__/useTurnDriver.test.tsx`, `src/components/game/__tests__/GameScreen.test.tsx`

**Interfaces:**
- Consumes: `useGameStore` (Task 14), `BoardView` (Task 15), `activePlayer`/`currentSquare` (Task 13)
- Produces:
  - `PHASE_DELAYS: Partial<Record<Phase['name'], number>>` — how long the UI dwells on a phase before auto-advancing
  - `useTurnDriver()` — the single hook that turns phase changes into dispatched actions
  - `<GameScreen />`

**The key inversion:** the old code slept through a chain of `setTimeout`s and hoped the state kept up. Here the engine holds a phase, the driver owns *timing*, and components own *visuals*. Token movement is driven by the animation actually finishing, not by a guessed 1200ms.

- [ ] **Step 1: Write the failing driver test**

Create `src/components/game/__tests__/useTurnDriver.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PHASE_DELAYS, useTurnDriver } from '../useTurnDriver';
import { useGameStore } from '../../../store/gameStore';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: false, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'x' },
  ],
} as const;

function Harness() {
  useTurnDriver();
  return null;
}

describe('useTurnDriver', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });
  afterEach(() => vi.useRealTimers());

  it('does nothing while the game is idle', () => {
    render(<Harness />);
    act(() => void vi.advanceTimersByTime(5000));
    expect(useGameStore.getState().state!.phase.name).toBe('idle');
  });

  it('advances past the rolling phase after the dice dwell', () => {
    render(<Harness />);
    act(() => useGameStore.getState().dispatch({ type: 'ROLL' }));
    expect(useGameStore.getState().state!.phase.name).toBe('rolling');
    act(() => void vi.advanceTimersByTime(PHASE_DELAYS.rolling!));
    expect(useGameStore.getState().state!.phase.name).toBe('moving');
  });

  it('ends the turn automatically after the turnEnd dwell', () => {
    render(<Harness />);
    act(() => useGameStore.getState().dispatch({ type: 'ROLL' }));
    act(() => void vi.advanceTimersByTime(PHASE_DELAYS.rolling!));
    let guard = 0;
    while (useGameStore.getState().state!.phase.name === 'moving') {
      act(() => useGameStore.getState().dispatch({ type: 'STEP_DONE' }));
      if (++guard > 50) throw new Error('Movement did not terminate');
    }
    act(() => useGameStore.getState().dispatch({ type: 'DISMISS_SQUARE' }));
    if (useGameStore.getState().state!.phase.name === 'turnEnd') {
      act(() => void vi.advanceTimersByTime(PHASE_DELAYS.turnEnd!));
      expect(useGameStore.getState().state!.phase.name).toBe('idle');
    }
  });

  it('never auto-advances a phase that is waiting on the player', () => {
    render(<Harness />);
    act(() => useGameStore.getState().dispatch({ type: 'ROLL' }));
    act(() => void vi.advanceTimersByTime(PHASE_DELAYS.rolling!));
    let guard = 0;
    while (useGameStore.getState().state!.phase.name === 'moving') {
      act(() => useGameStore.getState().dispatch({ type: 'STEP_DONE' }));
      if (++guard > 50) break;
    }
    const parked = useGameStore.getState().state!.phase.name;
    expect(parked).toBe('landed');
    act(() => void vi.advanceTimersByTime(30_000));
    expect(useGameStore.getState().state!.phase.name).toBe('landed');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/game`
Expected: FAIL — "Failed to resolve import '../useTurnDriver'".

- [ ] **Step 3: Implement the driver**

Create `src/components/game/useTurnDriver.ts`:

```ts
import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Action, Phase } from '../../engine/types';

/**
 * How long the UI dwells on a phase before the driver advances it. Phases not
 * listed here wait for the player (landed, note, prompt, battle) or for an
 * animation callback (moving).
 */
export const PHASE_DELAYS: Partial<Record<Phase['name'], number>> = {
  rolling: 1600,
  turnEnd: 700,
};

const NEXT_ACTION: Partial<Record<Phase['name'], Action>> = {
  rolling: { type: 'DICE_SHOWN' },
  turnEnd: { type: 'END_TURN' },
};

/**
 * Turns phase changes into dispatched actions on a timer. The engine never
 * sleeps; this is the only place in the app that knows about elapsed time.
 */
export function useTurnDriver(): void {
  const phaseName = useGameStore((s) => s.state?.phase.name);
  const dispatch = useGameStore((s) => s.dispatch);

  useEffect(() => {
    if (!phaseName) return;
    const delay = PHASE_DELAYS[phaseName];
    const action = NEXT_ACTION[phaseName];
    if (delay === undefined || !action) return;

    const timer = setTimeout(() => dispatch(action), delay);
    return () => clearTimeout(timer);
  }, [phaseName, dispatch]);
}
```

- [ ] **Step 4: Write the failing GameScreen test**

Create `src/components/game/__tests__/GameScreen.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import GameScreen from '../GameScreen';
import { useGameStore } from '../../../store/gameStore';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: false, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'x' },
  ],
} as const;

describe('GameScreen', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('renders the board with a token per player', () => {
    render(<GameScreen />);
    expect(screen.getByLabelText('Eden on square 0')).toBeInTheDocument();
    expect(screen.getByLabelText('Cheese on square 0')).toBeInTheDocument();
  });

  it('names whose turn it is', () => {
    render(<GameScreen />);
    expect(screen.getByText(/Eden's turn/i)).toBeInTheDocument();
  });

  it('renders nothing when no game is running', () => {
    useGameStore.getState().reset();
    const { container } = render(<GameScreen />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 5: Implement GameScreen**

Create `src/components/game/GameScreen.tsx`:

```tsx
import BoardView from '../board/BoardView';
import { activePlayer } from '../../engine/selectors';
import { useGameStore } from '../../store/gameStore';
import { useTurnDriver } from './useTurnDriver';

export default function GameScreen() {
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  useTurnDriver();

  if (!state) return null;
  const active = activePlayer(state);
  const moving = state.phase.name === 'moving';

  return (
    <div className="flex h-dvh flex-col bg-crust">
      <header className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <span className="font-pokemon text-lg text-accent">{active.name}'s turn</span>
        <span className="text-sm text-subtext">Turn {state.turnNumber}</span>
      </header>

      <div className="min-h-0 flex-1">
        <BoardView
          players={state.players}
          activeId={active.id}
          focusSquare={active.square}
          onTokenArrive={moving ? () => dispatch({ type: 'STEP_DONE' }) : undefined}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Render GameScreen from App**

Replace the placeholder line in `src/App.tsx`:

```tsx
import GameScreen from './components/game/GameScreen';
import Lobby from './components/lobby/Lobby';
import { useGameStore } from './store/gameStore';

export default function App() {
  const state = useGameStore((s) => s.state);
  return state ? <GameScreen /> : <Lobby />;
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/components/game src/App.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat(game): game screen shell and phase-driven turn driver"
```

---

## Task 20: Control sheet — roll button, scoreboard, log

**Files:**
- Create: `src/components/ui/Sheet.tsx`, `src/components/game/ControlSheet.tsx`
- Modify: `src/components/game/GameScreen.tsx`
- Test: `src/components/game/__tests__/ControlSheet.test.tsx`

**Interfaces:**
- Consumes: `useGameStore` (Task 14), `scoreboard`/`activePlayer` (Task 13), `STATUS_META` (Task 10)
- Produces: `<Sheet open onToggle>`, `<ControlSheet />`

The roll button sits at the bottom of the screen, always inside thumb reach. Scores and log live in a sheet the player drags up, so the board keeps the screen at rest.

- [ ] **Step 1: Write the failing test**

Create `src/components/game/__tests__/ControlSheet.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import ControlSheet from '../ControlSheet';
import { useGameStore } from '../../../store/gameStore';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: false, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'x' },
  ],
} as const;

describe('ControlSheet', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('offers a roll button on the active player turn', () => {
    render(<ControlSheet />);
    expect(screen.getByRole('button', { name: /roll/i })).toBeEnabled();
  });

  it('dispatches ROLL when tapped', async () => {
    const user = userEvent.setup();
    render(<ControlSheet />);
    await user.click(screen.getByRole('button', { name: /roll/i }));
    expect(useGameStore.getState().state!.phase.name).toBe('rolling');
  });

  it('disables the roll button outside the idle phase', async () => {
    const user = userEvent.setup();
    render(<ControlSheet />);
    await user.click(screen.getByRole('button', { name: /roll/i }));
    expect(screen.getByRole('button', { name: /roll/i })).toBeDisabled();
  });

  it('shows every player drink total', () => {
    render(<ControlSheet />);
    expect(screen.getByLabelText('Eden has 0 drinks')).toBeInTheDocument();
    expect(screen.getByLabelText('Cheese has 0 drinks')).toBeInTheDocument();
  });

  it('opens and closes the detail sheet', async () => {
    const user = userEvent.setup();
    render(<ControlSheet />);
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /scores & log/i }));
    expect(screen.getByRole('log')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
  });

  it('lists active statuses so nobody forgets they are confused', () => {
    const state = useGameStore.getState().state!;
    useGameStore.setState({
      state: {
        ...state,
        players: [
          { ...state.players[0], statuses: [{ id: 'zubats', expires: 'leaveSquare', appliedOnSquare: 8 }] },
          state.players[1],
        ],
      },
    });
    render(<ControlSheet />);
    expect(screen.getByText(/Confused by Zubats/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/game/__tests__/ControlSheet.test.tsx`
Expected: FAIL — "Failed to resolve import '../ControlSheet'".

- [ ] **Step 3: Implement the Sheet primitive**

Create `src/components/ui/Sheet.tsx`:

```tsx
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Sheet({ open, onClose, title, children }: SheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-30 max-h-[70dvh] overflow-y-auto rounded-t-2xl bg-mantle p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-pokemon text-lg text-accent">{title}</h2>
            <button type="button" onClick={onClose} className="min-h-11 px-3 text-subtext">
              Close
            </button>
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Implement ControlSheet**

Create `src/components/game/ControlSheet.tsx`:

```tsx
import { useState } from 'react';
import { getStarter } from '../../data/starters';
import { activePlayer, scoreboard } from '../../engine/selectors';
import { STATUS_META } from '../../engine/statuses';
import { useGameStore } from '../../store/gameStore';
import Sheet from '../ui/Sheet';

export default function ControlSheet() {
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  const [open, setOpen] = useState(false);

  if (!state) return null;
  const active = activePlayer(state);
  const canRoll = state.phase.name === 'idle';

  return (
    <>
      <div className="flex flex-col gap-3 border-t border-surface0 bg-mantle p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <ul className="flex gap-3 overflow-x-auto">
          {state.players.map((player) => (
            <li
              key={player.id}
              aria-label={`${player.name} has ${player.drinks} drinks`}
              data-active={String(player.id === active.id)}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-surface0 px-3 py-2 data-[active=true]:ring-2 data-[active=true]:ring-accent"
            >
              <img src={getStarter(player.starter).sprite} alt="" className="size-8" />
              <span className="text-sm">{player.name}</span>
              <span className="font-pokemon text-lg text-yellow">{player.drinks}</span>
            </li>
          ))}
        </ul>

        {active.statuses.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {active.statuses.map((status) => (
              <li key={status.id} className="rounded-full bg-mauve/20 px-3 py-1 text-xs text-mauve">
                {STATUS_META[status.id].label}
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="min-h-14 rounded-xl bg-surface0 px-4 text-sm text-subtext"
          >
            Scores &amp; log
          </button>
          <button
            type="button"
            disabled={!canRoll}
            onClick={() => dispatch({ type: 'ROLL' })}
            className="min-h-14 flex-1 rounded-xl bg-accent font-pokemon text-xl text-crust disabled:opacity-30"
          >
            Roll the dice
          </button>
        </div>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Scores & log">
        <ol className="mb-4 flex flex-col gap-2">
          {scoreboard(state).map(({ player, rank }) => (
            <li key={player.id} className="flex items-center justify-between rounded-lg bg-surface0 px-3 py-2">
              <span>
                <span className="mr-2 text-subtext">#{rank}</span>
                {player.name}
              </span>
              <span className="text-sm text-subtext">
                square {player.square} · {player.drinks} drinks
              </span>
            </li>
          ))}
        </ol>

        <div role="log" className="flex flex-col-reverse gap-1 text-sm text-subtext">
          {state.log.map((entry) => (
            <p key={entry.seq}>{entry.text}</p>
          ))}
        </div>
      </Sheet>
    </>
  );
}
```

- [ ] **Step 5: Mount it in GameScreen**

In `src/components/game/GameScreen.tsx`, add the import and render it after the board container:

```tsx
import ControlSheet from './ControlSheet';
```

```tsx
      <ControlSheet />
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/components/game`
Expected: PASS, 13 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components
git commit -m "feat(game): thumb-reachable control sheet with scores and log"
```

---

## Task 21: Dice roller

**Files:**
- Create: `src/components/game/DiceRoller.tsx`
- Modify: `src/components/game/GameScreen.tsx`
- Delete: `img/throw.gif`, `img/result.gif`, `img/diceresult.png`
- Test: `src/components/game/__tests__/DiceRoller.test.tsx`

**Interfaces:**
- Consumes: `useGameStore` (Task 14), `PHASE_DELAYS` (Task 19)
- Produces: `<DiceRoller />` — renders only during the `rolling` phase, showing the rolled face

The legacy dice were 1.2MB of GIFs sequenced across four `setTimeout`s and blocked the turn for seven seconds. This is a CSS-animated die that shows the real face and clears in `PHASE_DELAYS.rolling` (1.6s).

- [ ] **Step 1: Write the failing test**

Create `src/components/game/__tests__/DiceRoller.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import DiceRoller from '../DiceRoller';
import { useGameStore } from '../../../store/gameStore';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: false, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'x' },
  ],
} as const;

describe('DiceRoller', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('renders nothing while idle', () => {
    const { container } = render(<DiceRoller />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the rolled face during the rolling phase', () => {
    useGameStore.getState().dispatch({ type: 'ROLL' });
    const phase = useGameStore.getState().state!.phase;
    if (phase.name !== 'rolling') throw new Error('Expected rolling phase');
    render(<DiceRoller />);
    expect(screen.getByRole('status')).toHaveTextContent(String(phase.face));
  });

  it('announces rolling off the table when it happens', () => {
    const state = useGameStore.getState().state!;
    useGameStore.setState({ state: { ...state, phase: { name: 'rolling', face: 3, offTable: true } } });
    render(<DiceRoller />);
    expect(screen.getByText(/off the table/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/game/__tests__/DiceRoller.test.tsx`
Expected: FAIL — "Failed to resolve import '../DiceRoller'".

- [ ] **Step 3: Implement DiceRoller**

Create `src/components/game/DiceRoller.tsx`:

```tsx
import { motion } from 'motion/react';
import { useGameStore } from '../../store/gameStore';

/** Pip layout per face, as a 3x3 grid of filled cells. */
const PIPS: Record<number, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export default function DiceRoller() {
  const phase = useGameStore((s) => s.state?.phase);
  if (!phase || phase.name !== 'rolling') return null;

  const pips = PIPS[phase.face] ?? [];

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-crust/80 backdrop-blur-sm">
      <motion.div
        role="status"
        aria-live="polite"
        className="grid size-32 grid-cols-3 grid-rows-3 gap-2 rounded-2xl bg-text p-4 shadow-2xl"
        initial={{ rotate: -180, scale: 0.4, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
      >
        <span className="sr-only">Rolled {phase.face}</span>
        {Array.from({ length: 9 }, (_, cell) => (
          <span
            key={cell}
            aria-hidden
            className={pips.includes(cell) ? 'size-full rounded-full bg-crust' : ''}
          />
        ))}
      </motion.div>

      {phase.offTable && (
        <p className="mt-6 max-w-xs text-center font-pokemon text-lg text-red">
          It rolled off the table! Finish your drink.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Mount it and drop the GIFs**

In `src/components/game/GameScreen.tsx`, add the import and render `<DiceRoller />` alongside `<ControlSheet />`:

```tsx
import DiceRoller from './DiceRoller';
```

```bash
git rm img/throw.gif img/result.gif img/diceresult.png
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/game`
Expected: PASS, 16 tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(game): css dice roller, dropping 1.2MB of gifs"
```

---

## Task 22: Square, note and battle modals

**Files:**
- Create: `src/components/ui/Modal.tsx`, `src/components/game/SquareModal.tsx`
- Modify: `src/components/game/GameScreen.tsx`
- Test: `src/components/game/__tests__/SquareModal.test.tsx`

**Interfaces:**
- Consumes: `useGameStore` (Task 14), `currentSquare`/`activePlayer` (Task 13)
- Produces: `<Modal open title children actions>`, `<SquareModal />` covering the `landed`, `note` and `battle` phases

- [ ] **Step 1: Write the failing test**

Create `src/components/game/__tests__/SquareModal.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import SquareModal from '../SquareModal';
import { useGameStore } from '../../../store/gameStore';
import type { GameState } from '../../../engine/types';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: true, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'x' },
  ],
} as const;

function setPhase(patch: Partial<GameState>) {
  useGameStore.setState({ state: { ...useGameStore.getState().state!, ...patch } });
}

describe('SquareModal', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('renders nothing while idle', () => {
    const { container } = render(<SquareModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the landed square text and action', () => {
    const state = useGameStore.getState().state!;
    setPhase({
      phase: { name: 'landed' },
      players: [{ ...state.players[0], square: 50 }, state.players[1]],
    });
    render(<SquareModal />);
    expect(screen.getByText(/wild Taurus appeared/i)).toBeInTheDocument();
    expect(screen.getByText(/Drink 2 for not being quick enough/i)).toBeInTheDocument();
  });

  it('dispatches DISMISS_SQUARE on continue', async () => {
    const user = userEvent.setup();
    const state = useGameStore.getState().state!;
    setPhase({
      phase: { name: 'landed' },
      players: [{ ...state.players[0], square: 50 }, state.players[1]],
    });
    render(<SquareModal />);
    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(useGameStore.getState().state!.players[0].drinks).toBe(2);
  });

  it('shows a note and dispatches ACK_NOTE', async () => {
    const user = userEvent.setup();
    setPhase({ phase: { name: 'note', text: 'Do a waterfall' } });
    render(<SquareModal />);
    expect(screen.getByText('Do a waterfall')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /got it/i }));
    expect(useGameStore.getState().state!.phase.name).not.toBe('note');
  });

  it('shows both battle rolls and who lost', async () => {
    const user = userEvent.setup();
    const state = useGameStore.getState().state!;
    setPhase({
      phase: { name: 'battle', opponentId: 'p1', rolls: [5, 2] },
      players: [{ ...state.players[0], square: 50 }, { ...state.players[1], square: 50 }],
    });
    render(<SquareModal />);
    expect(screen.getByText(/Cheese drinks 3/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /fight/i }));
    expect(useGameStore.getState().state!.players[1].drinks).toBe(3);
  });

  it('calls a tied battle a draw', () => {
    const state = useGameStore.getState().state!;
    setPhase({
      phase: { name: 'battle', opponentId: 'p1', rolls: [4, 4] },
      players: [{ ...state.players[0], square: 50 }, { ...state.players[1], square: 50 }],
    });
    render(<SquareModal />);
    expect(screen.getByText(/draw/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/game/__tests__/SquareModal.test.tsx`
Expected: FAIL — "Failed to resolve import '../SquareModal'".

- [ ] **Step 3: Implement the Modal primitive**

Create `src/components/ui/Modal.tsx`:

```tsx
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  actions: ReactNode;
}

export default function Modal({ title, children, actions }: ModalProps) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-crust/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:place-items-center">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-2xl bg-base p-5 shadow-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      >
        <h2 className="mb-3 font-pokemon text-xl text-accent">{title}</h2>
        <div className="mb-5 flex flex-col gap-3 text-text">{children}</div>
        <div className="flex gap-2">{actions}</div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 4: Implement SquareModal**

Create `src/components/game/SquareModal.tsx`:

```tsx
import { BOARD_ORIGINAL, getSquare } from '../../data/boards/original';
import { activePlayer } from '../../engine/selectors';
import { useGameStore } from '../../store/gameStore';
import Modal from '../ui/Modal';

export default function SquareModal() {
  const state = useGameStore((s) => s.state);
  const dispatch = useGameStore((s) => s.dispatch);
  if (!state) return null;

  const active = activePlayer(state);

  if (state.phase.name === 'landed') {
    const square = getSquare(BOARD_ORIGINAL, active.square);
    return (
      <Modal
        title={square.text}
        actions={
          <button
            type="button"
            onClick={() => dispatch({ type: 'DISMISS_SQUARE' })}
            className="min-h-14 flex-1 rounded-xl bg-accent font-pokemon text-lg text-crust"
          >
            Continue
          </button>
        }
      >
        <p>{square.action}</p>
      </Modal>
    );
  }

  if (state.phase.name === 'note') {
    return (
      <Modal
        title="House rule"
        actions={
          <button
            type="button"
            onClick={() => dispatch({ type: 'ACK_NOTE' })}
            className="min-h-14 flex-1 rounded-xl bg-accent font-pokemon text-lg text-crust"
          >
            Got it
          </button>
        }
      >
        <p>{state.phase.text}</p>
      </Modal>
    );
  }

  if (state.phase.name === 'battle') {
    const [mine, theirs] = state.phase.rolls;
    const opponent = state.players.find((p) => p.id === state.phase.opponentId)!;
    const diff = Math.abs(mine - theirs);
    const outcome =
      diff === 0
        ? "It's a draw — nobody drinks."
        : mine > theirs
          ? `${opponent.name} drinks ${diff}.`
          : `${active.name} drinks ${diff}.`;

    return (
      <Modal
        title="Trainer battle!"
        actions={
          <button
            type="button"
            onClick={() => dispatch({ type: 'ACK_BATTLE' })}
            className="min-h-14 flex-1 rounded-xl bg-red font-pokemon text-lg text-crust"
          >
            Fight!
          </button>
        }
      >
        <p>
          {active.name} rolled {mine}, {opponent.name} rolled {theirs}.
        </p>
        <p className="font-semibold">{outcome}</p>
      </Modal>
    );
  }

  return null;
}
```

- [ ] **Step 5: Mount it in GameScreen**

Add the import and render `<SquareModal />` alongside `<DiceRoller />`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/components/game`
Expected: PASS, 22 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components
git commit -m "feat(game): square, note and trainer battle modals"
```

---

## Task 23: Prompt modals

**Files:**
- Create: `src/components/game/PlayerPicker.tsx`, `src/components/game/PromptModal.tsx`
- Modify: `src/components/game/GameScreen.tsx`
- Test: `src/components/game/__tests__/PromptModal.test.tsx`

**Interfaces:**
- Consumes: `useGameStore` (Task 14), `Prompt`/`PromptResult` (Task 6), `getStarter` (Task 3)
- Produces: `<PlayerPicker players onPick />`, `<PromptModal />` covering all eight prompt kinds

This is the feature the legacy build never shipped: `giveDrinks` was commented out at `js/config.js:377` because `playerToDrink` was a function that was never called and the field name was wrong. Around fifteen squares did nothing as a result.

- [ ] **Step 1: Write the failing test**

Create `src/components/game/__tests__/PromptModal.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import PromptModal from '../PromptModal';
import { useGameStore } from '../../../store/gameStore';
import type { Prompt } from '../../../engine/types';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: false, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'x' },
    { name: 'Ash', starter: 'squirtle', gender: 'x' },
  ],
} as const;

function park(prompt: Prompt) {
  useGameStore.setState({
    state: { ...useGameStore.getState().state!, phase: { name: 'prompt', prompt } },
  });
}

describe('PromptModal', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('renders nothing when no prompt is pending', () => {
    const { container } = render(<PromptModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('gives drinks to a chosen player and confirms', async () => {
    const user = userEvent.setup();
    park({ id: 'givePlayers', drinks: 2, players: 1 });
    render(<PromptModal />);

    await user.click(screen.getByRole('button', { name: /Cheese/ }));
    await user.click(screen.getByRole('button', { name: /make them drink/i }));

    expect(useGameStore.getState().state!.players[1].drinks).toBe(2);
    expect(useGameStore.getState().state!.phase.name).not.toBe('prompt');
  });

  it('does not offer the active player as a target', () => {
    park({ id: 'givePlayers', drinks: 1, players: 1 });
    render(<PromptModal />);
    expect(screen.queryByRole('button', { name: /Eden/ })).not.toBeInTheDocument();
  });

  it('blocks confirming until every drink is assigned', async () => {
    const user = userEvent.setup();
    park({ id: 'givePlayers', drinks: 1, players: 2 });
    render(<PromptModal />);

    const confirm = screen.getByRole('button', { name: /make them drink/i });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Cheese/ }));
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Ash/ }));
    expect(confirm).toBeEnabled();
  });

  it('spreads "all" across everyone else', async () => {
    const user = userEvent.setup();
    park({ id: 'givePlayers', drinks: 1, players: 'all' });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: /Cheese/ }));
    await user.click(screen.getByRole('button', { name: /Ash/ }));
    await user.click(screen.getByRole('button', { name: /make them drink/i }));
    expect(useGameStore.getState().state!.players.map((p) => p.drinks)).toEqual([0, 1, 1]);
  });

  it('moves a chosen player for Haunter', async () => {
    const user = userEvent.setup();
    const state = useGameStore.getState().state!;
    useGameStore.setState({
      state: {
        ...state,
        players: [state.players[0], { ...state.players[1], square: 30 }, state.players[2]],
        phase: { name: 'prompt', prompt: { id: 'choosePlayer', purpose: 'move', squares: -10 } },
      },
    });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: /Cheese/ }));
    expect(useGameStore.getState().state!.players[1].square).toBe(20);
  });

  it('asks the Snorlax yes/no question', async () => {
    const user = userEvent.setup();
    park({ id: 'snorlaxSong' });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: /we sang/i }));
    expect(useGameStore.getState().state!.players[0].drinks).toBe(0);
  });

  it('charges 4 for refusing to sing', async () => {
    const user = userEvent.setup();
    park({ id: 'snorlaxSong' });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: /take the 4/i }));
    expect(useGameStore.getState().state!.players[0].drinks).toBe(4);
  });

  it('offers the evolution choice', async () => {
    const user = userEvent.setup();
    park({ id: 'evolution' });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: /evolve/i }));
    expect(useGameStore.getState().state!.players[0].drinks).toBe(4);
  });

  it('takes a Saffron guess between 1 and 6', async () => {
    const user = userEvent.setup();
    park({ id: 'saffronNumber' });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: '4' }));
    const player = useGameStore.getState().state!.players[0];
    expect(player.drinks === 2 || player.extraTurns === 1).toBe(true);
  });

  it('runs a chugging contest between two players', async () => {
    const user = userEvent.setup();
    park({ id: 'chuggingContest' });
    render(<PromptModal />);
    await user.click(screen.getByRole('button', { name: /Cheese/ }));
    await user.click(screen.getByRole('button', { name: /Cheese won/i }));
    expect(useGameStore.getState().state!.players[1].extraTurns).toBe(1);
    expect(useGameStore.getState().state!.players[0].missedTurns).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/game/__tests__/PromptModal.test.tsx`
Expected: FAIL — "Failed to resolve import '../PromptModal'".

- [ ] **Step 3: Implement PlayerPicker**

Create `src/components/game/PlayerPicker.tsx`:

```tsx
import { getStarter } from '../../data/starters';
import type { Player } from '../../engine/types';

interface PlayerPickerProps {
  players: readonly Player[];
  onPick: (playerId: string) => void;
  /** Drinks assigned so far, keyed by player id, shown as a badge. */
  tally?: Readonly<Record<string, number>>;
  disabled?: boolean;
}

export default function PlayerPicker({ players, onPick, tally, disabled }: PlayerPickerProps) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {players.map((player) => (
        <li key={player.id}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(player.id)}
            className="flex min-h-16 w-full items-center gap-2 rounded-xl bg-surface0 px-3 text-left disabled:opacity-40"
          >
            <img src={getStarter(player.starter).sprite} alt="" className="size-10" />
            <span className="flex-1 truncate">{player.name}</span>
            {tally?.[player.id] ? (
              <span className="font-pokemon text-lg text-yellow">{tally[player.id]}</span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Implement PromptModal**

Create `src/components/game/PromptModal.tsx`:

```tsx
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
            onPick={(id) => setTally((t) => ({ ...t, [id]: (t[id] ?? 0) + 1 }))}
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
                Caught it
              </button>
            </>
          }
        >
          <p>If your favourite Pokémon is on the board you can catch it. If not, sadly drink 3.</p>
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
```

- [ ] **Step 5: Mount it in GameScreen**

Add the import and render `<PromptModal />` alongside `<SquareModal />`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/components/game`
Expected: PASS, 33 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components
git commit -m "feat(game): prompt modals, shipping the give-drinks flow the legacy build never had"
```

---

## Task 24: Game over screen

**Files:**
- Create: `src/components/game/GameOver.tsx`
- Modify: `src/components/game/GameScreen.tsx`
- Test: `src/components/game/__tests__/GameOver.test.tsx`

**Interfaces:**
- Consumes: `scoreboard` (Task 13), `useGameStore` (Task 14), `useLobbyStore` (Task 16)
- Produces: `<GameOver />` — final standings plus a play-again button that resets both stores

The legacy build had no win condition at all; the game simply never ended.

- [ ] **Step 1: Write the failing test**

Create `src/components/game/__tests__/GameOver.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import GameOver from '../GameOver';
import { useGameStore } from '../../../store/gameStore';
import { useLobbyStore } from '../../lobby/lobbyStore';

const input = {
  boardId: 'original',
  seed: 42,
  config: { fullDrink: 10, trainerBattles: false, offTableChance: 0, maxMissedTurns: 6 },
  players: [
    { name: 'Eden', starter: 'bulbasaur', gender: 'x' },
    { name: 'Cheese', starter: 'charmander', gender: 'x' },
  ],
} as const;

function finish() {
  const state = useGameStore.getState().state!;
  useGameStore.setState({
    state: {
      ...state,
      phase: { name: 'gameOver' },
      players: [
        { ...state.players[0], square: 62, drinks: 31, finishedAtTurn: 40 },
        { ...state.players[1], square: 48, drinks: 52 },
      ],
    },
  });
}

describe('GameOver', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useLobbyStore.getState().reset();
    useGameStore.getState().start(input);
  });

  it('renders nothing before the game is over', () => {
    const { container } = render(<GameOver />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the winner', () => {
    finish();
    render(<GameOver />);
    expect(screen.getByText(/Eden wins/i)).toBeInTheDocument();
  });

  it('lists final standings with drink totals', () => {
    finish();
    render(<GameOver />);
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText('52')).toBeInTheDocument();
  });

  it('calls out who drank the most', () => {
    finish();
    render(<GameOver />);
    expect(screen.getByText(/Cheese drank the most/i)).toBeInTheDocument();
  });

  it('resets both stores on play again', async () => {
    const user = userEvent.setup();
    finish();
    render(<GameOver />);
    await user.click(screen.getByRole('button', { name: /play again/i }));
    expect(useGameStore.getState().state).toBeNull();
    expect(useLobbyStore.getState().step).toBe('names');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/game/__tests__/GameOver.test.tsx`
Expected: FAIL — "Failed to resolve import '../GameOver'".

- [ ] **Step 3: Implement GameOver**

Create `src/components/game/GameOver.tsx`:

```tsx
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
```

- [ ] **Step 4: Mount it in GameScreen**

Add the import and render `<GameOver />` last, after `<PromptModal />`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/game`
Expected: PASS, 38 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components
git commit -m "feat(game): final standings and play again"
```

---

## Task 25: Audio

**Files:**
- Create: `src/audio/useAudio.ts`, `src/components/game/MuteButton.tsx`
- Modify: `src/components/lobby/Lobby.tsx`, `src/components/game/GameScreen.tsx`
- Test: `src/audio/__tests__/useAudio.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces:
  - `useAudioStore` with `{ muted, toggleMute }`, persisted to `localStorage`
  - `playSfx(name: SfxName): void`
  - `<MuteButton />`

The legacy build autoplayed a YouTube iframe on load, which modern browsers block and which is hostile on mobile data. Audio here is opt-in, muted by default, and preloads nothing until the first unmute.

- [ ] **Step 1: Write the failing test**

Create `src/audio/__tests__/useAudio.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAudioStore, playSfx } from '../useAudio';

describe('useAudio', () => {
  beforeEach(() => {
    localStorage.clear();
    useAudioStore.setState({ muted: true });
    vi.restoreAllMocks();
  });

  it('starts muted so nothing autoplays', () => {
    expect(useAudioStore.getState().muted).toBe(true);
  });

  it('toggles and persists the preference', () => {
    useAudioStore.getState().toggleMute();
    expect(useAudioStore.getState().muted).toBe(false);
    expect(localStorage.getItem('gcea:muted')).toBe('false');
  });

  it('plays nothing while muted', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    playSfx('roll');
    expect(play).not.toHaveBeenCalled();
  });

  it('plays once unmuted', () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    useAudioStore.getState().toggleMute();
    playSfx('roll');
    expect(play).toHaveBeenCalledOnce();
  });

  it('swallows a rejected play promise instead of throwing', async () => {
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('blocked'));
    useAudioStore.getState().toggleMute();
    expect(() => playSfx('roll')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/audio`
Expected: FAIL — "Failed to resolve import '../useAudio'".

- [ ] **Step 3: Confirm the audio test opts into jsdom**

No config change is needed. `useAudio.test.ts` needs `localStorage` and
`HTMLMediaElement`, so it carries `// @vitest-environment jsdom` on line 1 —
already included in the test file above. Vitest 4 has no
`environmentMatchGlobs`; the pragma is the per-file opt-in.

- [ ] **Step 4: Implement the audio hook**

```bash
mkdir -p public/audio
cp audio/pokerap.mp3 public/audio/
```

Create `src/audio/useAudio.ts`:

```ts
import { create } from 'zustand';

export type SfxName = 'roll' | 'move' | 'drink' | 'win';

/**
 * The Pokérap is the only audio asset carried over from the legacy build, so
 * every cue points at it for now. Drop distinct files into `public/audio/` and
 * change only this map — nothing else needs to know.
 */
const SFX_SRC: Record<SfxName, string> = {
  roll: '/audio/pokerap.mp3',
  move: '/audio/pokerap.mp3',
  drink: '/audio/pokerap.mp3',
  win: '/audio/pokerap.mp3',
};

const STORAGE_KEY = 'gcea:muted';

interface AudioStore {
  muted: boolean;
  toggleMute: () => void;
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  // Muted by default: browsers block autoplay and nobody wants a surprise
  // Pokérap on mobile data.
  muted: readMuted(),
  toggleMute: () => {
    const muted = !get().muted;
    try {
      localStorage.setItem(STORAGE_KEY, String(muted));
    } catch {
      // Private browsing; the preference just will not persist.
    }
    set({ muted });
  },
}));

const cache = new Map<SfxName, HTMLAudioElement>();

export function playSfx(name: SfxName): void {
  if (useAudioStore.getState().muted) return;
  let element = cache.get(name);
  if (!element) {
    element = new Audio(SFX_SRC[name]);
    cache.set(name, element);
  }
  element.currentTime = 0;
  // Autoplay policy can still reject; a missing sound must never break a turn.
  void element.play().catch(() => {});
}
```

- [ ] **Step 5: Implement the mute button**

Create `src/components/game/MuteButton.tsx`:

```tsx
import { useAudioStore } from '../../audio/useAudio';

export default function MuteButton() {
  const muted = useAudioStore((s) => s.muted);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      className="min-h-11 min-w-11 rounded-lg text-lg text-subtext"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
```

Render `<MuteButton />` in the `GameScreen` header next to the turn counter, and at the top of `Lobby`.

- [ ] **Step 6: Play a sound on rolls and wins**

In `src/components/game/useTurnDriver.ts`, import and fire the effect alongside the phase change:

```ts
import { playSfx } from '../../audio/useAudio';
```

Add a second effect at the end of `useTurnDriver`:

```ts
  useEffect(() => {
    if (phaseName === 'rolling') playSfx('roll');
    if (phaseName === 'gameOver') playSfx('win');
  }, [phaseName]);
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/audio`
Expected: PASS, 5 tests.

- [ ] **Step 8: Commit**

```bash
git add src public/audio vite.config.ts
git commit -m "feat(audio): opt-in sound with a persisted mute preference"
```

---

## Task 26: Legacy removal, PWA and mobile verification

**Files:**
- Delete: `index.html` legacy remnants already replaced in Task 1, plus `js/`, `css/style.css`, `css/pokemon.css`, `css/font-awesome.min.css`, `fonts/` (originals now in `public/fonts/`), `img/` originals now copied into `public/`
- Create: `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`
- Modify: `index.html`, `README.md`
- Test: `src/__tests__/smoke.test.tsx`

**Interfaces:**
- Consumes: everything
- Produces: a clean repo containing only the React app, an installable PWA manifest, and a README describing the new architecture

- [ ] **Step 1: Write the failing end-to-end smoke test**

Create `src/__tests__/smoke.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import App from '../App';
import { useGameStore } from '../store/gameStore';
import { useLobbyStore } from '../components/lobby/lobbyStore';

describe('end to end', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useLobbyStore.getState().reset();
  });

  it('gets from an empty lobby to a rolled die', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nameInput = screen.getByPlaceholderText(/enter a name/i);
    await user.type(nameInput, 'Eden{Enter}');
    await user.type(nameInput, 'Cheese{Enter}');
    await user.click(screen.getByRole('button', { name: /pick your pok/i }));

    await user.click(screen.getByRole('button', { name: /bulbasaur/i }));
    await user.click(screen.getByRole('button', { name: /charmander/i }));
    await user.click(screen.getByRole('button', { name: /ready to play/i }));

    expect(screen.getByText(/Eden's turn/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Eden on square 0')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /roll the dice/i }));
    await waitFor(() => expect(useGameStore.getState().state!.lastRoll).not.toBeNull());
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/__tests__/smoke.test.tsx`
Expected: PASS. If it fails, the failure points at a real wiring gap between the lobby and the game screen — fix that, not the test.

- [ ] **Step 3: Delete the legacy site**

Everything the new app needs was copied into `public/` in Tasks 1, 3, 5 and 25. The old sources stay reachable at the `v0-jquery` tag.

```bash
git rm -r js css fonts img audio
```

Verify the app still builds and every asset resolves:

```bash
npm run build && npm test
```

Expected: build succeeds, all tests pass. If a sprite 404s, it was missed in the Task 3 copy loop — copy it into `public/img/sprites/` from the `v0-jquery` tag with `git show v0-jquery:img/sprites/N.png > public/img/sprites/N.png`.

- [ ] **Step 4: Add the PWA manifest**

Create `public/manifest.webmanifest`:

```json
{
  "name": "Gotta Chug 'em All",
  "short_name": "Gotta Chug",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#11111b",
  "theme_color": "#1e1e2e",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Generate the icons from the Bulbasaur sprite as a placeholder:

```bash
npx --yes sharp-cli -i public/img/sprites/1.png -o public/ resize 192 192 --output icon-192.png
npx --yes sharp-cli -i public/img/sprites/1.png -o public/ resize 512 512 --output icon-512.png
```

Add to `<head>` in `index.html`:

```html
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

- [ ] **Step 5: Verify on a real phone viewport**

Run: `npm run dev -- --host`

Open the network URL on a phone (or Chrome DevTools device toolbar at 375×667) and confirm each of these:

1. The board fits the screen with no horizontal page scroll.
2. The roll button is reachable with one thumb and at least 44px tall.
3. Tapping the board does not zoom or pan the page.
4. Modals sit above the keyboard and above the home indicator.
5. Rotating to landscape and back re-fits the board without a reload.

Fix any that fail before committing.

- [ ] **Step 6: Rewrite the README**

Replace `README.md` (the outer fence below is four backticks; the README itself contains a three-backtick block):

````markdown
# Gotta Chug 'em All

A Pokémon-themed drinking board game for the web. Mobile-first, hotseat
multiplayer — pass one phone around the table.

## Running it

```bash
npm install
npm run dev
npm test
```

## Architecture

The game logic lives in `src/engine/` as a pure `reduce(state, action) => state`
with a seeded RNG. It imports no React and touches no DOM, so a whole game can
be played headlessly in a test — see `src/engine/__tests__/integration.test.ts`.

Board squares are declarative data in `src/data/boards/original.ts`. A square
carries an `Effect[]`, never a function, so rules are serializable, testable and
impossible to accidentally mutate.

The React layer dispatches serializable actions and reports animation completion
back to the engine. Nothing in `src/engine/` knows what a millisecond is; the
only place that does is `src/components/game/useTurnDriver.ts`.

### Adding a board

1. Add a coordinate + rule file under `src/data/boards/`.
2. Register it wherever `BOARD_ORIGINAL` is imported.

No engine changes are needed unless the board introduces a new `Effect` kind.

### Multiplayer, later

`useGameStore` records every dispatched action. Replaying that log against
`createGame(input)` with the same seed reproduces the game exactly, so
server-authoritative rooms are a transport layer, not a rewrite.

## Credits

The board artwork was found on Reddit and is not mine; attribution will be added
once the creator is identified. No ownership of the Pokémon brand or assets is
claimed.

The pre-2026 jQuery + Leaflet implementation is preserved at the `v0-jquery` tag.
````

- [ ] **Step 7: Run the full suite one last time**

Run: `npm test && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove legacy jquery site, add pwa manifest and rewrite readme"
```

---

## Done

At this point the game is playable end to end on a phone: lobby, board, dice,
every square rule on board 1, prompts, statuses, trainer battles, and a win
screen — with the engine covered by headless tests.

**Deferred by design:**

- **Board 2.** No square data exists for it anywhere in the legacy repo, only the
  image. It needs a coordinate + rule pass of its own, which is a data task, not
  an engine task.
- **Room multiplayer.** The action log and seeded RNG make this a transport
  problem. Nothing in this plan needs to change to add it.
