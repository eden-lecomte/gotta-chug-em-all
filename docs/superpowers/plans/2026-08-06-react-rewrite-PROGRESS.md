# React Rewrite — Execution Progress

Tracked handoff record for `2026-08-06-react-rewrite.md`. The SDD working
ledger lives at `.superpowers/sdd/2026-08-06-react-rewrite/progress.md`, which
is **gitignored** — this file is the durable copy that survives a fresh clone.

**Branch:** `2026-rewrite` (trunk of the rewrite; `master` is still the live
jQuery game and must not be merged into until Task 26)
**Base commit (pre-rewrite):** `2c81ca2`, also tagged **`v0-jquery`**
**Method as planned:** superpowers:subagent-driven-development — fresh
implementer subagent per task, task review after each, broad review at the end.
**Method actually used for Tasks 2-10:** direct execution (see "Deviation from
the SDD method" below).

---

## Status: 10 of 26 tasks complete

| Task | Status | Commits |
|---|---|---|
| 1. Project scaffold and asset diet | ✅ complete, review clean | `2c81ca2..6416e44` |
| 2. Seeded RNG | ✅ complete | `93f95cf` |
| 3. Core data types | ✅ complete | `9f1b347` |
| 4. Extract legacy square coordinates | ✅ complete | `094f02a` |
| 5. Board 1 square data | ✅ complete (1 deviation), reviewed | `35abc38` |
| 6. Engine state types and value resolution | ✅ complete (1 deviation), reviewed | `741c010` |
| 7. Effect interpreter — deterministic effects | ✅ complete | `36af968` |
| 8. Effect interpreter — random effects | ✅ complete (1 deviation) | `6afd9c0` |
| 9. Effect interpreter — prompts and player input | ✅ complete (1 deviation) | `48dbf7d` |
| 10. Status lifecycle | ✅ complete (1 deviation) | `653057f` |
| 11. Turn machine and reducer | ⬜ next | — |
| 12-26 | ⬜ pending | — |

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

### Task 4 — what landed

- `scripts/extract-legacy-squares.mjs`, `src/data/boards/original.coords.json`
  (63 squares), `src/data/__tests__/coords.test.ts`, and `resolveJsonModule` in
  `tsconfig.json`. Verbatim from the plan; **correct as written**, no deviations.
  Script printed `Wrote 63 squares.`, test 4/4, full suite 14/14, `tsc -b` clean,
  build succeeds. Re-running the script is byte-identical, so the JSON is
  reproducible from the legacy source.

Plan claims verified against `js/config.js` rather than assumed:

- `w = 2216` (line 180) and `maxZoom: 4` (line 172) with bounds unprojected at
  `getMaxZoom()-1` = zoom 3, so the `SPAN = 277` constant (`2216 / 2^3`) is
  right. Square 0's `[-232, 44]` converts to `x 15.884, y 83.755`, exactly the
  test's expectation.
- **The square-53 bug is real**: `js/squares-original.js:520` gives square 53
  `latlng: [-209, 209]`, byte-identical to square 50 at line 496. The script's
  hardcoded reposition is justified.

Extra check worth repeating on any future board: the uniqueness assertion only
catches *duplicate* positions, not a square that is unique but in the wrong
place. Measuring the distance between consecutive squares along the spiral
found every step in 7.58..9.39 units (median 8.30) with zero outliers above 2x
median — so square 53 is now correctly placed and no other square is stranded.
That sweep is the cheap way to validate Task 5's data too.

Only square 0 (`Start`) has an empty `action`; every square has `text`.

### Task 5 — what landed

- `src/data/boards/original.ts` (all 63 squares) and
  `src/data/__tests__/original.test.ts`. Test failed on the missing import
  first, then 9/9 passed. Full suite 23/23, `tsc -b` clean, build succeeds.
- **The feared abbreviation did not happen.** `RULES` carries all 63 ids,
  contiguous 0..62, and the source contains no `...` / `remaining` / `TODO`
  elision markers. Worth re-running that grep on any future board.

**Deviation 1 (first real plan bug): the WebP encoding was wrong.** Step 6
specifies `--quality 82` lossy and predicts a file "well under the 644KB
original". Executed as written it produced **1.3MB — twice the PNG**. The board
is flat-colour pixel art with tiny per-square text, exactly the content lossy
YUV encoding handles worst. Measured alternatives:

| encoding | size |
|---|---|
| lossless | **328KB** |
| near-lossless q80 | 332KB |
| lossy q82 (plan) | 1293KB |
| lossy q90 | 1536KB |
| original PNG | 644KB |

Shipped **lossless** — it is the only option that meets the plan's own stated
intent. Verified the RGB data is byte-identical to the source PNG (0 differing
subpixels) and that the alpha channel sharp dropped was fully opaque (0
non-opaque pixels), so nothing was lost. **Any later board conversion should
use lossless, not the plan's q82.** Plan Step 6 has been corrected in place
(see correction 3 below), so the plan text now reads `--lossless`.

Correctness checks beyond the plan's 9 tests — none of these are covered by the
suite, and each would have surfaced only much later:

- **Unbound `var` refs: none.** Every `{kind:'var'}` is bound by an earlier
  `roll` / `rollBranch as` / `rollWhile as` in the same square's queue. An
  unbound one would not fail typecheck and would only break in Task 7-8.
- **Empty-effect squares: only square 0 (Start)**, as intended — a dropped rule
  would show up here.
- **JSON round-trip is identical and there are zero `undefined`-valued keys**,
  satisfying the global serializability constraint.
- **Kind tally**: 1 start, 40 normal, 7 goldGym, 14 silverZone, 1 finish = 63.
- Cerulean Gym (13) is the one of the four bug fixes with **no dedicated test**;
  verified by hand that it is `self 2, everyoneElse 1`.

Classification cross-checked against the legacy source, not just the plan:
evaluating `js/squares-original.js` and reading its flags gives `gymGold` =
`6,13,19,32,43,52,58` and silver-flagged (`gymSilver`/`silphCo`/`safariZone`) =
`23,24,25,26,27,36,37,38,39,40,48,49,50,51`. **Both match the new board
exactly.**

### Task 6 — what landed

- `src/engine/types.ts`, `src/engine/amount.ts`, `src/engine/targets.ts` and
  their two tests. amount 9/9, targets 8/8, full suite 40/40, `tsc -b` clean,
  build succeeds.

**Deviation 2: `src/engine/types.ts` does not compile as written.** The plan's
import list pulls in `PromptId`, but `Prompt` and `PromptResult` spell their ids
as string literals (each variant carries a different payload), so it is never
used — and `noUnusedLocals` makes that error TS6196, a hard failure. Removed it
from the import and left a comment saying why.

Before accepting that removal, confirmed with a temporary type-level assertion
(`[A] extends [B] ? [B] extends [A] …`) that `Prompt['id']` and
`PromptResult['id']` are each **exactly** `PromptId` — bidirectionally, so a
prompt cannot be silently missing. The check file was deleted after it passed;
recreate it if the prompt unions are edited in Tasks 9 or 23.

Checks beyond the plan's tests:

- **First contact between engine code and real board data**: bound every var
  each square declares, then pushed all **127 Amounts** in `BOARD_ORIGINAL`
  through `resolveAmount`. Every one returned a non-negative integer, none
  threw. This is what catches a binder/reference name mismatch that Task 5's
  static scan cannot.
- `resolveTarget` returns correct seat-ordered ids for all four targets;
  `updatePlayer` and `pushLog` leave the input state untouched.
- Engine purity holds: no React, Zustand, DOM or `Math.random` anywhere under
  `src/engine/`, and no jsdom pragma, so the tests stay DOM-free.

Note on `resolveAmount`: the zero-clamp is applied **once at the top level**,
not per sub-expression. That is correct for the current board (the only negative
is square 30's `offset … -1`), but a future rule nesting a negative inside a
`product` or `half` would see it propagate. Worth remembering rather than
changing now.

### Task 7 — what landed

- `src/engine/effects.ts`, `src/engine/__tests__/effects.test.ts` and the shared
  `src/engine/__tests__/factories.ts`, all transcribed from the plan verbatim.
  **The plan's code was correct as written** — no deviations, no debugging.
  Test failed on the missing import first, then passed. Full suite 57/57,
  `tsc -b` clean, `npm run build` succeeds.
- **Plan correction 5 (cosmetic): the plan's Step 5 predicted 16 tests; the file
  it lists contains 17.** Corrected in the plan. Nothing else changed.
- Engine purity re-verified after the addition: still no React, Zustand, DOM or
  `Math.random` under `src/engine/`, and no jsdom pragma.

Second contact between the interpreter and real board data, the check worth
repeating in Tasks 8 and 9: walked every effect in `BOARD_ORIGINAL` — including
those nested inside `rollBranch` branches, `rollTimes` arms and
`ifAnyPlayerHasStatus` arms — bound every var the board can reference, and
pushed each through `applyEffect`. **64 deterministic effects applied without
throwing**, and every throw that did occur was the intended
`Unhandled effect kind` for a Task 8/9 kind. Board-wide kind tally:

```
drink 31   applyStatus 12   give 10   note 10   roll 6   rollBranch 6
prompt 6   missTurn 4   extraTurn 3   moveTo 3   setStarter 1
randomSquare 1   rollWhile 1   rollTimes 1   movePlayerBy 1
ifAnyPlayerHasStatus 1   moveBy 0
```

`moveBy` is at zero because no square uses it directly — it exists for Task 8's
`randomSquare` and the turn machine. Do not prune it as dead code.

### Task 8 — what landed

- `src/engine/effects.ts` extended with `roll`, `rollBranch`, `rollWhile`,
  `rollTimes`, `randomSquare` and `ifAnyPlayerHasStatus`, plus the exported
  `matchesCond`, and `src/engine/__tests__/effects.random.test.ts`. The plan's
  **implementation** code was correct as written — in particular the `rollWhile`
  loop the plan flagged as off-by-one-prone is right. Full suite 74/74,
  `tsc -b` clean, `npm run build` succeeds, engine still DOM-free.
- **Deviation 1: two of the plan's tests were strengthened, not weakened.** The
  plan's `randomSquare` fallback test scanned 400 seeds for any queue whose JSON
  contained `"value":2` — but squares 4, 13, 50 and 51 all carry a literal 2, so
  the test passed on real square data and **never exercised the fallback at
  all**. It now pins the seed to square 0 (the board's only effect-less square)
  via a new `seedForSquare` helper and asserts the queue exactly. A second test
  pins a Metronome copy of square 52 verbatim, and a third replays the seed
  stream independently to assert `rollWhile`'s count *and* resulting seed. Both
  the plan's test listing and its predicted count (14 → 17) are corrected in
  place; the plan block and the repo file are byte-identical again.

Audit run before committing, worth repeating in Task 9:

- **Every `rollBranch` on the board covers all six faces.** A gap would throw
  `no branch matched` mid-game the first time that face came up, and no test
  would have caught it — the plan only tests an artificial empty-branch case.
- **Metronome terminates.** Over 3,000 seeds it picked all 63 squares, including
  itself 59 times and the two Abra teleports 94 times; worst-case drain was 7
  steps. The self-reference is bounded in practice, so it needs no guard, but
  **copying square 11/28 physically teleports the player** — the legacy text
  says "drink or give what it says", so this is a rule widening someone may want
  to narrow.
- **Determinism holds**: 14 squares containing random effects, replayed twice
  from each of 200 seeds, produced byte-identical states — 0 mismatches.

### Task 9 — what landed

- `src/engine/prompts.ts` and `src/engine/__tests__/prompts.test.ts`, plus the
  four parking cases in `applyEffect` (`give`, `movePlayerBy`, `prompt`, and
  `applyStatus` with `target: 'chosen'`). Full suite 88/88, `tsc -b` clean,
  `npm run build` succeeds, engine still DOM-free.
- **Deviation 1: two of the plan's tests were wrong and were fixed.** The
  Snorlax and Koffing cases asserted the refusal penalty straight off
  `resolvePrompt`, but `resolvePrompt` only *queues* it — `drainQueue` applies
  it. The sibling Evolution, Saffron and Pokeball cases already wrapped their
  calls; these two now do too. This is the plan's third substantive error and
  the first one its own tests caught. Plan corrected in place, predicted count
  13 → 14, and the plan block is byte-identical to the repo file again.

Audit run before committing — **this is a dry run of Task 13's integration
test and the strongest evidence so far that the engine is coherent**: every one
of the 63 squares was drained from 60 different seeds (3,780 plays), with every
prompt auto-answered and every note acked, until the phase reached `turnEnd`.

- **No throws, no unexpected phases, nothing stalled.** Worst case was a single
  park/resume cycle per square.
- All eight prompt kinds were exercised: `givePlayers` 507, `choosePlayer` 123,
  `evolution` 62, `saffronNumber` 61, `snorlaxSong` 61, and 60 each of
  `chuggingContest`, `koffingSmoke`, `pokeballCatch`.

### Task 10 — what landed

- `src/engine/statuses.ts` and `src/engine/__tests__/statuses.test.ts`. The
  plan's code was correct as written. Full suite 112/112, `tsc -b` clean,
  `npm run build` succeeds, engine still DOM-free.
- **Deviation 1 (planned): the square 38 decision is implemented here.**
  `StatusExpiry` gains `rollToClear`, `STATUS_META` entries carry an optional
  `clearsOn` list of faces, and square 38 applies `confuseRay` with it. The turn
  machine drives it through the two new exports, `rollToClearStatuses` and
  `clearByRoll`. `expireAfterTurn` deliberately ignores `rollToClear`, which is
  pinned by its own test — without that, confusion would still evaporate after
  one turn and the whole change would be inert.

Audit run before committing — every status the board applies, checked against
the mechanism its expiry names:

| status | expiry |
|---|---|
| confuseRay | rollToClear |
| copying, doubleMove, stringShot | afterNextTurn |
| inSafariZone, inSilphCo, inTower, possessed, reflect, zubats | leaveSquare |
| nonDominantHand, ruleMaker | endOfGame |

Each one is removable by its own expiry **and survives the mechanisms that are
not its own** — so nothing is silently dropped early and nothing is stuck
forever. The audit also fails loudly if a `rollToClear` status has no
`clearsOn`, which would make it permanent.

**Two carry-forward notes for Task 11**, both things only the turn machine can
finish:

1. **`skipNextGym` is applied with `expires: 'endOfGame'`**, so nothing ever
   removes it. Square 34's text is "skip the *next* gym", so **Task 11 must call
   `clearStatus` once the holder passes a gold gym**, or evolving grants gym
   immunity for the rest of the game. It is the one status in `STATUS_META` no
   square applies — it comes from the evolution prompt in `prompts.ts`.
2. **`zubats` has no logic yet.** `movementFor` handles String Shot and the
   bicycle, but "roll 3 or more to escape this square" is a movement *gate*, not
   a modifier, so it belongs to the turn machine alongside the `rollToClear`
   roll.

### Open finding from Task 9: Pokéball loses half its rule (resolved in `05ef6c8`)

Square 61's action reads "If your favorite Pokemon is on the board, roll a 1-3
to catch it! Roll a 4-6 and it got away, drink 3. If your favorite is not on the
board, sadly drink 3." The plan implements `onBoard ? [] : [drink(3)]` — so
answering **yes costs nothing and never rolls**. The plan's test only covers the
`onBoard: false` path, so nothing flags it. This is the same class as the three
findings in the Task 5/6 review: the screen promises a roll that the engine does
not make. Fixing it means rolling in the `pokeballCatch` branch of
`resolvePrompt` and queueing `drink(3)` on a 4-6.

Two smaller ones in `src/engine/prompts.ts`, neither urgent:

- The Haunter move clamps with a hardcoded `Math.min(62, …)` rather than the
  board's last square; `effects.ts` already derives `LAST_SQUARE` properly.
- `chuggingContest` does not check that `winnerId` is either the active player
  or the named opponent, so a malformed result can hand a third player a turn.

---

## Plan corrections made during execution

All are already applied to `2026-08-06-react-rewrite.md`. Listed here so a
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

3. **Task 5 Step 6 specified the wrong WebP encoding.** `--quality 82` lossy
   produced 1293KB against a 644KB source PNG — twice the size, and lossy on
   pixel-art text. Step 6 now reads `--lossless`, which yields 328KB with
   byte-identical RGB. Applies to any future board image too. Full measurements
   in the Task 5 notes above.

4. **Task 6 Step 1 imports `PromptId` but never uses it**, which is error TS6196
   under `noUnusedLocals`. The plan's Step 1 listing now omits it. If you are
   copying from an older revision of the plan, drop `PromptId` from the
   `../data/types` import in `src/engine/types.ts`.

---

## Environment notes

Rediscovering these costs a fresh session real time.

- **`node_modules` is not committed.** A fresh clone must `npm install` before
  anything runs (~150 packages, a few seconds).
- **Do not commit `package-lock.json` churn.** npm 10.9.7 rewrites the lockfile's
  `version` field to `0.0.0` and strips `libc` metadata from optional deps. It is
  noise from a version skew, unrelated to any task — `git checkout
  package-lock.json` before committing. (The committed lockfile says `1.0.0`
  while `package.json` says `0.0.0`; pre-existing and harmless.)
- **Verification loop used per task**, all four should be clean before commit:
  `npx vitest run <the task's test file>` → `npm test` → `npx tsc -b --noEmit`
  → `npm run build`.
- **Running a `.ts` module ad hoc**: `npx vite-node <file.mjs>` handles TS
  imports. It needs a *file*; `vite-node -e "…"` is not supported.
- **`sharp` is not a project dependency.** Task 5 used the npx-cached copy at
  `/root/.npm/_npx/*/node_modules/sharp`. Re-resolve that path rather than
  assuming it, or `npx --yes sharp-cli`.
- **Playwright**: the pre-installed browser is at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. A fresh `npm i
  playwright` pulls a version expecting a different build and fails; pass
  `executablePath` explicitly. Do not run `playwright install`.
- **The sandbox proxy blocks `github.io` and the GitHub Pages API**, so the
  deployed site cannot be checked from here. It does allow npm and git.

### GitHub Pages, for when Task 26 deploys

Project-site URL is `https://eden-lecomte.github.io/gotta-chug-em-all/`. Pages
is currently serving the `gh-pages` branch, a 2016 auto-generated stub that is
not the game. Two things follow:

- Switching Settings → Pages → Source to `master` / `root` publishes the legacy
  game; that is what a user asking for "the old site" wants.
- The rewrite's assets use **absolute** paths (`/img/sprites/1.png`,
  `/img/board-original.webp`). Served from the `/gotta-chug-em-all/` subpath
  those resolve to the domain root and 404. **Task 26 must set `base:
  '/gotta-chug-em-all/'` in `vite.config.ts`** before deploying.

---

## Deviation from the SDD method

Tasks 2-6 were executed **directly, not via dispatched subagents** — the
`superpowers:subagent-driven-development` skill is not available in every
session. Consequences a resuming agent should know:

- ~~**No task has had an independent review since Task 1.**~~ Tasks 5 and 6 were
  reviewed on 2026-08-10; see "Review of Tasks 5 and 6" below. Tasks 2-4 remain
  unreviewed but are small and verbatim from the plan.
- Each task still followed the plan's TDD steps (test written, observed failing
  for the right reason, then implemented) and was committed separately from its
  ledger update, so per-task diffs stay reviewable.
- **Branch/merge workflow used:** work committed on `claude/refactor-task-2-kt6myn`,
  then fast-forward merged into `2026-rewrite` and both pushed. The two branches
  are kept identical. The working-branch name is historical — it is a workspace,
  not scoped to Task 2. No PR was opened.

---

## Review of Tasks 5 and 6 (2026-08-10)

Method: every file from both commits diffed against its plan code block, then
all 63 squares cross-read against `js/squares-original.js` and the player-facing
`action` strings in `original.coords.json`.

**No Critical findings. No transcription drift and no weakened tests** — every
file in `35abc38` and `741c010` is byte-identical to its plan block, except one
comment in `src/engine/types.ts` that drops the plan's warning about *why*
`PromptId` must not be imported. Restore the fuller wording if that file is
touched again, or the import comes back.

The four claimed legacy bug fixes (squares 6, 13, 16, 39, 54) are all real and
correctly encoded, verified against the legacy closures. Squares 32, 40, 49, 51,
57, 58 and 62 — the ones with non-obvious branch structure — also match.

> **Resolved 2026-08-11 in `05ef6c8`.** All four findings below (three here
> plus the Pokéball one from Task 9) were decided and, except square 38,
> implemented. The original text is kept for the reasoning; see "Rule decisions"
> below for what was chosen.

### Open findings: three squares where the displayed text and the effects disagree

Each square's `action` string is the legacy text verbatim and is shown to
players. In these three the encoded effects do something different. None is a
crash; all three are **rule decisions someone has to make**, so they are logged
rather than silently changed.

1. **Square 12 (Gary) — rounding is inverted relative to the text.** The action
   reads "Roll a die. Drink half, give half(round up)", but the effects round
   the *drink* up and the *give* down (`half … round:'up'` then `round:'down'`).
   On a roll of 5 the screen implies give 3, the engine gives 2. The plan chose
   this deliberately — it conserves the roll, and the plan's own amount test
   pins "drink 3, give 2 on a 5" — so fixing it means editing the plan, the
   test and the board data together. Alternative: reword the action text.
   The legacy code (`drink: diceRoll/2, give: diceRoll/2`) rounds neither, so
   the text is the only authority here.

2. **Square 9 (Clefairy) — the fallback rule has no representation.** The action
   promises "If no drink is given or taken, just drink 2", but the square's only
   effect is `{kind:'randomSquare'}` and no `Effect` variant can express "if
   that produced no drink, drink 2". **Task 8 implements `randomSquare` and must
   decide this.** Two other hazards belong to the same decision: the random pick
   can land on square 9 itself (unbounded recursion) and on squares 11/28 (the
   Abra teleports), neither of which the data guards against.

3. **Square 38 (Lapras) — `confuseRay` expiry contradicts its own rule.** The
   status is applied with `expires: 'afterNextTurn'`, which clears it
   unconditionally after one turn, but both the action text and the `StatusId`
   comment in `src/data/types.ts` say it clears only on a roll of 1-3.
   `StatusExpiry` has no "clears on a condition" variant. **Task 10 owns status
   lifecycle and must reconcile the two**, either by adding an expiry kind or by
   having the confuse-ray roll remove the status explicitly.

### Minor, no action needed now

- `Effect` declares `{kind:'moveBy'}` but no square uses it — it exists for
  Task 8's `randomSquare` and Task 11. Keep, do not prune.
- `getSquare` indexes `board.squares[id]` by array position, not by `id`. Safe
  today (ids are contiguous 0..62, checked) but it is a lookup that silently
  returns the wrong square if a board ever numbers its squares sparsely.
- `resolveTarget('everyone')` includes players who have already finished. Fine
  for a drinking game; noted in case Task 11 wants otherwise.

---

## Rule decisions (2026-08-11, commit `05ef6c8`)

Four squares showed the player one rule and ran another. All four were decided
together; three are implemented, the fourth shapes Task 10. **These are settled
— do not re-open them from the plan text, which has been updated to match.**

| Square | Decision |
|---|---|
| 12 Gary | **Both halves round up.** A roll of 5 costs 3 and gives 3. |
| 9 Clefairy | **Metronome copies drink/give only**, pays 2 when the copy pays nothing. |
| 61 Pokéball | **Yes now rolls**: 1-3 catches it free, 4-6 costs 3. |
| 38 Lapras | **Add a conditional expiry** so confuseRay clears only on a 1-3 roll — Task 10. |

Notes a later task will need:

- **Metronome's filter is recursive and keeps roll binders.** `copyableEffects`
  strips movement, statuses, prompts, flavour and a nested `randomSquare` at
  every branch depth, but always keeps `roll`/`rollWhile`, because a `drink`
  reading a var whose binder was dropped throws on an unbound variable. That
  also means Metronome can no longer recurse into square 9. `paysADrink` decides
  the fallback statically, by scanning the stripped tree for any `drink`/`give`.
- Post-change audit: over 3,000 seeds no pick leaked a non-payment effect;
  1,451 picks copied a payment and 1,549 fell back to 2. All 63 squares still
  play to `turnEnd` from 60 seeds each.
- **Task 10 must add a `StatusExpiry` variant** for "clears when a roll
  succeeds" and apply it to `confuseRay`. The square-38 data still says
  `afterNextTurn` and needs updating alongside it.
- Still open from the Task 9 review, not part of this batch: the hardcoded
  `Math.min(62, …)` clamp in `prompts.ts`, and `chuggingContest` not validating
  that `winnerId` is the active player or the named opponent.

---

## How to resume

1. Read `docs/superpowers/plans/2026-08-06-react-rewrite.md` — the plan carries
   full implementation code for every task.
2. Invoke `superpowers:subagent-driven-development` **if it is available**;
   otherwise execute directly, keeping the TDD steps and per-task commits.
3. Run its `scripts/sdd-workspace` on the plan path to recreate the workspace,
   then seed a fresh ledger from the Status table above. **Do not re-dispatch
   Tasks 1-10** — all are committed on `2026-rewrite`.
4. Resume at **Task 11 (Turn machine and reducer), BASE `653057f`**. Read the
   two carry-forward notes at the end of "Task 10 — what landed" first; both
   are things only the turn machine can finish.

Task 5's board data is now the substrate for Tasks 6-13. Two audit scripts from
the notes above are worth re-running whenever engine or board data changes: the
board audit (unbound-var scan, empty-effect scan, JSON round-trip, kind tally)
and the Task 6 sweep that resolves all 127 board Amounts through
`resolveAmount`.

The plan's code has been wrong twice in substance (corrections 3 and 4), both caught by
running it rather than reading it. **Typecheck every task before trusting its
listing** — Task 6's bug was a hard compile error, not a subtle one, and would
have been found in seconds by running `tsc` right after writing the file rather
than at the end of the task.

### State at handoff

Tasks 1-10 complete, and Tasks 5-6 reviewed. Local `2026-rewrite` is ahead of
both pushed branches — **the commits below from `ec543f9` onward are unpushed**
(this machine's SSH key is not usable from the agent sandbox; fetch and push
over HTTPS with the `gh` credential helper instead).

```text
653057f  feat(engine): status registry, movement modifiers and zone upkeep   <- Task 10
889717a  docs: record the four rule decisions and their consequences
05ef6c8  fix(rules): resolve four text-vs-effect mismatches on the board
6115f45  docs: ledger task 9, correct the plan's two undrained prompt tests
48dbf7d  feat(engine): prompt-parking effects and prompt resolution          <- Task 9
dc58766  docs: ledger task 8, fix the plan's false-positive metronome test
6afd9c0  feat(engine): seeded random effects — branches, repeats, metronome  <- Task 8
a8d0adb  docs: ledger task 7 complete, resume point now task 8
36af968  feat(engine): deterministic effect interpreter and queue drain      <- Task 7
ec543f9  docs: review tasks 5 and 6, log three text-vs-effect mismatches
d373c73  docs: ledger task 6, correct plan's unused PromptId import
741c010  feat(engine): state types, amount evaluator and target resolution   <- Task 6
134f2ce  docs: ledger task 5, correct plan's webp step to lossless
35abc38  feat(data): board 1 squares as declarative effects, fixing 4 bugs   <- Task 5
c0a6d3a  docs: ledger task 4 complete, resume point now task 5
094f02a  feat(data): extract board 1 coordinates from legacy leaflet latlng  <- Task 4
8bb2c47  docs: ledger task 3 complete, resume point now task 4
9f1b347  feat(data): effect/square types and starter roster                  <- Task 3
65094a3  docs: ledger task 2 complete, resume point now task 3
93f95cf  feat(engine): seeded deterministic rng                              <- Task 2
b1f654e  docs: add execution progress record for the react rewrite
```

Green at handoff: **112 tests across 11 files**, `tsc -b` clean, `npm run build`
succeeds. What exists so far is
`src/engine/{rng,types,amount,targets,effects,prompts,statuses}.ts`
and `src/data/{types,starters}.ts` +
`src/data/boards/{original.ts,original.coords.json}`.
No React beyond the Task 1 scaffold — the app still renders the smoke-test shell,
which is expected until Task 19.

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
