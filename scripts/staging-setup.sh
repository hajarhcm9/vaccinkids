#!/usr/bin/env bash
# One-time VPS setup script for VacciniKids staging.
# Run this as root (or with sudo) on a fresh Ubuntu 22.04 server.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/vaccinikids/main/scripts/staging-setup.sh | sudo bash
# Or copy the file and run:
#   sudo bash scripts/staging-setup.sh

set -euo pipefail

log() { echo "[setup] $*"; }

# ── 1. System update ─────────────────────────────────────────────────────────
log "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git ufw age

# ── 2. Docker Engine ─────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  log "Docker already installed: $(docker --version)"
fi

# ── 3. Docker Compose v2 ─────────────────────────────────────────────────────
if ! docker compose version &>/dev/null; then
  log "Installing Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin
else
  log "Docker Compose already installed: $(docker compose version)"
fi

# ── 4. Firewall ──────────────────────────────────────────────────────────────
log "Configuring ufw firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp   # HTTP (Let's Encrypt ACME challenge + redirect to HTTPS)
ufw allow 443/tcp  # HTTPS
ufw --force enable
log "Firewall rules:"
ufw status numbered

# ── 5. Backup encryption key ─────────────────────────────────────────────────
BACKUP_KEY_DIR="/root/.vaccinikids"
BACKUP_KEY_FILE="$BACKUP_KEY_DIR/backup.key"
if [[ ! -f "$BACKUP_KEY_FILE" ]]; then
  log "Generating age backup encryption key..."
  mkdir -p "$BACKUP_KEY_DIR"
  chmod 700 "$BACKUP_KEY_DIR"
  age-keygen -o "$BACKUP_KEY_FILE"
  chmod 600 "$BACKUP_KEY_FILE"
  BACKUP_PUBLIC=$(age-keygen -y "$BACKUP_KEY_FILE")
  log "Backup key generated. Add this to .env.staging as BACKUP_AGE_RECIPIENT:"
  echo ""
  echo "  BACKUP_AGE_RECIPIENT=$BACKUP_PUBLIC"
  echo ""
  log "IMPORTANT: Back up $BACKUP_KEY_FILE offsite — you cannot restore without it."
else
  log "Backup key already exists at $BACKUP_KEY_FILE"
  echo "  BACKUP_AGE_RECIPIENT=$(age-keygen -y "$BACKUP_KEY_FILE")"
fi

# ── 6. Daily backup cron ─────────────────────────────────────────────────────
CRON_FILE="/etc/cron.d/vaccinikids-backup"
if [[ ! -f "$CRON_FILE" ]]; then
  log "Installing daily backup cron job..."
  cat > "$CRON_FILE" <<'CRON'
# VacciniKids daily encrypted PostgreSQL backup (runs at 02:00 UTC)
0 2 * * * root cd /opt/vaccinikids && \
  BACKUP_AGE_RECIPIENT="$(grep BACKUP_AGE_RECIPIENT .env.staging | cut -d= -f2-)" \
  BACKUP_DIR=/var/backups/vaccinikids \
  docker compose --env-file .env.staging -f docker-compose.staging.yml exec -T api \
  sh -c 'node scripts/migrate.js 2>/dev/null; true' && \
  npm --prefix /opt/vaccinikids run db:backup >> /var/log/vaccinikids-backup.log 2>&1
CRON
  chmod 644 "$CRON_FILE"
  mkdir -p /var/backups/vaccinikids
  log "Backup cron installed."
fi

# ── 7. Deploy directory ───────────────────────────────────────────────────────
DEPLOY_DIR="/opt/vaccinikids"
if [[ ! -d "$DEPLOY_DIR" ]]; then
  log "Creating deploy directory $DEPLOY_DIR"
  mkdir -p "$DEPLOY_DIR"
fi

log ""
log "================================================================"
log " VPS setup complete. Next steps:"
log "================================================================"
log ""
log " 1. Clone the repository into $DEPLOY_DIR:"
log "    git clone https://github.com/YOUR_ORG/vaccinikids.git $DEPLOY_DIR"
log "    cd $DEPLOY_DIR"
log ""
log " 2. Generate staging secrets:"
log "    bash scripts/generate-staging-env.sh"
log ""
log " 3. Fill in the FILL_ME_IN values in .env.staging"
log "    (SMS key, Firebase credentials, email, domain)"
log ""
log " 4. Update Caddyfile.staging with your real domain"
log ""
log " 5. Point your DNS A record to this server's IP: $(curl -s ifconfig.me)"
log ""
log " 6. Start the stack:"
log "    npm run staging:up"
log "    npm run staging:migrate"
log ""
log " 7. Bootstrap first admin:"
log "    docker compose --env-file .env.staging -f docker-compose.staging.yml exec api node scripts/bootstrap-admin.js"
log ""
