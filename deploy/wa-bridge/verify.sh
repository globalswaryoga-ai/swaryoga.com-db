#!/usr/bin/env bash
set -euo pipefail

# Verify WhatsApp Web bridge container is running expected code.
# Run ON THE SERVER.
#
# Usage:
#   ./deploy/wa-bridge/verify.sh /home/ubuntu/wa-bridge wa-bridge
#
# Prints:
# - running image id
# - qrServer.js key markers (RECOVERY + headless)
# - /health and /api/status JSON (if available)

COMPOSE_DIR=${1:-}
SERVICE_NAME=${2:-wa-bridge}

if [[ -z "${COMPOSE_DIR}" ]]; then
  echo "Usage: $0 <COMPOSE_DIR> [SERVICE_NAME]" >&2
  exit 2
fi

cd "${COMPOSE_DIR}"

CID=$(docker compose ps -q "${SERVICE_NAME}" || true)
if [[ -z "${CID}" ]]; then
  echo "Service not running: ${SERVICE_NAME}" >&2
  docker compose ps
  exit 1
fi

echo "==> container: ${CID}"
docker inspect --format='image={{.Image}} name={{.Name}} started={{.State.StartedAt}}' "${CID}" || true

echo "\n==> qrServer.js markers"
docker exec -i "${CID}" sh -lc "grep -n 'RECOVERY' /app/qrServer.js | head -n 5 || true"
docker exec -i "${CID}" sh -lc "grep -n 'headless' /app/qrServer.js | head -n 10 || true"

echo "\n==> http checks"
set +e
curl -sS http://127.0.0.1:3333/health || true
echo
curl -sS http://127.0.0.1:3333/api/status || true
echo
set -e
