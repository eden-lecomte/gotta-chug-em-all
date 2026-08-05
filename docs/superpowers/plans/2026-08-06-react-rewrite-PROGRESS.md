# React Rewrite — Execution Progress

Tracked handoff record for `2026-08-06-react-rewrite.md`. The SDD working
ledger lives at `.superpowers/sdd/2026-08-06-react-rewrite/progress.md`, which
is **gitignored** — this file is the durable copy that survives a fresh clone.

**Branch:** `2026-rewrite`
**Base commit (pre-rewrite):** `2c81ca2`, also tagged **`v0-jquery`**
**Method:** superpowers:subagent-driven-development — fresh implementer subagent
per task, task review after each, broad review at the end.

---

## Status: 3 of 26 tasks complete

| Task | Status | Commits |
|---|---|---|
| 1. Project scaffold and asset diet | ✅ complete, review clean | `2c81ca2..6416e44` |
| 2. Seeded RNG | ✅ complete | `93f95cf` |
| 3. Core data types | ✅ complete | `9f1b347` |
| 4. Extract legacy square coordinates | ⬜ next | — |
| 5-26 | ⬜ pending | — |

### Task 1 — what landed

- Vite 8.2.0 + React 19.2.8 + TypeScript 7.0.2 + Tailwind 4.3.3 + Vitest 4.1.10
  scaffolded by hand (see deviation 1 below). Smoke test passes, `npm run build`
  succeeds, both tsconfigs typecheck clean.
- **56MB shed:** `pokemon-sugimori.tar.gz` (unreferenced) and `img/main-sprites/`
  (7,756 files duplicating `img/sprites/`), plus dead vendor JS/CSS
  (`js/maps/`, `css/maps/`, `ddslick`, `spiderfier`, `watch.js`).
- Catppuccin Mocha tokens + Pokémon fonts wired into `src/index.css`.
- `index.html` rebuilt with `viewport-fit=cover`, dropping the legacy
  `user-scalable=0` that broke accessibility zoom.

**Verified still present** (Tasks 3, 4, 5, 25 read these; do not delete before
Task 26): `js/squares-original.js`, `img/sprites/`, `img/board-original.png`,
`audio/pokerap.mp3`.

### Task 2 — what landed

- `src/engine/rng.ts` and `src/engine/__tests__/rng.test.ts`, both transcribed
  from the plan verbatim. **The plan's code was correct as written** — no
  deviations, no debugging needed.
- Followed TDD as specified: the test failed with the expected
  "Cannot find module '../rng'" before implementation, then 6/6 passed after.
- Full suite 7/7 green, `tsc -b` clean, `npm run build` succeeds.

Global constraints verified rather than assumed:

- `src/engine/` imports nothing at all — no React, Zustand or DOM.
- No `// @vitest-environment jsdom` pragma in the engine tests, so they run
  under the default node environment (`environment: 0ms` in the reporter).
- `grep Math.random src/` returns nothing outside `rng.ts`.

Beyond the plan's 6 tests, the PRNG was sanity-checked because every later
task's determinism rests on it: over 600k rolls the six faces land within
0.33% of uniform, the seed stream does not repeat within 200k steps (the
`(seed + 0x6d2b79f5) | 0` Weyl advance has a full 2^32 period), and a 1000-roll
sequence replays identically from the same seed while diverging from a
different one.

### Task 3 — what landed

- `src/data/types.ts`, `src/data/starters.ts`, `src/data/__tests__/starters.test.ts`,
  all transcribed from the plan verbatim. **The plan's code was correct as
  written** — no deviations. Test failed on the missing import first, then 3/3
  passed. Full suite 10/10, `tsc -b` clean, `npm run build` succeeds.
- 20 starter sprites (10 `.png` + 10 `.gif`) copied into `public/img/sprites/`,
  824K total. They ship to `dist/` correctly.

Plan claims checked against the legacy source rather than taken on trust:

- The ten dex numbers (1, 4, 7, 10, 13, 16, 25, 29, 32, 60) are exactly the
  sprite refs in `css/pokemon.css`. Confirmed by grep.
- The `polywag` misspelling is real (`css/pokemon.css:55`), so the plan's
  rename to `poliwag` at dex 60 is correct.

