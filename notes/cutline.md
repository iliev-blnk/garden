---
title: cutline
topics: [projects]
stage: budding
planted: 2026-10-18
tended: 2026-10-18
summary: A Monte Carlo simulator for the 2026-27 Champions League that reruns the season 10,000 times and publishes fresh odds before every matchday.
---

I wanted a stats and prediction piece for my CV. The idea came from a video that simulated the NBA season 10,000 times. I did the same for the 2026-27 Champions League. A model rates every team, the season is simulated 10,000 times, and the site shows how likely each club is to reach each stage. That includes the top-eight cut in the league phase, which gave the project its name.

## Status

It is live on GitHub Pages and the repo is public. The site has three pages: a grid of probabilities with a what-if mode, a record of past predictions, and a page that explains the method.

A scheduled job runs every morning. If new results have come in between matchdays, it refits the model and runs the 10,000 simulations. It then saves a dated snapshot before the next matchday, and the site redeploys. After the league phase the snapshots switch to the knockouts. It also records bookmaker odds for each matchday, so I can compare the model with the market.

The first snapshot, before matchday 2, came from an untuned model. It is labelled that way on the site.

## Decisions

- The model is in Python. The simulation engine is in TypeScript, and the same code runs in Node for the daily job and in a browser worker for the what-if mode. Having one engine means the site and the published numbers can't drift apart.
- Fixtures and results come from UEFA's public match data. Domestic league results come from football-data.co.uk, so the model also knows how teams are doing at home. xG data only goes back to July 2026.
- I tuned the model on the 2023-24 season only: how fast old results fade, and how much teams and leagues are pulled toward the average. I kept later seasons for the backtest.
- An Elo rating runs alongside as a baseline, so every claim the model makes has something simple to beat.
- A new snapshot is only made between matchdays and only when the results changed. That keeps the record clean: every prediction was made before the games it predicts.

## Lessons

- In the backtest the model beat Elo on Champions League matches (RPS 0.197 against 0.217). It also did better on who makes the top eight (Brier 0.103 against 0.127).
- On domestic matches the betting market beat my model (0.198 against 0.205). That was a useful check on how much a small model can know.
- No approach beat simply giving every team the same chance of winning the whole thing. The overall winner is close to unpredictable this far out.
- 10,000 simulations take about 1.2 seconds, which is close to the limit I set for the browser.

## Next

- Check each automated snapshot after the matchdays, from MD3 (20–21 October) through MD8 in late January.
- Ingest knockout results, which the pipeline doesn't do yet.
- The next CV piece in this vein was meant to be an energy demand forecaster on European grid data. It became [[grid-md]], a day-ahead load forecaster for Moldova.
