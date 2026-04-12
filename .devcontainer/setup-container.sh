#!/usr/bin/env bash
set -euo pipefail

# Fix named-volume ownership.
#
# Docker named volumes are created root-owned, so the remoteUser cannot
# write into the mount target until this runs. All authentication in this
# container is the user's responsibility — `claude login`, `gh auth login`,
# `opencode auth login`, etc. are run manually inside the container terminal.
# This script only ensures those commands have a writable config directory.
#
# Recursive chown is required: the devcontainer/feature build process may
# have created subdirs (e.g. ~/.claude/backups) as root before remoteUser
# takes effect. A top-level chown would leave those subdirs unwritable.
for dir in "$HOME/.claude" "$HOME/.config/opencode" /commandhistory; do
  if [ -d "$dir" ] && [ ! -w "$dir" ]; then
    sudo chown -R "$(id -un):$(id -gn)" "$dir"
  fi
done
