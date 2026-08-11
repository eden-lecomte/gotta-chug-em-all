# Gotta Chug 'em All

A Pokémon-themed drinking board game for the web. Mobile-first, hotseat
multiplayer — pass one phone around the table.

## Running it

```bash
npm install
npm run dev
npm test
```

`npm run build` typechecks before bundling, so a type error fails the build.

Serving from a subpath (a GitHub Pages project site) needs the base path:

```bash
BASE_PATH=/gotta-chug-em-all/ npm run build
```

## Architecture

The game logic lives in `src/engine/` as a pure `reduce(state, action) => state`
with a seeded RNG. It imports no React and touches no DOM, so a whole game can
be played headlessly in a test — see `src/engine/__tests__/integration.test.ts`,
which plays 100 seeded games to completion.

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
