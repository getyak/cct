#!/usr/bin/env bash
# Install CCT as a macOS launchd service (auto-start on login)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/packages/backend"
PLIST_SRC="$ROOT/scripts/launchd/com.cct.tracker.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.cct.tracker.plist"
LOG_DIR="$HOME/.cct/logs"

mkdir -p "$LOG_DIR"

# Generate plist with real paths
sed \
  -e "s|REPLACE_WITH_BACKEND_PATH|$BACKEND|g" \
  -e "s|REPLACE_USERNAME|$(whoami)|g" \
  "$PLIST_SRC" > "$PLIST_DST"

launchctl unload "$PLIST_DST" 2>/dev/null || true
launchctl load -w "$PLIST_DST"

echo "✅ CCT service installed. Backend running at http://127.0.0.1:8787"
echo "   Logs: $LOG_DIR/cct.log"
echo "   To uninstall: launchctl unload $PLIST_DST && rm $PLIST_DST"
