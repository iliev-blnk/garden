---
title: throw
topics: [projects]
stage: evergreen
planted: 2026-10-18
tended: 2026-10-18
summary: A browser tool for live visuals, projection mapping and Art-Net lighting output, with a previs demo and a small showcase page.
---

I wanted solid proof that I can handle the technical side of live shows: visuals reacting to music, projection mapping and driving lights. So I built throw, a browser tool that does all three. It listens to the music, finds the beats, drives visuals and maps them onto surfaces, and can send lighting data over Art-Net. A previs page shows the whole thing running without any hardware.

## Status

Done, built in one day on 2026-10-12. The repo is public, with CI and a GitHub Pages deploy, and the app and a previs demo are live. I also made a small showcase page called works. It has the live previs, the crayon gang drawings from [[p5-lab]] and links to my projects.

I then decided throw wasn't the right creative piece for my CV and replaced it with [[chisinau-after-dark]]. I kept throw and works public as they are. I'm not archiving or deleting them.

## Decisions

- Plain TypeScript with Vite, no framework. The showcase page is plain HTML.
- Remote control from a phone uses my own pagepad library (see [[cv-rebuild]]).
- The demo video is rendered with pagereel, over a synthesized 124 BPM track, so it is deterministic and reproducible.
- It is tested properly for a one-day build: about 110 unit tests and 45 end-to-end tests in a real browser.

## Lessons

- Beat detection has to work per frequency band. Summing the raw change across the whole spectrum put every onset on the hi-hats. Measuring each band on its own, normalizing it and weighting toward the bass fixed that.
- Rendering the demo in a headless browser on the software renderer is slow: about 25 minutes.

## Next

- Film it running live on real projectors and lights, if I get the chance.
