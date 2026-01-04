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
HEALTH_JSON=$(curl -sS http://127.0.0.1:3333/health 2>/dev/null)
HEALTH_RC=$?
STATUS_JSON=$(curl -sS http://127.0.0.1:3333/api/status 2>/dev/null)
STATUS_RC=$?

if [[ ${HEALTH_RC} -eq 0 ]]; then
  echo "${HEALTH_JSON}"
else
  echo "(health request failed)" >&2
fi

if [[ ${STATUS_RC} -eq 0 ]]; then
  echo "${STATUS_JSON}"

  if command -v node >/dev/null 2>&1; then
    node - <<'NODE'
const raw = process.env.STATUS_JSON;
try {
  const s = JSON.parse(raw);
  const authenticated = !!s.authenticated;
  const hasQR = !!s.hasQR;
  const connecting = !!s.connecting;
  const readyAt = s?.diagnostics?.lastReadyAt || null;

  console.log(`\n==> interpreted`);
  console.log(`authenticated=${authenticated} hasQR=${hasQR} connecting=${connecting} lastReadyAt=${readyAt}`);

  // PASS rules:
  // - If authenticated, QR is normally false and that's OK.
  // - If not authenticated but hasQR=true, linking flow is available.
  // FAIL only if not authenticated AND hasQR is false (nothing to scan).
  if (authenticated) process.exit(0);
  if (!authenticated && hasQR) process.exit(0);
  process.exit(1);
} catch (e) {
  console.error('Failed to parse /api/status JSON:', e?.message || e);
  process.exit(2);
}
NODE
  else
    echo "\n(no node binary found, skipping /api/status interpretation)" >&2
  fi
else
  echo "(status request failed)" >&2
fi

echo
set -e
