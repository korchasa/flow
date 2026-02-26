#!/bin/sh
# AssistFlow bootstrap installer.
# Ensures Deno is available, then delegates to the TypeScript installer.
#
# Usage: curl -fsSL https://raw.githubusercontent.com/korchasa/flow/main/install.sh | sh
# With args: curl -fsSL ... | sh -s -- --update
set -e

INSTALL_URL="https://raw.githubusercontent.com/korchasa/flow/main/scripts/install.ts"

if ! command -v deno >/dev/null 2>&1; then
  echo "Deno not found. Installing Deno first..."
  curl -fsSL https://deno.land/install.sh | sh
  export DENO_INSTALL="$HOME/.deno"
  export PATH="$DENO_INSTALL/bin:$PATH"
  echo ""
fi

exec deno run -A "$INSTALL_URL" "$@"
