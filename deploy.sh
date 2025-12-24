#!/usr/bin/env bash
set -Eeuo pipefail

SSH_HOST="${SSH_HOST:-144.124.249.196}"
SSH_USER="${SSH_USER:-root}"
SSH_PORT="${SSH_PORT:-22}"
SSH_IDENTITY="${SSH_IDENTITY:-}"
REMOTE_DIR="${REMOTE_DIR:-/root/leo}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

SSH_OPTS=(-p "${SSH_PORT}" -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=60 -o ServerAliveCountMax=10)
SCP_OPTS=(-P "${SSH_PORT}" -o StrictHostKeyChecking=accept-new)
[[ -n "${SSH_IDENTITY}" ]] && { SSH_OPTS+=(-i "${SSH_IDENTITY}"); SCP_OPTS+=(-i "${SSH_IDENTITY}"); }

remote() { ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SSH_HOST}" "bash -lc 'unset DOCKER_HOST; $*'"; }

echo "=== Leo Agent Deploy ==="
echo "Target: ${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}"
echo ""

echo "[1/4] Syncing files -> ${REMOTE_DIR}"
ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SSH_HOST}" "mkdir -p '${REMOTE_DIR}'"
rsync -az --delete \
  --exclude .git \
  --exclude node_modules \
  --exclude .next \
  --exclude .cache \
  --exclude dist \
  --exclude .idea \
  --exclude .DS_Store \
  --exclude .env \
  --exclude .env.local \
  -e "ssh ${SSH_OPTS[*]}" \
  ./ "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/"

echo "[2/4] Copying .env.prod -> .env on server"
remote "cd '${REMOTE_DIR}' && cp .env.prod .env"

echo "[3/4] Building containers"
remote "cd '${REMOTE_DIR}' && docker compose -f '${COMPOSE_FILE}' build"

echo "[4/4] Starting containers"
remote "cd '${REMOTE_DIR}' && docker compose -f '${COMPOSE_FILE}' up -d"

echo ""
echo "✅ Deploy complete!"
echo "🌐 Server: ${SSH_HOST}"
