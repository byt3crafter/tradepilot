#!/usr/bin/env bash
# install-codex.sh — append the coordination MCP block to ~/.codex/config.toml (idempotent).
set -euo pipefail

CONFIG="${CODEX_CONFIG:-$HOME/.codex/config.toml}"
mkdir -p "$(dirname "$CONFIG")"
touch "$CONFIG"

if grep -q "mcp_servers.tradepilot-coord" "$CONFIG"; then
  echo "tradepilot-coord MCP already present in $CONFIG — leaving it alone."
  exit 0
fi

cat >> "$CONFIG" <<'TOML'

# TradePilot coordination MCP (shared task board + message bus with Claude Code).
[mcp_servers.tradepilot-coord]
command = "npx"
args = ["-y", "mcp-remote", "http://localhost:8766/mcp"]
TOML

echo "appended tradepilot-coord MCP block to $CONFIG"
