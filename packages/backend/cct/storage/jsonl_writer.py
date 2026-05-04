from __future__ import annotations
import json
from datetime import datetime, timezone
from cct.config import raw_dir

async def append(event: dict) -> str:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    path = raw_dir() / f"{today}.jsonl"
    line = json.dumps(event, ensure_ascii=False)
    with open(path, "a", encoding="utf-8") as f:
        f.write(line + "\n")
    return f"{path}:{path.stat().st_size}"
