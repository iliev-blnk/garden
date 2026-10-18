---
title: motion-studio
topics: [projects, tinserv]
stage: seedling
planted: 2026-10-18
tended: 2026-10-18
summary: A small studio for making motion-design videos in code, where every frame is a function of time, rendered with a headless browser and ffmpeg.
---

After reading an article on X about doing motion design with Claude, I wanted to try it myself. I built a small studio where a film is code. Each scene is a page that can draw itself at any moment in time. A headless browser steps through the timeline frame by frame, and ffmpeg joins the frames and the sound into a video.

## Status

It works, but it is not in a git repo yet. It has three commands: a live preview, a set of stills, and a full render. The first test film is a 12-second square loop at 120 BPM. One UI element changes shape in turn: a button, a loader, a player, a slider and a toast.

The first real film is an Instagram reel for the TinSerV winter edition (Ediția de iarnă). I made two versions.

- v1, 16 seconds, vertical. It reuses the light-ray effect from the campaign site, and the number "40" casts the light shafts. The hook goes from "Fii lumina." to "Fii lumina, / iarna asta." as the colors go from warm to cold. Then a bloom of light cuts into a photo from Cimișlia, the dates (4–9 January 2027), "40 de locuri", and a warm end card with the site.
- v2, which I called "Raze Type". I wanted it much better. Every word is a giant letter shape that the light shines through, cut on the beat: FII, LUMINA, IARNA, ASTA, CIMIȘLIA, 4–9, IANUARIE, 2027. Long words are stretched vertically to fill the tall frame, and some words are filled with photos instead of light. There is a two-second pause on a full-frame shot, then "40", then 40 sparks light up, each with a bell sound, and come together into the end-card light. The Russian text is a typed-on caption.

Both versions are done. I haven't decided which one to use yet.

## Decisions

- Everything is deterministic. Animation uses closed-form springs and keyframe tracks driven by the time value, so any frame can be rendered on its own and in parallel.
- The sound is synthesized offline in code too, and loudness-normalized to -14 LUFS for Instagram.
- Each film has its own folder with a short spec, a timeline, the scene and the audio.
- Before a full render, I render stills and critique them. A full render takes several minutes, so stills are the cheap way to iterate.
- I deliver a smaller encode for Instagram rather than the near-lossless master, which is about four times larger.
- The browser is the one already installed on my system, so there is nothing extra to download.

## Lessons

- Film grain looked wrong with normal blending: it lifted the blacks to grey. An overlay blend fixed it.
- Outlining text set in a variable font shows the overlapping contours inside the letters. I use a soft glow around the letters instead of a stroke.
- The light-ray smear is the heavy part of the render.

## Next

- Pick v1 or v2 for the winter edition reel.
- Put the studio in a git repo.
