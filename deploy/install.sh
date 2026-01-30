#!/bin/bash

# Stop on error
set -e

echo "=== Starting AI Novel Writer Deployment on Ubuntu 24.04 ==="

# 1. Update System
echo "-> Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo "-> Docker not found. Installing Docker..."
    # Add Docker's official GPG key:
    sudo apt-get install -y ca-certificates curl
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc

    # Add the repository to Apt sources:
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Enable Docker service
    sudo systemctl enable docker
    sudo systemctl start docker
    
    echo "-> Docker installed successfully."
else
    echo "-> Docker is already installed."
fi

# 3. Check Ports
echo "-> Checking ports 80 and 443..."
if ss -tuln | grep -qE ':80\s|:443\s'; then
    echo "WARNING: Port 80 or 443 is in use. Please stop any running web servers (nginx/apache) before proceeding."
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 4. Create .env if missing
if [ ! -f .env ]; then
    echo "-> Creating .env file from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        # Generate a random JWT secret
        JWT_SECRET=$(openssl rand -hex 32)
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        echo "-> Generated new JWT_SECRET in .env"
    else
        echo "ERROR: .env.example not found!"
        exit 1
    fi
else
    echo "-> .env file exists. Skipping creation."
fi

# 5. Start Docker Compose
echo "-> Building and starting containers..."
sudo docker compose up -d --build

echo "=== Deployment Complete! ==="
echo "Please ensure your domain points to this server's IP."
echo "You can view logs with: sudo docker compose logs -f"
