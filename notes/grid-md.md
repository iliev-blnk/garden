---
title: grid.md
topics: [projects]
stage: budding
planted: 2026-10-18
tended: 2026-10-18
summary: A day-ahead forecast of Moldova's electricity load, with uncertainty bands, published every day next to the grid operator's own plan.
---

This is my third CV piece, and the second stats and prediction piece after [[cutline]]. Every morning it forecasts tomorrow's electricity load for Moldova, hour by hour, as a range rather than a single number. It then compares that with the official plan from Moldelectrica, the grid operator. The site is in English, Romanian and Russian.

I first called it sarcina (Romanian for "load"). I didn't like the name or the look, so I renamed it grid.md, after Moldova's .md domain.

## Status

It is live on GitHub Pages and the repo is public. The main page has a plain-English summary at the top, tomorrow's peak as one large number, a sentence giving the likely range, a fan chart of the hourly bands, and a record of past forecasts. The method is written up as a report in the repo. The first live forecast was for 13 October 2026.

There is also a story page in seven chapters about Moldova's "hidden solar": the rooftop panels the grid can't see.

## Decisions

- The model is LightGBM with seven quantiles. It predicts the change from the same hour a week earlier and uses solar weather features. A rolling eight-week correction keeps the bands honest.
- Weather inputs use only forecasts that existed when the forecast was made, not the actual weather after the fact. Otherwise the backtest would cheat.
- For the design I sketched four directions and compared them side by side. I picked the one built around a single large peak number and the fan chart.
- The daily job runs on my own laptop, not in GitHub Actions, because the operator's site doesn't serve GitHub's runners. If the laptop is off all day, that day is missing from the record. I accept that.
- I wanted to add Romanian electricity prices, but I put it off. One source's licence forbids public or derived use, another blocks automated access, and ENTSO-E needs a terms check first.

## Lessons

- Over the test year (October 2025 to September 2026) the model's error was 8.6%. The operator's plan was at 18.7%, 15.5% after correcting its bias, and simply repeating last week was at 15.0%. The 90% band covered 88.4% of hours. The plan did slightly better from November to January.
- The load figures are net of rooftop solar. At midday in summer the load drops to about 130–170 MW because of panels the grid doesn't meter. That is where the hidden solar story came from.
- Using actual weather data, I estimated about 668 MW of unmetered solar in May–September 2026 (range 557–814), on top of 184 MW metered. My second method matched the official figure for December 2024 closely (391 against 394 MW). My first method, which I had written down in advance, failed. I published that result too.
- Small facts I learned along the way: in 2023 Moldova's grid was mostly a corridor for power flowing from Romania to Ukraine, about 80% of hours. In the blackout of 23 November 2022, load fell to 290 MW at 15:00.
- Time stamps were the fiddly part: each value is labelled with the start of its hour in local time, and the repeated hour in autumn is stored only once.

## Next

- Check the record after the first weeks of live forecasts.
- Add a notice when the daily run fails.
- Retune the model settings for the final design, and maybe add a dark mode.