Gap worth knowing about: **the plan's test asserts sprite path *strings* but
never checks the files exist.** A typo'd path would pass the suite and only
surface in Task 17's starter picker. Verified out-of-band that all 20 resolve
under `public/`; `STARTERS` and every member are `Object.isFrozen`, and
`getStarter` throws on an unknown id. Consider a real existence check if a
later task touches this data.

Note `DEX` is typed `Record<StarterId, …>`, so a starter added to the union
without a roster entry is a compile error — the "ten starters" count is
typechecked, not just asserted.

---

## Plan corrections made during execution

Both are already applied to `2026-08-06-react-rewrite.md`. Listed here so a
resuming agent knows why the plan text differs from a naive reading.

1. **`npm create vite` cannot run here.** The plan's Task 1 Step 3 assumed an
   interactive "Ignore files and continue" prompt. The directory is non-empty
   and the prompt hangs in a non-interactive harness. Task 1 was hand-scaffolded
   to the same end state. Only affected Task 1; no further action needed.

2. **Vitest 4 removed `environmentMatchGlobs`.** Verified absent from the
   installed package. The plan originally used it to route component tests to
   jsdom. Now: `vite.config.ts` keeps `environment: 'node'` as the default (which
   preserves the global constraint that `src/engine/` tests run DOM-free), and
   each of the 15 DOM-dependent test files carries `// @vitest-environment jsdom`
   on line 1. **The plan's test file listings already include this pragma** —
   copy them verbatim. `defineConfig` is imported from `vitest/config`, not
   `vite`, so the `test` field is typed.

---

## How to resume

1. Read `docs/superpowers/plans/2026-08-06-react-rewrite.md` — the plan carries
   full implementation code for every task.
2. Invoke `superpowers:subagent-driven-development`.
3. Run its `scripts/sdd-workspace` on the plan path to recreate the workspace,
   then seed a fresh ledger from the Status table above. **Do not re-dispatch
   Tasks 1, 2 or 3** — all are committed and merged to `2026-rewrite`.
4. Resume at **Task 4 (Extract legacy square coordinates), BASE `9f1b347`**.

Note: Tasks 2 and 3 were executed directly rather than via dispatched subagents,
so neither has had an independent task review. Both are small and verbatim from
the plan (four source files total), and both are exercised by every later engine
task, but a reviewer picking this up may want to fold them into the next review
package.

Per task: `scripts/task-brief PLAN N` → dispatch implementer → record BASE before
dispatching → `scripts/review-package PLAN BASE HEAD` → dispatch task reviewer →
fix loop if needed → ledger the completion.

### Review-package caveat

Task 26 deletes the remaining legacy site, so its raw diff will again be
enormous (thousands of asset deletions). As with Task 1, filter the bulk
deletions out of the diff body and hand the reviewer a path list separately,
otherwise the package is unreadable. Task 1's filtered package shrank from
68,573 lines to 1,896.

---

## Model recommendations per task

The plan carries complete implementation code, so most tasks are transcription
plus debugging. None of the plan's code has ever been executed, so the executor
will hit real bugs in it — that is what sets the floor.

| Tasks | Model |
|---|---|
| 1, 3, 4, 16-18, 20, 21, 24, 25, 26 | cheap tier (mechanical, complete spec) |
| 2, 6, 7, 9, 10, 14, 15, 19, 22, 23 | mid tier (real logic, tests pin behaviour) |
| **5, 8, 11, 12, 13** | **most capable** |

The five flagged tasks are where untested plan code is most likely wrong:

- **5** — 63 squares of dense data; the failure mode is *abbreviation*
  (`// ... remaining squares`) silently dropping half the board's rules.
- **8** — seed-searching test helpers; an off-by-one in `rollWhile` needs real
  reasoning to locate.
- **11** — the turn machine. Gold-gym stops, Zubats pinning and `LAST_SQUARE`
  clamping interact in ways that were reasoned about but never executed.
- **12** — `ACK_BATTLE` was rewritten during plan self-review and has never been
  typechecked.
- **13** — the full-game integration test throws `Stalled in phase X`.
  Diagnosing that means finding a missing reducer transition.

### The risk to watch, on every task

**Making a test pass by weakening the test.** The Task 13 integration test is the
whole safety net. If a subagent loosens an assertion or drops a
`playToCompletion` check, the net is gone and only a test-file diff reveals it.
Check this explicitly in each review.
