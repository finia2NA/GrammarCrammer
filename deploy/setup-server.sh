#!/bin/bash
# One-time server setup for GrammarCrammer
# Run from local machine: bash deploy/setup-server.sh
set -euo pipefail

SERVER="ionos"

echo "=== Installing Node.js 22 LTS ==="
ssh ${SERVER} "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs"

echo "=== Installing pnpm ==="
ssh ${SERVER} "npm install -g pnpm"

echo "=== Creating grammarcrammer user and directories ==="
ssh ${SERVER} << 'EOF'
  id grammarcrammer &>/dev/null || useradd --system --create-home --shell /bin/bash grammarcrammer
  mkdir -p /home/grammarcrammer/{app,web,data}
  chown -R grammarcrammer:grammarcrammer /home/grammarcrammer
EOF

echo "=== Adding swap (512MB safety net) ==="
ssh ${SERVER} << 'EOF'
  if [ ! -f /swapfile ]; then
    fallocate -l 512M /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap enabled"
  else
    echo "Swap already exists"
  fi
EOF

echo "=== Installing nginx config ==="
scp deploy/grammarcrammer.nginx.conf ${SERVER}:/etc/nginx/sites-available/grammarcrammer
ssh ${SERVER} << 'EOF'
  ln -sf /etc/nginx/sites-available/grammarcrammer /etc/nginx/sites-enabled/grammarcrammer
  nginx -t && systemctl reload nginx
EOF

echo "=== Installing systemd service ==="
scp deploy/grammarcrammer.service ${SERVER}:/etc/systemd/system/grammarcrammer.service
ssh ${SERVER} "systemctl daemon-reload && systemctl enable grammarcrammer"

echo "=== Creating production .env ==="
ssh ${SERVER} << EOF
  if [ ! -f /home/grammarcrammer/app/server/.env ]; then
    cat > /home/grammarcrammer/app/server/.env << ENVFILE
DATABASE_URL="file:/home/grammarcrammer/data/grammarcrammer.db"
JWT_SECRET="$(openssl rand -base64 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
PORT=3001
ENVFILE
    chown grammarcrammer:grammarcrammer /home/grammarcrammer/app/server/.env
    chmod 600 /home/grammarcrammer/app/server/.env
    echo ".env created with generated secrets"
  else
    echo ".env already exists, skipping"
  fi
EOF

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Point DNS A record for 'grammarcrammer' to your VPS IP"
echo "  2. Once DNS propagates, run: ssh ${SERVER} 'certbot --nginx -d grammarcrammer.richardhanss.de'"
echo "  3. Deploy with: bash deploy/deploy.sh"
