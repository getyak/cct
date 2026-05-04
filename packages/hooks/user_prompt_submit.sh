#!/usr/bin/env bash
# Claude Code UserPromptSubmit hook — captures user prompt
source "$(dirname "$0")/lib/send.sh"

raw=$(cat)
prompt=$(echo "$raw" | jq -r '.prompt // ""')
[ -z "$prompt" ] && exit 0

payload=$(jq -n \
    --arg src "claude_code" \
    --arg et "user_prompt" \
    --arg ts "$(python3 -c 'import time; print(int(time.time()*1000))')" \
    --arg cwd "$PWD" \
    --arg project "$(basename "$PWD")" \
    --arg content "$prompt" \
    '{
        source: $src,
        event_type: $et,
        timestamp: ($ts | tonumber),
        project_path: $cwd,
        project_name: $project,
        role: "user",
        content: $content
    }')

cct_send "$payload"
exit 0
