from __future__ import annotations

import os
from pathlib import Path

try:
    import tomllib
except ImportError:
    import tomli as tomllib  # type: ignore

_DEFAULT = {
    "server": {"host": "127.0.0.1", "port": 8787},
    "storage": {"data_dir": "~/.cct", "jsonl_rotation": "daily", "retention_days": 365},
    "intent": {"enable_llm_fallback": False, "confidence_threshold": 0.7},
    "ui": {"auto_open_browser": False},
    "privacy": {"redact_secrets": True, "exclude_projects": []},
}

def _load() -> dict:
    cfg_path = Path("~/.cct/config.toml").expanduser()
    if cfg_path.exists():
        with open(cfg_path, "rb") as f:
            user = tomllib.load(f)
        for section, vals in user.items():
            if section in _DEFAULT and isinstance(vals, dict):
                _DEFAULT[section].update(vals)
    return _DEFAULT

settings = _load()

def data_dir() -> Path:
    p = Path(settings["storage"]["data_dir"]).expanduser()
    p.mkdir(parents=True, exist_ok=True)
    return p

def db_path() -> Path:
    return data_dir() / "db.sqlite"

def raw_dir() -> Path:
    d = data_dir() / "raw"
    d.mkdir(exist_ok=True)
    return d

def server_host() -> str:
    return os.getenv("CCT_HOST", settings["server"]["host"])

def server_port() -> int:
    return int(os.getenv("CCT_PORT", settings["server"]["port"]))
