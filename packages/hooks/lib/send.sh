#!/usr/bin/env bash
# Send event to CCT server. Usage: source send.sh; cct_send <json>
CCT_URL="${CCT_URL:-http://127.0.0.1:8787}"

cct_send() {
    local payload="$1"
    curl -s -X POST "${CCT_URL}/api/v1/ingest" \
        -H "Content-Type: application/json" \
        --max-time 1 \
        -d "$payload" >/dev/null 2>&1 &
}
