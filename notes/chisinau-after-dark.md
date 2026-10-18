---
title: Chișinău after dark
topics: [projects]
stage: budding
planted: 2026-10-18
tended: 2026-10-18
summary: A one-night scroll story about Chișinău, with the real city streets drawn as a long-exposure light map and an isometric panel block whose windows turn on and off through the night.
---

I wanted a creative, design-led piece for my CV. It replaced [[throw]], a live-visuals tool I had built just before and decided wasn't the right fit. I chose an immersive web piece set in Chișinău at night. Of the directions I sketched, I liked two: the Soviet panel blocks, and a map of the city made of light. I combined them into one piece.

The page tells the story of one night, from 22:00 to 06:00. As you scroll, the hour moves forward. The map and the building both follow that hour.

## Status

It is live on GitHub Pages and deploys on every push to main.

- The map is drawn in WebGL2 from about 6,900 real OpenStreetMap roads plus the trolleybus routes. It looks like a long-exposure photo of the city's light.
- The panel block is an isometric figure made of 343 solids. As the night goes on, its windows light up and go dark.
- There is a still version for people who turn on reduced motion. The share image is made from the same still.

## Decisions

- I built it with Astro, GSAP for the animation and Lenis for the scrolling.
- One thing drives everything: the hour. Each section of the page is tied to an hour, and every visual reads from that.
- I fetch the street data from OpenStreetMap once and pack it into a small binary file. The page doesn't call the OSM servers when someone visits.
- The block is split into three stacked layers, and only the windows layer redraws. That keeps it cheap.
- I built the figure with an open-source (MIT) isometric drawing kit.

## Lessons

- It runs at 60 fps on an Intel integrated GPU in every state. It also holds 60 fps on a simulated phone with the CPU slowed four times.
- Performance tests in a headless browser are meaningless on the software renderer. They only mean something once the browser is made to use the real GPU.

## Next

- Use it as the design piece in my CV and portfolio.
