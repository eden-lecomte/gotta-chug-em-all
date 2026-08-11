# Source assets

Everything here is the original artwork recovered from the pre-rewrite site
(tag `v0-jquery`, removed in `3adb808`). It is **not** part of the build: Vite
only copies [`public/`](../public), so nothing in this directory ships to the
browser unless it is deliberately copied or imported.

Keep it that way. This directory is ~60 MB across ~11,700 files; the built site
is a few hundred kilobytes plus the handful of assets listed below.

## Layout

| Path | What it is |
| --- | --- |
| `audio/pokemon-cries/pokemon/cries/*.ogg` | Every Pokémon cry, named by national dex number |
| `img/sprites/*.png` | Gen-V style front sprites, named by national dex number |
| `img/sprites/animated/*.gif` | Animated versions of the same, dex-numbered |
| `img/sprites/shiny/`, `img/sprites/frame2/` | Shiny and second-frame variants |
| `img/main-sprites/emerald/`, `img/main-sprites/sprites/` | Gen-III sprite sets, dex-numbered |
| `img/board-original.png` | The Kanto board (the site serves a WebP of this) |
| `img/board-gold-silver.png` | The Johto board — unused by the rewrite so far |
| `img/throw.gif`, `img/result.gif`, `img/diceresult.png` | The three frames of the dice-roll animation |
| `img/banner.png` | Title banner from the old lobby |
| `img/spritesheet-1.png`, `img/spritesheet-2.png` | Sprite sheets the old site never used |

## What the site actually uses

Copies live under `public/img/`, so adding art is a copy plus a reference:

- `public/img/board-original.webp` — from `img/board-original.png`
- `public/img/sprites/{dex}.png` and `sprites/animated/{dex}.gif` — only the ten
  playable starters in [`src/data/starters.ts`](../src/data/starters.ts)
- `public/img/dice/{throw,catch,flash}.webp` — from `img/throw.gif`,
  `img/result.gif` and `img/diceresult.png`, re-encoded as WebP (1.3 MB → 0.4 MB,
  frame timings unchanged)
- `public/audio/cries/{dex}.ogg` — the same ten starters' cries, copied as-is
  (128 KB total); played when their trainer's turn comes round

Re-encoding was done with ImageMagick:

```sh
magick assets/img/throw.gif      -loop 0 -quality 70 public/img/dice/throw.webp
magick assets/img/result.gif     -loop 0 -quality 70 public/img/dice/catch.webp
magick assets/img/diceresult.png -quality 82         public/img/dice/flash.webp
```

## Provenance

Fan-made sprite rips and screen captures from the Pokémon anime and games,
collected for a private drinking game. Pokémon is © Nintendo / Creatures /
GAME FREAK. Not for redistribution.
