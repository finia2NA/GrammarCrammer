#!/bin/bash
# Deploy GrammarCrammer frontend + backend to VPS
# Usage: bash deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."

SERVER="ionos"
REMOTE_APP="/home/grammarcrammer/app"
REMOTE_WEB="/home/grammarcrammer/web"
TEMP_DIR="/tmp/gc-deploy"

echo "=== Building frontend (Expo web) ==="
pnpm --filter client exec expo export --platform web

echo ""
echo "=== Building backend (TypeScript) ==="
pnpm --filter server build

echo ""
echo "=== Uploading to server ==="
ssh ${SERVER} "mkdir -p ${TEMP_DIR}/{server,client,web}"

# Upload server files (source + dist + prisma, excluding node_modules/.env/db)
# Include root-level pnpm files so pnpm install --filter works on the VPS
rsync -az --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='*.db' \
  --exclude='*.db-journal' \
  server/ ${SERVER}:${TEMP_DIR}/server/

rsync -az \
  package.json pnpm-workspace.yaml pnpm-lock.yaml \
  ${SERVER}:${TEMP_DIR}/

# Send real client package.json so the lockfile matches
rsync -az client/package.json ${SERVER}:${TEMP_DIR}/client/package.json

# Upload web static files
rsync -az --delete \
  client/dist/ ${SERVER}:${TEMP_DIR}/web/

echo ""
echo "=== Deploying on server ==="
ssh ${SERVER} << 'DEPLOY_EOF'
  set -euo pipefail

  REMOTE_APP="/home/grammarcrammer/app"
  REMOTE_WEB="/home/grammarcrammer/web"
  TEMP_DIR="/tmp/gc-deploy"

  ENV_DIR="/home/grammarcrammer/env"
  mkdir -p ${ENV_DIR}

  # Move .env files to persistent location if still inside app/
  [ -f ${REMOTE_APP}/server/.env ] && [ ! -f ${ENV_DIR}/server.env ] && mv ${REMOTE_APP}/server/.env ${ENV_DIR}/server.env
  [ -f ${REMOTE_APP}/client/.env ] && [ ! -f ${ENV_DIR}/client.env ] && mv ${REMOTE_APP}/client/.env ${ENV_DIR}/client.env

  # Stop service
  systemctl stop grammarcrammer 2>/dev/null || true

  # Swap in new app files
  rm -rf ${REMOTE_APP}/*
  cp -r ${TEMP_DIR}/package.json ${TEMP_DIR}/pnpm-workspace.yaml ${TEMP_DIR}/pnpm-lock.yaml ${REMOTE_APP}/
  cp -r ${TEMP_DIR}/server ${REMOTE_APP}/server
  cp -r ${TEMP_DIR}/client ${REMOTE_APP}/client

  # Symlink .env files from persistent location
  [ -f ${ENV_DIR}/server.env ] && ln -sf ${ENV_DIR}/server.env ${REMOTE_APP}/server/.env
  [ -f ${ENV_DIR}/client.env ] && ln -sf ${ENV_DIR}/client.env ${REMOTE_APP}/client/.env

  # Swap in new web files
  rm -rf ${REMOTE_WEB}/*
  cp -r ${TEMP_DIR}/web/* ${REMOTE_WEB}/

  # Fix ownership and permissions for nginx
  chown -R grammarcrammer:grammarcrammer ${REMOTE_APP} ${REMOTE_WEB}
  chmod o+x /home/grammarcrammer
  chmod -R o+r ${REMOTE_WEB}
  find ${REMOTE_WEB} -type d -exec chmod o+x {} +

  # Install production dependencies (prisma is a prod dep)
  cd ${REMOTE_APP}
  sudo -u grammarcrammer pnpm install --filter server --prod --frozen-lockfile --ignore-scripts

  # Generate Prisma client and run migrations
  cd ${REMOTE_APP}/server
  sudo -u grammarcrammer npx prisma generate
  sudo -u grammarcrammer npx prisma migrate deploy

  # Start service
  systemctl start grammarcrammer

  # Cleanup
  rm -rf ${TEMP_DIR}

  echo ""
  echo "Service status: $(systemctl is-active grammarcrammer)"
DEPLOY_EOF

echo ""
echo "=== Verifying deployment ==="
sleep 2
STATUS=$(curl -sf https://grammarcrammer.richardhanss.de/api/health 2>&1) && echo "Health check: ${STATUS}" || echo "Health check failed (may need DNS/SSL setup first)"

echo ""
echo "=== Done ==="
