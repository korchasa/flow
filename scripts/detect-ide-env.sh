#!/usr/bin/env bash
# detect-ide-env.sh — Dump environment variables to help detect which AI IDE is running.
# Run this script from within different IDEs (Cursor, Claude Code, OpenCode, etc.)
# and compare the output files to identify IDE-specific env vars.

set -euo pipefail

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S %Z')
DUMP_FILE="/tmp/ide-env-dump-$(date +%s).txt"

# Patterns likely set by AI IDEs or relevant to IDE detection
FILTER_PATTERN='CLAUDE|CURSOR|OPENCODE|CODEX|AGENT|ANTIGRAVITY|GEMINI|IDE|EDITOR|TERMINAL|VSCODE|SHELL|SESSION|PATH'

echo "=========================================="
echo "  IDE Environment Detection"
echo "  ${TIMESTAMP}"
echo "=========================================="
echo ""

echo "--- Filtered env vars (matching: ${FILTER_PATTERN}) ---"
echo ""
env | sort | grep -iE "^(${FILTER_PATTERN})=" || echo "(no matches)"
echo ""

# Save full dump
env | sort > "${DUMP_FILE}"

echo "--- Full env dump saved to: ${DUMP_FILE} ---"
echo "  $(wc -l < "${DUMP_FILE}") variables total"
