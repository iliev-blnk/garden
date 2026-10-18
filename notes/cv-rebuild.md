---
title: Rebuilding my developer CV
topics: [projects, ideas]
stage: budding
planted: 2026-10-18
tended: 2026-10-18
summary: Rebuilding my developer CV around concrete public projects, starting with small open-source libraries pulled out of my own personal projects.
---

My personal projects felt too specific to sound impressive on a CV. I wanted a CV like the good developer CVs I've seen: concrete, named projects, each with a dense one-line description of the stack. So instead of listing niche personal tools, I pull reusable open-source libraries out of them, one at a time. Each one makes an engineering claim that doesn't depend on its original setting, and each comes with public proof: a repo, CI, a package on npm and a live demo.

I plan one main CV, plus short variants for full-stack, AI and freelance work, and for specific postings. I'm looking broadly, not at one industry, so I judge each piece by how widely it appeals.

## Status

- **pagepad** is public on GitHub and on npm (0.1.0). It is a library for remote-controlling a web page from another device. The live demo runs on Cloudflare Workers, and the relay keeps its state in a Durable Object, so the demo needs no external store.
- **pagereel** is public on GitHub and on npm (0.1.1), with a gallery on GitHub Pages that renders again on every push. It records web pages as video. It has two modes. In scene mode the page exposes a seek function and pagereel steps through it. In clock mode no code changes are needed: pagereel takes over the page's timers, animation frames, date and random numbers, and pauses CSS animations, so every frame is deterministic.
- [[bible-presenter]] is a separate track: an open-source app, not a library.
- Other CV pieces since then: [[chisinau-after-dark]] as the design piece, [[cutline]] as the stats and prediction piece, and [[grid-md]], a daily electricity load forecast for Moldova.
- [[holdshort]] is the flagship: a digital twin of Istanbul airport's traffic, now finished, with a write-up I can link from the CV.
- My [[portfolio]] homepage is live, with [[ink]] as its hero: a fluid simulation drawn as glyphs, published as its own small library. The CV page and the 404 page share its style.
- The main CV is reworked and published with the portfolio on 2026-10-18: two A4 pages, angled at full-stack plus data and ML, with numbers and a live link on every entry. It now lists only tools I actually used.
- The first AI piece is [[parlo]]: offline live captions and translation for events. I chose it over an edge AI vision piece. It is planned and paused partway through the first spike.

## Decisions

- Every repo follows the same conventions: MIT licence, TypeScript with ES modules, CI, and a README that opens with a GIF.
- I work through each piece the same way: brainstorm, then a written spec, then a plan, then the build.
- I keep a backlog of queued CV projects and pick the next one from it.
- I dropped a third planned extraction, a ticket kit from my TinSerV work.
- On the CV, data and forecasting projects come first, then open source, then the design and TinSerV work. Smaller pieces like [[better82-cli]] and [[bible-presenter]] stay off it to keep it at two pages.

## Lessons

- I published pagereel 0.1.0 before the final review, so the first fixed version came out right after. Review first, then publish.

## Next

- Finish [[parlo]].
- Brainstorm the second AI piece: a video agent built on pagereel. It would take a brief, write the scenes, render them, review its own output and deliver an Instagram reel, shipped as a Claude Code skill or MCP server.
- The edge AI vision idea (object detection in the browser with YOLO, ONNX and WebGPU, with tracking, counts and a benchmark) stays in the backlog.
- Make the short CV variants for full-stack, AI and freelance work.
