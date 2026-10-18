---
title: p5-lab
topics: [projects, tinserv]
stage: budding
planted: 2026-10-18
tended: 2026-10-18
summary: A one-page playground of p5.js and WebGL sketches, mostly built around the TinSerV runner logo and the "raze" light-ray effect.
---

I started a p5.js playground in early October 2026 to try interactive visuals. Some sketches are pure experiments. Most are built from real TinSerV material: the runner logo and a group photo. The one I liked most, "raze", became the light-ray look I later reused in the winter edition reel in [[motion-studio]].

## Status

Everything lives on one page: the raze hero with its controls, then a grid of TinSerV sketches, then a grid of other experiments. It opens straight from disk, with no server.

- **Round 1** was generic: a flow field, ASCII fog, a riso halftone and a magnet grid.
- **Round 2** was built from public sketches I liked: a letter serpent, a photo poem, a paper collage and a Hilbert curve.
- **TinSerV round.** I cut the runner logo into four pieces: leg, torso, head and the sparkle. lanț has the sparkle leading 40 runners. In atelier you drag and rotate the pieces until the logo snaps back together and the motto appears. lanternă is a cursor light that reveals the group photo, with a falling verb after "Fii lumina care". raze puts a light behind the runner and casts god rays through it.
- **raze** is the one I really liked. I turned it into its own tool. It has feed (1080×1350) and story (1080×1920) formats, warm, cold and white light, and dust that only shows where the light reaches. It saves a PNG or records a 6-second seamless loop. It also carries bilingual text for Ediția de iarnă and the wordmark.
- **More TinSerV ideas.** aprinde has 40 dim runners: touch one and the light spreads from person to person until all 40 are lit and the motto shows. cuvânt lets you type any word and shines the rays through its letters. ninsoare piles falling snow on the runner, and the cursor light melts it. tipar is raze as a two-ink riso print, indigo and fluoro yellow, slightly off-register.
- **raze on the GPU.** A plain WebGL2 shader version without p5. Each pixel marches toward the light past the runner's shape. It follows the mouse, can react to the microphone, and goes full screen. I liked how it moves between warm and cold light.
- **crayon gang.** Felt-crayon cats and dogs in sweaters, drawn procedurally. Shapes are built from simple inside tests with wobbly edges and filled with thousands of short strokes plus loose hairs on the outside. It draws itself progressively, and there are lineup and portrait shots.

## Decisions

- One page only. I don't want a pile of separate pages. New sketches go on the same page.
- Each sketch only starts when it scrolls into view. With all of them running at once the page froze.
- Images are embedded in the page, so it works when opened as a local file.
- The reference sketches I liked are under a non-commercial share-alike licence, so I write my own versions and don't copy their code or assets.
- In the crayon drawings, the stroke size doesn't grow with the figure, so close-up portraits keep the fine crayon texture.

## Lessons

- What draws me in is direct manipulation with the mouse, flat colour, words that mean something and real content. Pure generative noise is not the point for me. That is my taste reference for interactive work now.
- The first raze was overexposed. A tighter glow and much fainter rays fixed it.
- In p5 the mouse starts at 0,0, so a simple bounds check thinks the cursor is over every canvas. Hover flags from pointer events fix that.
- I tried TouchDesigner as an alternative, but it wouldn't run under Wine on my laptop, so I dropped it.

## Next

- Decide on the newer TinSerV sketches and crayon gang. Only raze has a verdict so far.
