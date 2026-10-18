---
title: The garden
topics: [projects]
stage: budding
planted: 2026-10-18
tended: 2026-10-18
summary: This digital garden. It fills itself from my Claude conversations and from quick notes I send from my phone.
---

My thoughts, side projects and ideas were scattered across chat sessions. I wanted them in one place that I can read and link together, without having to write it up by hand. So I built this garden, and it fills itself.

It covers my side and CV projects, ideas and the backlog, TinSerV, church and community work, and personal things: movies, photography, study, uni, my diploma project and hobbies. My paid work stays out completely, not even as general lessons.

## Status

I wrote the spec and the plan on 2026-10-12 and started building. The privacy scanner and the pre-commit hook that runs it were the first parts I finished.

## Decisions

- It is public. I first wanted a private GitHub Pages site, but the free plan doesn't allow that. My options were encrypting the pages, keeping it local only, or making it public. I chose public.
- It publishes automatically, with a privacy filter in front. There is no draft step and no delay.
- The filter has two layers. Claude writes notes under strict rules about what may go in. Then a separate scanner checks the result for things that must never be published.
- Conversations are digested once a night on my own machine. Only the conversations that changed get read.
- For quick notes from my phone I use a new Telegram bot just for the garden. A GitHub Action reads it every hour, and those notes become the stream.
- The site is built with Astro. It has backlinks between notes, the stream, pages for movies and photography, and search with Pagefind.

## Next

- Before writing any site code, sketch three or four visual directions and compare them side by side.
