#!/usr/bin/env bash
set -e
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
SETTINGS="$HOME/.claude/settings.json"

echo "Installing CCT hooks into $SETTINGS ..."

# Add hooks to user settings using Python (safe JSON merge)
python3 - << PYEOF
import json, pathlib, sys

p = pathlib.Path("$SETTINGS")
data = json.loads(p.read_text()) if p.exists() else {}
hooks = data.setdefault("hooks", {})

def add_hook(event, matcher, cmd):
    entries = hooks.setdefault(event, [])
    for e in entries:
        if e.get("matcher") == matcher:
            for h in e.get("hooks", []):
                if cmd in h.get("command", ""):
                    return  # already exists
    entries.append({"matcher": matcher, "hooks": [{"type": "command", "command": cmd, "timeout": 2, "async": True}]})

add_hook("UserPromptSubmit", "", "$HOOK_DIR/user_prompt_submit.sh")
add_hook("Stop", "", "$HOOK_DIR/stop.sh")

p.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print("✅ Hooks installed.")
PYEOF
