#!/usr/bin/env bash
set -euo pipefail

API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3001}"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
HEALTH_URL="${API_URL%/}/api/health"
MAX_WAIT="${DEMO_WAIT_SEC:-60}"

echo "Menunggu backend sehat: ${HEALTH_URL}"
for ((i=1; i<=MAX_WAIT; i++)); do
  if curl -fsS "${HEALTH_URL}" >/dev/null 2>&1; then
    echo "Backend siap."
    break
  fi
  if [[ $i -eq $MAX_WAIT ]]; then
    echo "Timeout: backend belum siap setelah ${MAX_WAIT}s" >&2
    exit 1
  fi
  sleep 1
done

echo "Membuka dashboard: ${APP_URL}"
if command -v open >/dev/null 2>&1; then
  open "${APP_URL}"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${APP_URL}"
else
  echo "Buka manual: ${APP_URL}"
fi
