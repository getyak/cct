#!/usr/bin/env bash
# Claude Code Stop hook — captures assistant reply and session metrics
source "$(dirname "$0")/lib/send.sh"

raw=$(cat)
session_id=$(echo "$raw" | jq -r '.session_id // ""')
[ -z "$session_id" ] && exit 0

payload=$(jq -n \
    --arg src "claude_code" \
    --arg et "session_end" \
    --arg ts "$(/usr/bin/perl -MTime::HiRes=time -e 'printf "%d", time*1000')" \
    --arg sid "$session_id" \
    --arg cwd "$PWD" \
    --argjson raw "$raw" \
    '{
        source: $src,
        event_type: $et,
        timestamp: ($ts | tonumber),
        session_id: $sid,
        project_path: $cwd,
        metadata: $raw
    }')

cct_send "$payload"
exit 0
