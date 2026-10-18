---
title: ink
topics: [projects]
stage: budding
planted: 2026-10-18
tended: 2026-10-18
summary: A WebGL2 fluid simulation drawn as glyphs, like ink in water. It is the hero of my portfolio homepage and a small library of its own.
---

I needed a hero for my portfolio homepage. I sketched and rejected a lot of directions before I settled on this one: ink moving through water, drawn as text glyphs instead of smooth color. I built it as its own library, so it also counts as a separate piece on my CV.

It has two looks. In dark mode it is "night", amber light on black. In light mode it is "blue", a single ink on white paper. It follows the system color scheme, and there is also a toggle that remembers my choice.

## Status

Public on GitHub, with CI passing. The homepage that uses it is live on Cloudflare Pages, and the README links to it. My CV page and the 404 page (a Mars scene in a mono frame) use the same style as the homepage, with a thin band of ink at the top of the CV.

## Decisions

- A TypeScript module with no runtime dependencies, about 7.6 KB gzipped. One call mounts it on a canvas.
- The fluid is a stable-fluids simulation on the GPU. Each cell is then drawn as a glyph from a texture atlas.
- The two looks are modelled differently: in light mode the ink absorbs light on paper, at night the ink is the light.
- A quality governor drops the simulation resolution (128, 96, then 64) if a device can't keep up.
- If WebGL isn't available, a still text version is shown instead. It is generated ahead of time by a script.
- A strength option sets how strong the effect is, so the CV page can use a calmer version than the homepage.
- The saved theme is applied before the first paint, so the page doesn't flash the wrong colors on load.

## Lessons

- Unit tests weren't enough for something this visual. I added a smoke test that runs on a real GPU. As with [[chisinau-after-dark]], a headless browser only says something useful once it is forced onto the real GPU.

## Next

- Link it from the CV as one of the pieces in [[cv-rebuild]].
