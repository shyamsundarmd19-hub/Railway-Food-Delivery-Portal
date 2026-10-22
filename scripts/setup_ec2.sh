#!/usr/bin/env bash
# ==============================================================================
# RailFood AWS EC2 Automated Provisioning Script
# Operating System: Ubuntu 22.04 / 24.04 LTS (AWS Free Tier t2.micro / t3.micro)
# Target Architecture: Direct Hosting (Python venv + Systemd + Nginx Reverse Proxy)
# ==============================================================================

set -euo pipefail

# ANSI color output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}       Starting RailFood Deployment on AWS EC2 Instance         ${NC}"
echo -e "${CYAN}================================================================${NC}"

# Check for root / sudo privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: This script must be run as root or with sudo privileges.${NC}"
  echo -e "Usage: sudo bash scripts/setup_ec2.sh"
  exit 1
fi

PROJECT_DIR="/home/ubuntu/railfood"
WWW_DIR="/var/www/railfood"
SERVICE_NAME="railfood.service"

# 1. System Package Updates & Essential Build Tools
echo -e "\n${YELLOW}[1/7] Updating apt repositories and installing core packages...${NC}"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    nginx \
    python3 \
    python3-venv \
    python3-pip \
    libpq-dev \
    gcc \
    curl \
    git \
    ufw

# 2. Configure 1.5GB Swap Space (Crucial for AWS Free Tier 1GB RAM Instances)
echo -e "\n${YELLOW}[2/7] Configuring 1.5GB Swap space for AWS Free Tier memory safety...${NC}"
if ! grep -q "swapfile" /proc/swaps; then
    fallocate -l 1.5G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=1536
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo -e "${GREEN}Swap space successfully enabled.${NC}"
else
    echo -e "${GREEN}Swap space is already configured.${NC}"
fi

# 3. Create Web Directory for React Build Assets
echo -e "\n${YELLOW}[3/7] Setting up frontend web directory at ${WWW_DIR}...${NC}"
mkdir -p "${WWW_DIR}"
chown -R ubuntu:www-data "${WWW_DIR}"
chmod -R 775 "${WWW_DIR}"

# Create a temporary landing page until React build is uploaded
if [ ! -f "${WWW_DIR}/index.html" ]; then
cat <<'EOF' > "${WWW_DIR}/index.html"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RailFood Portal - Online</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0fdf4; color: #064e3b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: white; border: 1px solid #bbf7d0; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.1); text-align: center; max-width: 480px; }
    .badge { background: #10b981; color: white; display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    h1 { color: #047857; margin-top: 0; }
    p { color: #334155; line-height: 1.5; }
    a { color: #059669; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">AWS Free Tier EC2 Active</div>
    <h1>🚆 RailFood Portal</h1>
    <p>FastAPI backend daemon & Nginx reverse proxy are running live.</p>
    <p><a href="/docs">View Interactive API Documentation (/docs)</a></p>
  </div>
</body>
</html>
EOF
fi

# 4. Set Up Python Virtual Environment and Install Requirements
echo -e "\n${YELLOW}[4/7] Setting up Python3 Virtual Environment in ${PROJECT_DIR}/backend...${NC}"
cd "${PROJECT_DIR}/backend"

if [ ! -d "venv" ]; then
    python3 -m venv venv
    chown -R ubuntu:ubuntu venv
fi

# Upgrade pip & install dependencies
echo -e "${CYAN}Installing backend requirements (FastAPI, Uvicorn, SQLAlchemy, Boto3, etc.)...${NC}"
sudo -u ubuntu "${PROJECT_DIR}/backend/venv/bin/pip" install --upgrade pip
sudo -u ubuntu "${PROJECT_DIR}/backend/venv/bin/pip" install -r "${PROJECT_DIR}/backend/requirements.txt"

# 5. Configure and Enable Systemd Service
echo -e "\n${YELLOW}[5/7] Installing Systemd Service (${SERVICE_NAME})...${NC}"
cp "${PROJECT_DIR}/scripts/railfood.service" /etc/systemd/system/${SERVICE_NAME}

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}

# Check service status
if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo -e "${GREEN}✓ RailFood FastAPI service is running successfully!${NC}"
else
    echo -e "${RED}✗ RailFood service failed to start. Inspecting journal logs:${NC}"
    journalctl -u ${SERVICE_NAME} -n 25 --no-pager
fi

# 6. Configure Nginx Reverse Proxy
echo -e "\n${YELLOW}[6/7] Configuring Nginx reverse proxy...${NC}"
cp "${PROJECT_DIR}/scripts/nginx.conf" /etc/nginx/sites-available/railfood

# Remove default site if present
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Symlink to sites-enabled
ln -sf /etc/nginx/sites-available/railfood /etc/nginx/sites-enabled/railfood

# Test Nginx syntax and reload
nginx -t
systemctl restart nginx

# 7. Configure Firewall (UFW)
echo -e "\n${YELLOW}[7/7] Configuring firewall permissions...${NC}"
ufw allow 'Nginx Full' || true
ufw allow 'OpenSSH' || true

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}    RailFood Cloud Infrastructure Setup Completed Successfully! ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "Web App URL:       http://$(curl -s http://checkip.amazonaws.com || echo '<EC2-PUBLIC-IP>')"
echo -e "API Documentation: http://$(curl -s http://checkip.amazonaws.com || echo '<EC2-PUBLIC-IP>')/docs"
echo -e "Check backend:     sudo systemctl status ${SERVICE_NAME}"
echo -e "Follow logs:       sudo journalctl -u ${SERVICE_NAME} -f"
