#!/usr/bin/env bash
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
SETTINGS="$HOME/.claude/settings.json"

python3 - << PYEOF
import json, pathlib

p = pathlib.Path("$SETTINGS")
if not p.exists():
    print("No settings file found."); exit()

data = json.loads(p.read_text())
hooks = data.get("hooks", {})

for event in list(hooks.keys()):
    hooks[event] = [
        e for e in hooks[event]
        if not any("cct" in h.get("command","").lower() for h in e.get("hooks",[]))
    ]
    if not hooks[event]:
        del hooks[event]

p.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print("✅ CCT hooks removed.")
PYEOF
