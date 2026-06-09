#!/bin/bash
set -e

DEPLOYMENT_ARCHIVE=$1
APP_NAME=${2:-"adshot-api"}
VERSION=${3:-"unknown"}
DEPLOY_DIR="/opt/${APP_NAME}"
BACKUP_DIR="/opt/${APP_NAME}-backup"
VERSIONS_DIR="/opt/${APP_NAME}-versions"

if [ -z "$DEPLOYMENT_ARCHIVE" ]; then
    echo "Usage: $0 <deployment-archive.tar.gz> [app-name] [version]"
    exit 1
fi

echo "Starting deployment of ${APP_NAME} version ${VERSION}..."

# Create versions directory for tracking
mkdir -p "$VERSIONS_DIR"

# Create backup of current deployment
if [ -d "$DEPLOY_DIR" ]; then
    echo "> Creating backup..."
    rm -rf "$BACKUP_DIR"
    mv "$DEPLOY_DIR" "$BACKUP_DIR"
    
    # Save current version info
    if [ -f "$BACKUP_DIR/VERSION" ]; then
        PREVIOUS_VERSION=$(cat "$BACKUP_DIR/VERSION")
        echo "> Previous version: ${PREVIOUS_VERSION}"
    fi
fi

# Create deployment directory
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# Extract new deployment
echo "> Extracting deployment..."
tar -xzf "/tmp/deployments/$DEPLOYMENT_ARCHIVE"

# Install production dependencies on server
echo "> Installing production dependencies on server..."
npm ci --production --silent

# Set permissions
chmod +x build.health.sh
chmod +x app.sh

# Production environment is already included in deployment package as env.json
echo "> Production environment configuration ready"
if [ -f "env.json" ]; then
    echo "SUCCESS: Using packaged production environment config"
else
    echo "ERROR: No environment config found in deployment package!"
    exit 1
fi

# Display version information
if [ -f "VERSION" ]; then
    DEPLOYED_VERSION=$(cat VERSION)
    echo "> Deploying version: ${DEPLOYED_VERSION}"
    
    # Track deployment in versions directory
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ): ${DEPLOYED_VERSION}" >> "$VERSIONS_DIR/deployment-history.log"
fi

# Restart application service
echo "> Restarting application..."
sudo systemctl restart ${APP_NAME}

# Health check
echo "> Running health check..."
sleep 5
if ./build.health.sh; then
    echo "SUCCESS: Deployment successful!"
    echo "SUCCESS: ${APP_NAME} version ${VERSION} is now running!"
    
    # Clean up old backup on successful deployment
    rm -rf "$BACKUP_DIR"
    
    # Log successful deployment
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ): SUCCESS - ${VERSION}" >> "$VERSIONS_DIR/deployment-success.log"
else
    echo "ERROR: Health check failed, rolling back..."
    sudo systemctl stop ${APP_NAME}
    rm -rf "$DEPLOY_DIR"
    
    if [ -d "$BACKUP_DIR" ]; then
        mv "$BACKUP_DIR" "$DEPLOY_DIR"
        sudo systemctl start ${APP_NAME}
        echo "> Rolled back to previous version"
        
        # Log failed deployment
        echo "$(date -u +%Y-%m-%dT%H:%M:%SZ): FAILED - ${VERSION} (rolled back)" >> "$VERSIONS_DIR/deployment-failed.log"
    else
        echo "ERROR: No backup available for rollback!"
    fi
    
    exit 1
fi

echo "API deployment complete!"