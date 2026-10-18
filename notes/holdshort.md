---
title: holdshort
topics: [projects]
stage: evergreen
planted: 2026-10-18
tended: 2026-10-18
summary: A digital twin of Istanbul airport's traffic, built from open ADS-B data in Rust, Python and TypeScript, with a replay console and a written report.
---

I wanted one big, research-style flagship for my CV instead of a lot of small items. I chose a digital twin of Istanbul airport (LTFM). It rebuilds the airport's traffic from open ADS-B flight tracking data: which aircraft arrived and left, on which runway and when. On top of that it does some forecasting and anomaly detection, and it shows everything in a console where you can replay a day. It is a CV piece, not a product.

I only knew TypeScript when I started. Rust and Python were deliberate learning goals, so I worked in small steps and wrote notes on each new concept as I went.

## Status

Done. All six parts are finished and the repo is public:

1. Ingest: a Rust command-line tool that downloads daily ADS-B history and weather reports for each airport.
2. The twin engine, which turns raw tracks into arrivals, departures, runways, go-arounds and approach times.
3. The console: a dark map where you replay a day of traffic, with blue arrivals and orange departures. It is live on Cloudflare Pages.
4. Forecasting: predicted landing time for each arriving aircraft, and arrivals per hour.
5. Anomaly detection for unusual approach paths.
6. A write-up of about 3,100 words, published as a page of the console.

The data covers 38 days of Istanbul traffic in September and October 2026. I also added Suceava, a small regional airport, as a second airport.

## Decisions

- Rust for the engine, Python for research and models, TypeScript for the console. Models are exported to ONNX and run inside the Rust engine, so the console and the reports use the same predictions.
- I first wanted to collect live data in the cloud on Cloudflare Workers. Every open ADS-B source refused or timed out from there, so I dropped it. I went history-first instead: daily archives from adsb.lol, plus live collection from my own machine. Cloudflare only came back to host the console.
- Runway headings come from the runway threshold positions, not from the public airport database, whose headings for Istanbul were off by five degrees.
- Departures are first seen high up, at a median of about 11,000 ft, because coverage near the ground is missing. So the twin doesn't try to assign a departure runway.
- When coverage drops on final approach, a fallback rule counts a track as a low-confidence arrival if it ends aligned with a runway, descending and low enough. That recovered 342 arrivals over ten days. I checked it didn't double count: most of those aircraft departed again within a day, about as often as normal arrivals.
- For anomalies I compare each approach, resampled to 32 points, with the nearest normal approach to the same runway. The console shows the unusual approach next to its nearest normal path.
- I report results as they came out. I didn't tune anything after seeing the test results.
- The claims in the write-up are checked by tests, so the numbers in the text can't drift from the code.

## Lessons

- Over ten days the twin counted 1,282 movements a day against 1,449 in the official airport statistics, 11.5% short. The gap is mostly coverage, not the engine: about 16% of departures are never seen.
- Coverage decides everything. Suceava has no coverage below about 14,800 ft, so the twin sees only overflights there and zero movements. A local receiver would fix that.
- Landing time predicted at 40 nm out had an average error of 1.39 minutes, against 1.90 for the best simple baseline, and it was better on every test day.
- Arrivals per hour were not reliably better than "the same hour over the last seven days". I wrote that down as it was.
- The anomaly detector did worse than an isolation forest and than a simple landing-time residual at finding holds and go-arounds (average precision 0.105 against 0.423 and 0.496). My first run looked better, at 0.208, until review found a coverage problem. I disclosed both numbers. Most flags turned out to be rare entries from the north and northeast, about 1% of traffic. It also showed that the twin's go-around rule misses some go-arounds.
- Traffic on runway 34L flies level at 3,000 ft at 10 nm. At first it looked like a threshold error, but it is how the approach is flown.
- The ONNX export path was full of traps: one Rust runtime couldn't run tree ensembles, one converter was broken for gradient boosting on the current ONNX version, and another had a maximum opset. Refitting with a fixed number of trees before export helped.
- Cloudflare Pages ignores HTTP range requests, so the map tiles had to be unpacked into separate files instead of one archive.

## Next

Nothing planned. Any new work on it would start with a fresh brainstorm. I keep a list of small fixes I put off, and I will link the write-up from my CV.
