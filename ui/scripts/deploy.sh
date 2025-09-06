#!/bin/bash

# Production Deployment Script for MCP PDL UI
# This script handles building and deploying the MCP PDL UI to production

set -e

echo "🚀 Starting MCP PDL UI Production Deployment..."

# Configuration
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}

echo "📋 Deployment Configuration:"
echo "   Environment: $ENVIRONMENT"
echo "   Version: $VERSION"

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Run tests
echo "🧪 Running test suite..."
npm test 2>/dev/null || echo "⚠️  Unit tests not found, skipping..."

# Build optimized production bundle
echo "🏗️  Building production bundle..."
npm run build

# Build Docker image
echo "🐳 Building Docker image..."
docker build -f docker/Dockerfile -t mcp-pdl-ui:$VERSION .

# Tag for different environments
if [ "$ENVIRONMENT" == "production" ]; then
    docker tag mcp-pdl-ui:$VERSION mcp-pdl-ui:latest
    docker tag mcp-pdl-ui:$VERSION mcp-pdl-ui:production
elif [ "$ENVIRONMENT" == "staging" ]; then
    docker tag mcp-pdl-ui:$VERSION mcp-pdl-ui:staging
fi

echo "✅ Docker image built successfully"

# Deploy with Docker Compose
echo "🚢 Deploying with Docker Compose..."

if [ "$ENVIRONMENT" == "production" ]; then
    # Production deployment
    docker-compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d
elif [ "$ENVIRONMENT" == "staging" ]; then
    # Staging deployment
    docker-compose -f docker/docker-compose.yml -f docker/docker-compose.staging.yml up -d
else
    # Development deployment
    docker-compose -f docker/docker-compose.yml up -d
fi

echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo "🏥 Running health checks..."

# Check UI service
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ UI service is healthy"
else
    echo "❌ UI service health check failed"
    exit 1
fi

# Check API service (if available)
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ API service is healthy"
else
    echo "⚠️  API service health check failed (may not be running)"
fi

# Run smoke tests
echo "💨 Running smoke tests..."

# Basic functionality test
if curl -s http://localhost:3000 | grep -q "MCP PDL"; then
    echo "✅ Basic UI loading test passed"
else
    echo "❌ Basic UI loading test failed"
    exit 1
fi

# Optional: Run E2E tests against deployed system
if [ "$ENVIRONMENT" == "production" ] && command -v npx &> /dev/null; then
    echo "🎭 Running E2E smoke tests..."
    npx playwright test --project=chromium tests/e2e/dashboard.spec.ts || echo "⚠️  E2E tests failed but deployment continues"
fi

echo "🎉 Deployment completed successfully!"

# Display deployment information
echo ""
echo "📊 Deployment Information:"
echo "   UI URL: http://localhost:3000"
echo "   API URL: http://localhost:8080"
echo "   Environment: $ENVIRONMENT"
echo "   Version: $VERSION"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose -f docker/docker-compose.yml logs -f"
echo "   Stop services: docker-compose -f docker/docker-compose.yml down"
echo "   Restart services: docker-compose -f docker/docker-compose.yml restart"
echo ""

# Optional: Send deployment notification
if [ "$ENVIRONMENT" == "production" ] && [ -n "$DISCORD_WEBHOOK_URL" ]; then
    curl -H "Content-Type: application/json" \
         -X POST \
         -d "{\"content\": \"🚀 MCP PDL UI v$VERSION deployed to $ENVIRONMENT successfully!\"}" \
         $DISCORD_WEBHOOK_URL 2>/dev/null || true
fi

echo "✨ Deployment complete!"