#!/usr/bin/env bash
# Start both backend and frontend dev servers
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/packages/backend"
FRONTEND="$ROOT/packages/frontend"

echo "Starting CCT development servers..."

# Start backend
cd "$BACKEND"
if ! command -v uv &>/dev/null; then
  pip install uv -q
fi
uv sync -q
uv run cct serve --reload &
BACKEND_PID=$!
echo "  Backend  → http://127.0.0.1:8787  (pid $BACKEND_PID)"

# Start frontend
cd "$FRONTEND"
if [ ! -d node_modules ]; then
  npm install -q
fi
npm run dev &
FRONTEND_PID=$!
echo "  Frontend → http://localhost:5173   (pid $FRONTEND_PID)"

echo ""
echo "  Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
