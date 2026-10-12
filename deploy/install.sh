#!/usr/bin/env bash
set -euo pipefail
d="$HOME/.config/systemd/user"
mkdir -p "$d"
cp "$(dirname "$0")/garden-digest.service" "$(dirname "$0")/garden-digest.timer" "$d/"
systemctl --user daemon-reload
systemctl --user enable --now garden-digest.timer
systemctl --user list-timers garden-digest.timer --no-pager
