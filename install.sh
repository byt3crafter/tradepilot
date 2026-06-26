#!/bin/bash
# DockCtrl Installation Script
# Usage:
#   curl -sSL https://dockctrl.app/install.sh | bash                                    (Install CLI)
#   curl -sSL https://dockctrl.app/install.sh | bash -s -- --hub                        (Install Hub Stack)
#   curl -sSL https://dockctrl.app/install.sh | bash -s -- --token=... --api-key=...   (Install Agent)
#
# Distribution Strategy:
#   1. Try DockCtrl Registry (registry.dockctrl.app) - Primary, validates platform
#   2. Fallback to GitHub Container Registry (ghcr.io) - Global CDN, always available
#   3. Last resort: Direct binary download - Works in air-gapped environments

set -e

# Configuration
REPO_URL="https://raw.githubusercontent.com/dovik/dockctrl/main"
DOWNLOAD_URL="https://dockctrl.app/downloads"
INSTALL_DIR="/usr/local/bin"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# --- 1. OS & Environment Detection ---
detect_os() {
    log "Checking system requirements..."
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        error "Cannot detect OS. Only Linux (Debian/Ubuntu/CentOS/Fedora) is supported."
        exit 1
    fi
    
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64) BIN_ARCH="amd64" ;;
        aarch64|arm64) BIN_ARCH="arm64" ;;
        *)
            error "Unsupported architecture: $ARCH"
            exit 1
            ;;
    esac
    
    success "Detected $OS $VER ($ARCH)"
}

# --- 2. Docker Installation ---
install_docker() {
    if command -v docker &> /dev/null; then
        success "Docker is already installed."
    else
        log "Docker not found. Installing..."
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        success "Docker installed."
    fi

    # Check Compose
    if docker compose version &> /dev/null; then
        success "Docker Compose is available."
    else
        log "Installing Docker Compose Plugin..."
        sudo apt-get update && sudo apt-get install -y docker-compose-plugin
    fi
}

# --- 3. CLI Installation ---
install_cli() {
    log "Installing DockCtrl CLI..."
    
    # Fetch version information
    CLI_VERSION="unknown"
    if curl -fsSL "${DOWNLOAD_URL}/VERSION" -o /tmp/dockctrl_version 2>/dev/null; then
        CLI_VERSION=$(cat /tmp/dockctrl_version)
        log "Latest CLI version: ${CLI_VERSION}"
        rm -f /tmp/dockctrl_version
    elif curl -fsSL "https://github.com/byt3crafter/dockctrl/raw/main/downloads/VERSION" -o /tmp/dockctrl_version 2>/dev/null; then
        CLI_VERSION=$(cat /tmp/dockctrl_version)
        log "Latest CLI version: ${CLI_VERSION}"
        rm -f /tmp/dockctrl_version
    else
        log "⚠️  Could not fetch version info, proceeding anyway..."
    fi
    
    BINARY="dockctrl-linux-${BIN_ARCH}"
    DOWNLOADED=false
    
    # Try 1: Primary download from dockctrl.app
    log "🔍 Attempting download from dockctrl.app..."
    if curl -fsSL "${DOWNLOAD_URL}/${BINARY}" -o /tmp/dockctrl 2>/dev/null; then
        chmod +x /tmp/dockctrl
        sudo mv /tmp/dockctrl "${INSTALL_DIR}/dockctrl"
        success "✅ Downloaded from dockctrl.app"
        DOWNLOADED=true
    else
        log "⚠️  Primary download failed, trying GitHub fallback..."
    fi
    
    # Try 2: Fallback to GitHub raw content
    if [ "$DOWNLOADED" = false ]; then
        log "🔍 Attempting download from GitHub..."
        GITHUB_URL="https://github.com/byt3crafter/dockctrl/raw/main/downloads/${BINARY}"
        if curl -fsSL "${GITHUB_URL}" -o /tmp/dockctrl 2>/dev/null; then
            chmod +x /tmp/dockctrl
            sudo mv /tmp/dockctrl "${INSTALL_DIR}/dockctrl"
            success "✅ Downloaded from GitHub"
            DOWNLOADED=true
        else
            error "❌ All download sources failed. Please check:"
            error "   1. Your internet connection"
            error "   2. That the binary exists at: ${DOWNLOAD_URL}/${BINARY}"
            error "   3. Or manually download from: ${GITHUB_URL}"
            exit 1
        fi
    fi

    # Verify installation
    if [ -f "${INSTALL_DIR}/dockctrl" ]; then
        success "DockCtrl CLI ${CLI_VERSION} installed to ${INSTALL_DIR}/dockctrl"
    else
        success "DockCtrl CLI installed to ${INSTALL_DIR}/dockctrl"
    fi
}

