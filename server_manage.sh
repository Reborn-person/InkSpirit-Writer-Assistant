#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

WORKDIR=$(pwd)
DEPLOY_DIR="$WORKDIR/deploy"

# Ensure we are in the project root
if [ ! -d "deploy" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory.${NC}"
    exit 1
fi

# Load .env if exists
if [ -f "deploy/.env" ]; then
    source deploy/.env
fi

function show_menu {
    echo -e "\n${BLUE}=== AI Novel Writer Manager ===${NC}"
    echo "1. Start Server (启动服务)"
    echo "2. Stop Server (停止服务)"
    echo "3. Restart Server (重启服务)"
    echo "4. Update & Rebuild (一键更新: 拉取代码+重新构建)"
    echo "5. View Logs (查看日志)"
    echo "6. Setup/Config (配置向导)"
    echo "0. Exit (退出)"
    echo -n "Enter your choice [0-6]: "
}

function check_docker {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker not found. Please install Docker first.${NC}"
        echo "Install command: curl -fsSL https://get.docker.com | bash"
        exit 1
    fi
}

function start_server {
    echo -e "${GREEN}Starting server...${NC}"
    cd "$DEPLOY_DIR"
    docker compose up -d
    echo -e "${GREEN}Server started!${NC}"
    cd "$WORKDIR"
}

function stop_server {
    echo -e "${YELLOW}Stopping server...${NC}"
    cd "$DEPLOY_DIR"
    docker compose down
    echo -e "${GREEN}Server stopped.${NC}"
    cd "$WORKDIR"
}

function restart_server {
    stop_server
    start_server
}

function update_server {
    echo -e "${BLUE}Updating server...${NC}"
    
    # 1. Pull latest code
    echo "Pulling latest code from git..."
    git pull
    
    # 2. Rebuild images
    echo "Rebuilding Docker images..."
    cd "$DEPLOY_DIR"
    docker compose build
    
    # 3. Restart containers
    echo "Restarting containers..."
    docker compose up -d --remove-orphans
    
    # 4. Prune unused images to save space
    docker image prune -f
    
    echo -e "${GREEN}Update completed successfully!${NC}"
    cd "$WORKDIR"
}

function view_logs {
    echo -e "${BLUE}Showing logs (Ctrl+C to exit)...${NC}"
    cd "$DEPLOY_DIR"
    docker compose logs -f --tail=100
    cd "$WORKDIR"
}

function setup_config {
    echo -e "${BLUE}Starting setup wizard...${NC}"
    
    if [ ! -f "deploy/.env" ]; then
        echo "Creating .env from example..."
        cp deploy/.env.example deploy/.env
    fi
    
    # Simple editor for .env
    echo -e "${YELLOW}Please edit the .env file with your configuration.${NC}"
    read -p "Press Enter to open .env with nano (or skip if configured)..."
    if command -v nano &> /dev/null; then
        nano deploy/.env
    else
        vi deploy/.env
    fi
    
    # Caddyfile setup
    echo -e "${YELLOW}Now let's configure your domain in Caddyfile.${NC}"
    read -p "Enter your domain (e.g., example.com): " DOMAIN
    if [ ! -z "$DOMAIN" ]; then
        cat > deploy/Caddyfile <<EOF
$DOMAIN {
  reverse_proxy app:3000
}
EOF
        echo -e "${GREEN}Caddyfile updated with domain: $DOMAIN${NC}"
    fi
}

# Main loop
check_docker

while true; do
    show_menu
    read CHOICE
    case $CHOICE in
        1) start_server ;;
        2) stop_server ;;
        3) restart_server ;;
        4) update_server ;;
        5) view_logs ;;
        6) setup_config ;;
        0) echo "Goodbye!"; exit 0 ;;
        *) echo -e "${RED}Invalid choice.${NC}" ;;
    esac
done
