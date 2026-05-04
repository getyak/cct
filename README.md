<div align="center">

# CCT — Claude Conversation Tracker

**本地优先的 Claude Code 对话捕获、搜索与分析系统**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![uv](https://img.shields.io/badge/uv-package%20manager-purple)](https://github.com/astral-sh/uv)

[快速开始](#快速开始) · [功能特性](#功能特性) · [架构](#架构) · [API 文档](#api-文档) · [贡献](#贡献)

</div>

---

## 是什么

CCT 通过 Claude Code 的 Hook 机制，在你每次与 Claude 对话时自动捕获对话内容，存入本地 SQLite 数据库，并提供一个 Web 界面用于搜索、浏览和统计分析。

**所有数据存储在本地，不上传任何内容到第三方服务。**

```
你 → Claude Code → CCT Hook → 本地后端 → SQLite → Web Dashboard
```

## 功能特性

- **自动捕获**：通过 Claude Code Hook 零干预记录每次对话
- **实时推送**：WebSocket 实时更新，新对话即时出现在 Dashboard
- **全文搜索**：跨所有历史对话的关键词搜索
- **意图分类**：自动识别对话类型（代码生成、Debug、文档、解释说明等）
- **统计分析**：Token 用量趋势、意图分布图表
- **本地优先**：数据存储在 `~/.cct/`，完全离线运行
- **开放 API**：标准 REST + WebSocket，可集成到任何工具

## 快速开始

### 前置依赖

- Python 3.11+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv)（Python 包管理器）
- [Claude Code](https://claude.ai/code) CLI

### 一键启动（开发模式）

```bash
git clone https://github.com/cubxxw/cct.git
cd cct
bash scripts/dev.sh
```

后端运行在 `http://127.0.0.1:8787`，前端运行在 `http://localhost:5173`。

### 分步安装

**1. 启动后端**

```bash
cd packages/backend
pip install uv   # 若尚未安装
uv sync
uv run cct serve
```

**2. 启动前端**

```bash
cd packages/frontend
npm install
npm run dev
```

**3. 安装 Claude Code Hook**（自动捕获对话）

```bash
bash packages/hooks/install.sh
```

安装后，每次在 Claude Code 中提问，对话内容会自动发送到 CCT。

**4. 开机自启（可选，macOS）**

```bash
bash scripts/install_launchd.sh
```

## 架构

```
cct/
├── packages/
│   ├── backend/              # Python · FastAPI · SQLite
│   │   └── cct/
│   │       ├── api/          # REST + WebSocket 路由
│   │       │   ├── ingest.py     # POST /api/v1/ingest
│   │       │   ├── sessions.py   # GET  /api/v1/sessions
│   │       │   ├── search.py     # GET  /api/v1/search
│   │       │   ├── stats.py      # GET  /api/v1/stats/*
│   │       │   └── ws.py         # WS   /ws/live
│   │       ├── intent/       # 意图分类引擎（规则）
│   │       ├── pipeline/     # 异步处理队列
│   │       ├── storage/      # SQLite + JSONL 归档
│   │       └── realtime/     # WebSocket 广播
│   ├── frontend/             # React 18 · Vite · Tailwind CSS
│   │   └── src/
│   │       ├── routes/       # Dashboard / History / Detail
│   │       ├── components/   # 图表、列表、搜索栏等组件
│   │       ├── hooks/        # useSessions / useLiveFeed
│   │       └── lib/          # API 客户端 / WebSocket 封装
│   └── hooks/                # Claude Code Hook 脚本（Bash）
│       ├── install.sh            # 安装到 ~/.claude/settings.json
│       ├── uninstall.sh          # 卸载
│       ├── user_prompt_submit.sh # UserPromptSubmit 事件处理
│       └── stop.sh               # Stop 事件处理
├── scripts/
│   ├── dev.sh                # 同时启动后端 + 前端
│   └── install_launchd.sh    # macOS 开机自启
└── ~/.cct/                   # 运行时数据（自动创建）
    ├── db.sqlite              # 主数据库
    ├── raw/                   # JSONL 原始归档
    └── logs/                  # 运行日志
```

### 数据流

```
Claude Code
    │  UserPromptSubmit Hook
    ▼
user_prompt_submit.sh
    │  POST /api/v1/ingest
    ▼
FastAPI Ingest API
    │
    ├── AsyncQueue ──► IntentClassifier ──► SQLite (sessions + messages)
    │                                   └── JSONL Archive
    └── WebSocket Broadcaster ──► Frontend (实时)
```

## API 文档

启动后访问交互式文档：[http://127.0.0.1:8787/docs](http://127.0.0.1:8787/docs)

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/ingest` | 接收对话事件 |
| `GET` | `/api/v1/sessions` | 会话列表（分页） |
| `GET` | `/api/v1/sessions/{id}` | 会话详情 + 消息列表 |
| `GET` | `/api/v1/search?q=xxx` | 全文搜索 |
| `GET` | `/api/v1/stats/intents` | 意图分布统计 |
| `GET` | `/api/v1/stats/tokens` | Token 用量趋势 |
| `WS` | `/ws/live` | 实时推送（WebSocket） |

### 手动接入示例

```bash
curl -X POST http://127.0.0.1:8787/api/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source": "http_api",
    "event_type": "user_prompt",
    "timestamp": 1714435200000,
    "project_path": "/my/project",
    "project_name": "my-project",
    "role": "user",
    "content": "如何用 Python 读取 CSV 文件？"
  }'
```

## 意图分类

| 意图 | 描述 | 触发关键词示例 |
|------|------|--------------|
| `code_generation` | 生成新代码 | 写、实现、创建、generate |
| `debug` | 调试问题 | 报错、fix、bug、为什么 |
| `explanation` | 解释说明 | 什么是、怎么理解、explain |
| `documentation` | 文档相关 | README、注释、文档 |
| `refactoring` | 重构优化 | 重构、优化、refactor |
| `other` | 其他 | — |

## 贡献

欢迎提交 Issue 和 Pull Request。

```bash
git clone https://github.com/cubxxw/cct.git
cd cct

# 后端开发
cd packages/backend && uv sync && uv run pytest

# 前端开发
cd packages/frontend && npm install && npm run dev
```

提交规范遵循 [Conventional Commits](https://www.conventionalcommits.org/)：`feat:` / `fix:` / `docs:` / `refactor:` / `chore:`

## License

[MIT](LICENSE) © 2025 [cubxxw](https://github.com/cubxxw)
