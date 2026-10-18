---
title: Bible Presenter
topics: [projects, church]
stage: budding
planted: 2026-10-18
tended: 2026-10-18
summary: A desktop app for projecting scripture during worship. One window to pick the verse, one fullscreen window on the projector.
---

I wanted a simple way to put Bible verses on a projector during worship, in the spirit of ProPresenter or OpenLP, but built around how I want it to work. The app has two windows. In the operator window I find and stage a verse. The output window shows it fullscreen on whichever monitor I choose.

## Status

It works on my Arch laptop (Hyprland, Wayland, Intel and NVIDIA graphics). It installs as a normal app with a menu entry, so it starts without a terminal. It is not in a public repo yet.

It has five translations: KJV, WEB, Cornilescu (Romanian), a Turkish translation and the Russian Synodal. Any of them can be shown side by side. It has keyword search, and it understands references typed in different languages.

## Decisions

- I built it with Electron, React and electron-vite, and package it as an AppImage.
- No database and no native modules. Each translation is a JSON file that loads only when needed, built from the public-domain getBible dataset. Search runs in memory. That keeps the build simple and avoids rebuilding native modules for every Electron version.
- Translations line up by the standard 1–66 book numbering, which is what makes side-by-side display work.
- I wanted the Russian BVI, but it isn't in the dataset, so I ship the Synodal 1876 translation instead.
- On a second monitor, the output window moves itself there and goes fullscreen. With a single monitor it opens next to the operator window, so I can still use the controls.
- The design is "candlelit liturgical": warm black, ember and candle gold, made for a dim room. Projected text is parchment-coloured on a warm black background.
- Fonts are bundled with the app, not loaded from the web, because it has to work offline in a church hall. Fraunces for the title, Hanken Grotesk for the interface, and Literata for the scripture itself. I picked Literata because it covers Cyrillic and the extended Latin letters, so Russian, Turkish and Romanian all render properly.

## Lessons

- Getting the window to display on my hybrid-graphics Wayland setup was the hardest part. Forcing X11 gave a blank window, and native Wayland with GPU rendering crashed. Native Wayland with software rendering is solid, and for showing text that is plenty. I kept switches to try X11 or the GPU later.
- With software rendering, the usual "window is ready to show" signal doesn't always fire. I show the window on whichever of several signals comes first, with a short timeout as a fallback.
- A small self-test that checks reference parsing, search and side-by-side against the real Bible data caught more than clicking around did.

## Next

- Put it in a git repo.
- Use it in a real service and see what the operator actually needs.
