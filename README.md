# garden

My digital garden: notes on what I build and think about, at **https://iliev-blnk.github.io/garden/**.

It fills itself from two places:

- **My Claude Code chats.** Every night a job on my laptop reads the chats that changed that day and asks Claude what, if anything, belongs in the garden. It updates or creates notes in my voice, then builds and pushes.
- **My phone.** I message a Telegram bot. Every hour a GitHub Action turns the messages and photos into entries in the stream.

Notes grow over time: a 🌱 seedling is a fresh thought, budding is worked on, an evergreen is settled. The home page is a planting plan with one bed per topic.

## Privacy

The site is public, so nothing gets published without passing two checks:

1. **Rules for the digest.** Claude is told what belongs (projects, ideas, community work, movies, photography, study) and what never does: paid work, money, security problems, other people's private details, credentials. When unsure, it leaves things out. Chats run from work directories are skipped before Claude sees them.
2. **A scanner** that runs before every commit (pre-commit hook), on every Telegram message, and as the first step of every build. It blocks keys and tokens, email addresses, phone numbers, IP addresses, IBANs, card numbers, GPS data in photos, and a private list of terms that is kept outside this repo.

Photos are resized to 2000 px and stripped of all metadata. When a photo is sent as a file, the camera settings are kept as a caption line; the location never is.

## Telegram

| Message | Result |
| --- | --- |
| any text | an entry in today's stream |
| `#movie Dune 2 — 8/10 …` | the same, filed under movies (`#idea`, `#photo`, `#study`, `#uni`, `#diploma`, `#tinserv`, `#church`, `#hobby`, `#project` work the same way) |
| a photo with a caption | the photo plus the caption |
| a photo sent as a file | the same, with the camera settings |
| `/undo` | removes the newest entry |

The bot answers `🌱 planted` once the entry is live, or says why it refused.

## Running it

```sh
pnpm install
pnpm test                 # unit tests
pnpm build                # scan, build the site, index search
pnpm test:e2e             # browser smoke test (after a build; needs Chromium)

node lib/cli.ts digest [--dry-run]                 # tonight's digest, now
node lib/cli.ts backfill [--limit N] [--dry-run]   # digest every past chat
node lib/cli.ts scan notes stream media            # privacy scan
node lib/cli.ts telegram                           # what the hourly Action runs
```

Local settings live in `~/.config/garden/env` (`GARDEN_WORK_DIRS`, `GARDEN_WORK_MEMORY`, `GARDEN_BOT_TOKEN`, `GARDEN_CHAT_ID`) and `~/.config/garden/denylist.txt`. The nightly timer is installed with `deploy/install.sh`.

## Stack

TypeScript on Node 22, Astro, Pagefind, sharp, Vitest, Biome, GitHub Actions and Pages, a systemd user timer.
