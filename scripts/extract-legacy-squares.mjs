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