# --- 4. Hub Installation ---
install_hub() {
    log "Setting up DockCtrl Hub..."
    
    # Fetch version information
    HUB_VERSION="unknown"
    if curl -fsSL "${DOWNLOAD_URL}/HUB_VERSION" -o /tmp/hub_version 2>/dev/null; then
        HUB_VERSION=$(cat /tmp/hub_version)
        log "Latest Hub version: ${HUB_VERSION}"
        rm -f /tmp/hub_version
    elif curl -fsSL "https://github.com/byt3crafter/dockctrl/raw/main/downloads/HUB_VERSION" -o /tmp/hub_version 2>/dev/null; then
        HUB_VERSION=$(cat /tmp/hub_version)
        log "Latest Hub version: ${HUB_VERSION}"
        rm -f /tmp/hub_version
    else
        log "⚠️  Could not fetch hub version info, proceeding anyway..."
    fi
    
    install_docker
    
    mkdir -p dockctrl-hub
    cd dockctrl-hub
    
    # Download Compose
    # For local test:
    cp ../deployment/docker-compose.hub.yml docker-compose.yml 2>/dev/null || curl -fsSL "${DOWNLOAD_URL}/docker-compose.hub.yml" -o docker-compose.yml
    
    # Generate Secrets
    if [ ! -f .env ]; then
        log "Generating .env..."
        echo "HUB_SECRET=$(openssl rand -hex 32)" >> .env
        echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)" >> .env
        echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
        # Add other defaults
    fi
    
    # Firewall
    setup_firewall
    
    log "Starting Hub..."
    # sudo docker compose up -d
    success "Hub installed! Run 'cd dockctrl-hub && docker compose up -d' to start."
}

