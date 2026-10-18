---
title: Portfolio homepage
topics: [projects]
stage: budding
planted: 2026-10-18
tended: 2026-10-18
summary: My personal developer portfolio and CV page, reached after many rejected directions, with an ink-in-water glyph simulation as the hero.
---

I wanted a portfolio homepage and a CV page that feel like my own. The homepage chapters mirror the CV, so both tell the same story. It took many rounds to find a direction I liked, and most of what I tried was rejected along the way.

## Status

Published on 2026-10-18 on Cloudflare Pages. It has the homepage, the CV page with a printable two-page A4 PDF, and a 404 page. The [[holdshort]] row links to its write-up. I also rewrote my GitHub profile README so it leads with the portfolio and the data projects.

## Decisions

- My first version was a near-copy of a portfolio I admired: dark, with isometric figure cards. It was too close to the reference. I wanted something of my own.
- From four directions (a line map, ASCII objects, felt crayon drawings, slides driven from a phone) I liked ASCII. Next I tried a white, clean mix of my old Mars page and ASCII. The Mars photo was drawn as coloured characters, and hovering cleared the dust to show the real photo. Each chapter had a small 3D object rendered in ASCII that you could turn by dragging.
- Then I moved away from Mars, because it didn't fit, and dropped the social links. Only GitHub, email and the CV stay.
- I tried heroes made from my own project data: Istanbul flight tracks, Chișinău streets, the grid.md fan chart and the cutline probability grid. None of them was cool enough.
- I tried "the machine": one isometric object whose modules were the projects, with live readouts. I rejected it. It was too illustrated, too busy, the wrong vibe, and the page around it felt generic.
- I went back to ASCII once more, with the whole screen as one character grid. In the end I decided the homepage needed a piece made just for it. From a list of eight ideas I picked ink in water, drawn as glyphs. It became [[ink]].
- The text sits on one plain paper section, flush left. The ink moves in the space to the right, an idle hand stirs it, and it fades out strongly toward the text. The CV column is centered and has a thin band of ink at the top.
- The CV angle is full-stack plus data and ML, with numbers and live links, on two A4 pages. Data and forecasting comes first ([[holdshort]], [[grid-md]], [[cutline]]), then open source (pagepad and pagereel), then projects ([[chisinau-after-dark]], TinSerV). I left [[better82-cli]] and [[bible-presenter]] off the CV. Every entry has a visible link.
- Only the final pages get published. Drafts and old versions stay local as backups.

## Lessons

- An earlier glass-style version felt too AI-generated. Since then I look out for the usual AI design tells.
- After several rejected rounds, it worked better to stop and pin down what exactly was failing before making another direction.
- A page opened straight from disk can't read a photo into a canvas, so the photo-based ASCII drafts needed a local server.

## Next

- Keep the homepage chapters and the CV in step as new pieces land, see [[cv-rebuild]].
