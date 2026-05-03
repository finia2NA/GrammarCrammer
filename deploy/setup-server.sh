#!/bin/bash
# One-time server setup for PatternDeck
# Run from local machine: bash deploy/setup-server.sh
set -euo pipefail

SERVER="ionos"

echo "=== Installing Node.js 22 LTS ==="
ssh ${SERVER} "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs"

echo "=== Installing pnpm ==="
ssh ${SERVER} "npm install -g pnpm"

echo "=== Creating patterndeck user and directories ==="
ssh ${SERVER} << 'EOF'
  id patterndeck &>/dev/null || useradd --system --create-home --shell /bin/bash patterndeck
  mkdir -p /home/patterndeck/{app,web,data}
  chown -R patterndeck:patterndeck /home/patterndeck
EOF

echo "=== Migrating legacy GrammarCrammer data if present ==="
ssh ${SERVER} << 'EOF'
  if [ -d /home/grammarcrammer ]; then
    mkdir -p /home/patterndeck/{app/server,web,data,env}

    if [ ! -f /home/patterndeck/data/patterndeck.db ] && [ -f /home/grammarcrammer/data/grammarcrammer.db ]; then
      cp /home/grammarcrammer/data/grammarcrammer.db /home/patterndeck/data/patterndeck.db
    fi

    if [ ! -f /home/patterndeck/env/server.env ]; then
      if [ -f /home/grammarcrammer/env/server.env ]; then
        cp /home/grammarcrammer/env/server.env /home/patterndeck/env/server.env
      elif [ -f /home/grammarcrammer/app/server/.env ]; then
        cp /home/grammarcrammer/app/server/.env /home/patterndeck/env/server.env
      fi
    fi

    if [ -f /home/patterndeck/env/server.env ]; then
      sed -i \
        -e 's|^DATABASE_URL=.*|DATABASE_URL="file:/home/patterndeck/data/patterndeck.db"|' \
        -e 's|^APP_URL=.*|APP_URL="https://patterndeck.richardhanss.de"|' \
        -e 's|^EMAIL_FROM=.*|EMAIL_FROM="PatternDeck <noreply@patterndeck.richardhanss.de>"|' \
        /home/patterndeck/env/server.env
      ln -sf /home/patterndeck/env/server.env /home/patterndeck/app/server/.env
    fi

    chown -R patterndeck:patterndeck /home/patterndeck
    chmod 600 /home/patterndeck/env/server.env 2>/dev/null || true
  fi
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

echo "=== Installing nginx + brotli ==="
ssh ${SERVER} "apt-get install -y nginx libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static"

echo "=== Enabling gzip in nginx.conf ==="
ssh ${SERVER} << 'EOF'
  sed -i \
    's/^\t# gzip_vary on;/\tgzip_vary on;/;
     s/^\t# gzip_proxied any;/\tgzip_proxied any;/;
     s/^\t# gzip_comp_level 6;/\tgzip_comp_level 6;/;
     s/^\t# gzip_buffers 16 8k;/\tgzip_buffers 16 8k;/;
     s/^\t# gzip_http_version 1.1;/\tgzip_http_version 1.1;/;
     s|^\t# gzip_types.*|\tgzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;|' \
    /etc/nginx/nginx.conf
EOF

echo "=== Installing nginx site config ==="
scp deploy/patterndeck.nginx.conf ${SERVER}:/etc/nginx/sites-available/patterndeck
ssh ${SERVER} << 'EOF'
  ln -sf /etc/nginx/sites-available/patterndeck /etc/nginx/sites-enabled/patterndeck
  rm -f /etc/nginx/sites-enabled/grammarcrammer
  nginx -t && systemctl reload nginx
EOF

echo "=== Installing systemd service ==="
scp deploy/patterndeck.service ${SERVER}:/etc/systemd/system/patterndeck.service
ssh ${SERVER} "systemctl stop grammarcrammer 2>/dev/null || true; systemctl disable grammarcrammer 2>/dev/null || true; systemctl daemon-reload && systemctl enable patterndeck"

echo "=== Creating production .env ==="
ssh ${SERVER} << EOF
  if [ ! -f /home/patterndeck/app/server/.env ]; then
    cat > /home/patterndeck/app/server/.env << ENVFILE
DATABASE_URL="file:/home/patterndeck/data/patterndeck.db"
JWT_SECRET="$(openssl rand -base64 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
PORT=3001
APP_URL="https://patterndeck.richardhanss.de"
EMAIL_FROM="PatternDeck <noreply@patterndeck.richardhanss.de>"
ENVFILE
    chown patterndeck:patterndeck /home/patterndeck/app/server/.env
    chmod 600 /home/patterndeck/app/server/.env
    echo ".env created with generated secrets"
  else
    echo ".env already exists, skipping"
  fi
EOF

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Point DNS A record for 'patterndeck' to your VPS IP"
echo "  2. Once DNS propagates, run: ssh ${SERVER} 'certbot --nginx -d patterndeck.richardhanss.de'"
echo "  3. Deploy with: bash deploy/deploy.sh"