# --- 5. Agent Installation ---
install_agent() {
    TOKEN=$1
    API_KEY=$2
    HUB_URL=${3:-"https://dockctrl.app"}

    log "Setting up DockCtrl Agent..."
    
    # Fetch version information
    AGENT_VERSION="unknown"
    if curl -fsSL "${DOWNLOAD_URL}/AGENT_VERSION" -o /tmp/agent_version 2>/dev/null; then
        AGENT_VERSION=$(cat /tmp/agent_version)
        log "Latest Agent version: ${AGENT_VERSION}"
        rm -f /tmp/agent_version
    elif curl -fsSL "https://github.com/byt3crafter/dockctrl/raw/main/downloads/AGENT_VERSION" -o /tmp/agent_version 2>/dev/null; then
        AGENT_VERSION=$(cat /tmp/agent_version)
        log "Latest Agent version: ${AGENT_VERSION}"
        rm -f /tmp/agent_version
    else
        log "⚠️  Could not fetch agent version info, proceeding anyway..."
    fi
    
    install_docker

    mkdir -p dockctrl-agent
    cd dockctrl-agent

    # Fallback strategy for agent image
    IMAGE_NAME="dockctrl-agent:latest"
    IMAGE_PULLED=false

    # Try 1: DockCtrl Registry (Dogfooding - validates our platform)
    log "🔍 Trying DockCtrl Registry (Primary)..."
    if docker pull registry.dockctrl.app/dockctrl/agent:latest 2>/dev/null; then
        docker tag registry.dockctrl.app/dockctrl/agent:latest ${IMAGE_NAME}
        success "✅ Pulled from DockCtrl Registry (registry.dockctrl.app)"
        IMAGE_PULLED=true
    else
        log "⚠️  DockCtrl Registry unavailable, trying fallback..."
    fi

    # Try 2: GitHub Container Registry (Global CDN fallback)
    if [ "$IMAGE_PULLED" = false ]; then
        log "🔍 Trying GitHub Container Registry (Fallback)..."
        if docker pull ghcr.io/byt3crafter/dockctrl-agent:latest 2>/dev/null; then
            docker tag ghcr.io/byt3crafter/dockctrl-agent:latest ${IMAGE_NAME}
            success "✅ Pulled from GitHub Registry (ghcr.io)"
            IMAGE_PULLED=true
        else
            log "⚠️  GitHub Registry unavailable, trying binary download..."
        fi
    fi

    # Try 3: Binary download (Last resort)
    if [ "$IMAGE_PULLED" = false ]; then
        log "🔍 Downloading agent binary..."
        BINARY="agent-linux-${BIN_ARCH}"
        # Clean up old binary if it exists
        rm -f ./dockctrl-agent
        if curl -fsSL "${DOWNLOAD_URL}/${BINARY}" -o ./dockctrl-agent; then
            chmod +x ./dockctrl-agent
            success "✅ Downloaded agent binary"

            # Create a simple systemd service or run directly
            cat > docker-compose.yml <<COMPOSE_EOF
version: '3.8'
services:
  agent:
    image: alpine:3.19
    container_name: dockctrl-agent
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./dockctrl-agent:/usr/local/bin/dockctrl-agent
    command: /usr/local/bin/dockctrl-agent
    environment:
      - AGENT_TOKEN=${TOKEN}
      - DOCKCTRL_API_KEY=${API_KEY}
      - HUB_URL=${HUB_URL}
COMPOSE_EOF
            IMAGE_PULLED=true
        else
            error "❌ All distribution channels failed. Please check your internet connection."
            exit 1
        fi
    fi

    # Configure environment
    cat > .env <<EOF
AGENT_TOKEN=${TOKEN}
DOCKCTRL_API_KEY=${API_KEY}
HUB_URL=${HUB_URL}
AGENT_TAGS=production
EOF

    # Create docker-compose.yml if using Docker image
    if ! [ -f docker-compose.yml ]; then
        cat > docker-compose.yml <<COMPOSE_EOF
version: '3.8'
services:
  agent:
    image: ${IMAGE_NAME}
    container_name: dockctrl-agent
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - AGENT_TOKEN=\${AGENT_TOKEN}
      - DOCKCTRL_API_KEY=\${DOCKCTRL_API_KEY}
      - HUB_URL=\${HUB_URL}
      - AGENT_TAGS=\${AGENT_TAGS}
COMPOSE_EOF
    fi

    # Firewall
    setup_firewall

    success "Agent configured! Run 'cd dockctrl-agent && docker compose up -d' to start."
}

setup_firewall() {
    if command -v ufw &> /dev/null; then
        log "Configuring UFW..."
        sudo ufw allow 22/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        sudo ufw allow 8080/tcp # Hub API
        # sudo ufw --force enable
        success "Firewall configured."
    fi
}

# --- Main Logic ---
detect_os

MODE="CLI"
TOKEN=""
API_KEY=""
HUB_URL="https://dockctrl.app"

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --hub) MODE="HUB" ;;
        --token=*) MODE="AGENT"; TOKEN="${1#*=}" ;;
        --api-key=*) API_KEY="${1#*=}" ;;
        --hub-url=*) HUB_URL="${1#*=}" ;;
        *) error "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

case "$MODE" in
    HUB)
        install_hub
        ;;
    AGENT)
        if [ -z "$TOKEN" ]; then
            error "Agent mode requires --token=..."
            exit 1
        fi
        if [ -z "$API_KEY" ]; then
            error "Agent mode requires --api-key=..."
            exit 1
        fi
        install_agent "$TOKEN" "$API_KEY" "$HUB_URL"
        ;;
    CLI)
        install_cli
        ;;
esac

echo ""
success "Installation Complete ($MODE Mode)"
