---
title: parlo
topics: [projects]
stage: seedling
planted: 2026-10-18
tended: 2026-10-18
summary: Offline live captions and translation for events, in Romanian, Russian and English, running on a laptop with no cloud.
---

parlo is the first AI piece for my CV (see [[cv-rebuild]]). It started as a voice-follow feature for [[bible-presenter]], where the app would follow the speaker and keep up with the verse. I decided to drop the church angle and make it general: live captions and translation for any event, running fully offline on one laptop.

Someone speaks, the laptop transcribes and translates, and the text shows up on a projector page and on people's phones. The languages are Romanian, Russian and English.

## Status

I wrote the spec and a ten-step plan on 2026-10-10. Then I paused partway through the first step, a spike to test the speech and translation models on my laptop. The speech model, the local LLM runtime and the benchmark data are set up. The repo is scaffolded, but nothing is committed yet.

Still open from the spike: getting word-level timestamps and a prompt out of the speech server, and checking whether speech recognition and a local LLM can share my laptop's small GPU (4 GB).

## Decisions

- It runs as a local Node server you start with one command (npx parlo). It serves a projector page and a phone page, and pushes text to both with server-sent events.
- Speech recognition is whisper.cpp, run as a separate server process next to the Node server.
- Live transcription uses LocalAgreement-2: a word only becomes final once two passes in a row agree on it, so the captions don't keep rewriting themselves.
- The translator is pluggable. There is always an offline translation model, and a local LLM through Ollama as an option.
- I measure quality on the FLEURS test sets for the three languages.
- It will be published on npm as parlo.
- For the offline translator I planned Opus-MT, but there is no ready ONNX version for Romanian to English. I switched to M2M100 (418M, quantized). It is MIT licensed, translates all six language pairs directly, and takes about a second per sentence on the CPU after a 17-second load. I rejected NLLB-600M: it was twice as slow, its licence is non-commercial, and it made obvious mistakes on simple phrases.
- I chose this over an edge AI vision piece (object detection in the browser) as the first AI project.

## Next

- Finish the spike and update the spec with the translator change.
- Work through the rest of the plan.
