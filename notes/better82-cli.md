---
title: Better 82-0 in the terminal
topics: [projects]
stage: budding
planted: 2026-10-18
tended: 2026-10-18
summary: A zero-dependency Node command-line version of the better-82-0.com basketball lineup game.
---

I like the better-82-0.com basketball game. You spin a team and a decade, draft a five-man lineup (PG, SG, SF, PF, C), and the game projects a season record and gives the lineup a grade. I wanted to play it from the terminal, so I wrote a command-line version in Node.

## Status

It works and the repo is public on GitHub. It has the site's three modes: hooper, cap and classic. It also has the lineup analyzer, and it projects the season record and grade the same way the site does. I run it from a small launcher on my laptop.

## Decisions

- No dependencies. It is plain Node, so it starts fast and has nothing to install.
- I matched the site's projection model closely: the player pricing, the gravity, the win curve and the grading. The point was for a lineup to get the same result in the terminal as on the site.
- The player data (about 9,000 players) is not in the repo. The CLI downloads it from the site on the first run and caches it locally. I did this so I don't redistribute the site's data.
- My first attempt was a desktop wrapper around the live site, built with Tauri. The CLI replaced it. It was simpler, and it was what I actually wanted.

## Lessons

- A thin wrapper around someone else's site gave me very little. Rebuilding the game logic myself was more work, but I ended up with something I own and understand.