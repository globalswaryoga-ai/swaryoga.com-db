#!/usr/bin/env bash
set -euo pipefail

# Deploy WhatsApp Web bridge on an EC2/VPS host.
# This script is meant to be run ON THE SERVER.
#
# Usage:
#   ./deploy/wa-bridge/deploy.sh /home/ubuntu/swaryoga/swaryoga.com-db /home/ubuntu/wa-bridge
#
# What it does (idempotent):
# - git pull latest code
# - rebuild wa-bridge image (no-cache)
# - restart container

REPO_DIR=${1:-}
COMPOSE_DIR=${2:-}

if [[ -z "${REPO_DIR}" || -z "${COMPOSE_DIR}" ]]; then
  echo "Usage: $0 <REPO_DIR> <COMPOSE_DIR>" >&2
  exit 2
fi

if [[ ! -d "${REPO_DIR}" ]]; then
  echo "Repo dir not found: ${REPO_DIR}" >&2
  exit 2
fi

if [[ ! -f "${COMPOSE_DIR}/docker-compose.yml" ]]; then
  echo "docker-compose.yml not found in: ${COMPOSE_DIR}" >&2
  exit 2
fi

echo "==> Pulling latest repo code in ${REPO_DIR}"
cd "${REPO_DIR}"
# If the server has local changes, fail loudly so we don't deploy a dirty state.
if [[ -n "$(git status --porcelain=v1)" ]]; then
  echo "Refusing to deploy: repo has uncommitted changes" >&2
  git status --porcelain=v1 >&2
  exit 3
fi

git pull --ff-only

# Compose builds using its own context path, but pulling here ensures the source-of-truth is up to date.

echo "==> Rebuilding wa-bridge image (no-cache)"
cd "${COMPOSE_DIR}"
docker compose build --no-cache wa-bridge

echo "==> Restarting container"
docker compose up -d --force-recreate wa-bridge

echo "==> Smoke-checking qrServer.js syntax inside container"
# Fails fast if the image/container contains a broken qrServer.js.
docker compose exec -T wa-bridge node -c /app/qrServer.js

echo "==> Done"
