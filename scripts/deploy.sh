#!/usr/bin/env bash
# ==============================================================================
# RailFood Production Deployment Script for AWS EC2 (Bare-Metal / No Docker)
# Architecture: Git Pull -> Python venv -> React Build to /var/www/railfood -> Systemd Reload
# ==============================================================================

set -euo pipefail

# Color palette
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="${RAILFOOD_DIR:-/home/ubuntu/railfood}"
WWW_DIR="/var/www/railfood"
SERVICE_NAME="railfood.service"

echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}          Starting RailFood Continuous Deployment on EC2        ${NC}"
echo -e "${CYAN}================================================================${NC}"

# 1. Pull Latest Code from Git
echo -e "\n${YELLOW}[1/5] Pulling latest commits from git repository...${NC}"
cd "${PROJECT_DIR}"
if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    git fetch --all
    git reset --hard origin/main || git pull origin main
    echo -e "${GREEN}✓ Codebase successfully synced to latest commit:${NC} $(git log -1 --oneline)"
else
    echo -e "${YELLOW}Warning: ${PROJECT_DIR} is not a git repository. Proceeding with existing code.${NC}"
fi

# 2. Update Python Virtual Environment & Requirements
echo -e "\n${YELLOW}[2/5] Updating Python virtual environment & backend dependencies...${NC}"
cd "${PROJECT_DIR}/backend"
if [ ! -d "venv" ]; then
    echo -e "${CYAN}Creating fresh Python virtual environment...${NC}"
    python3 -m venv venv
fi

"${PROJECT_DIR}/backend/venv/bin/pip" install --upgrade pip setuptools wheel
"${PROJECT_DIR}/backend/venv/bin/pip" install -r requirements.txt
echo -e "${GREEN}✓ Backend Python dependencies installed.${NC}"

# 3. Build & Deploy React Single Page Application (SPA)
echo -e "\n${YELLOW}[3/5] Building React SPA with Vite & Tailwind CSS...${NC}"
cd "${PROJECT_DIR}/frontend"

if command -v npm &> /dev/null; then
    npm ci || npm install
    npm run build

    echo -e "${CYAN}Publishing production bundle to ${WWW_DIR}...${NC}"
    sudo mkdir -p "${WWW_DIR}"
    sudo rm -rf "${WWW_DIR:?}"/*
    sudo cp -r dist/* "${WWW_DIR}/"
    sudo chown -R ubuntu:www-data "${WWW_DIR}"
    sudo chmod -R 755 "${WWW_DIR}"
    echo -e "${GREEN}✓ React frontend built and published to ${WWW_DIR}.${NC}"
else
    echo -e "${RED}Error: npm not found on system. Please ensure Node.js is installed.${NC}"
    exit 1
fi

# 4. Restart Uvicorn Daemon & Reload Nginx
echo -e "\n${YELLOW}[4/5] Gracefully restarting RailFood systemd service & Nginx...${NC}"
sudo systemctl restart "${SERVICE_NAME}"
sudo systemctl reload nginx

# 5. Automated Post-Deployment Health Check
echo -e "\n${YELLOW}[5/5] Performing automated post-deployment health check...${NC}"
sleep 2

HEALTH_CHECK_URL="http://127.0.0.1:8000/health"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_CHECK_URL}" || echo "000")

if [ "${HTTP_STATUS}" -eq 200 ]; then
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN} ✓ DEPLOYMENT SUCCESSFUL: Health Check Passed (HTTP 200 OK)     ${NC}"
    echo -e "${GREEN}================================================================${NC}"
    sudo systemctl status "${SERVICE_NAME}" --no-pager -n 5
else
    echo -e "${RED}================================================================${NC}"
    echo -e "${RED} ✗ DEPLOYMENT FAILED: Health Check returned HTTP ${HTTP_STATUS} ${NC}"
    echo -e "${RED}================================================================${NC}"
    echo -e "${YELLOW}Inspecting journalctl logs for ${SERVICE_NAME}:${NC}"
    sudo journalctl -u "${SERVICE_NAME}" -n 25 --no-pager
    exit 1
fi
