# MCP PDL UI Deployment Guide

## Overview

The MCP PDL UI is a Next.js application that provides a comprehensive real-time interface for managing Product Development Lifecycle (PDL) projects. This guide covers deployment options from development to production.

## Prerequisites

- Node.js 18+ 
- Docker & Docker Compose (for containerized deployment)
- Access to MCP PDL Server (backend API)

## Quick Start

### Development

```bash
npm install
npm run dev
```

Access the UI at `http://localhost:3000`

### Production (Docker)

```bash
# Build and deploy
./scripts/deploy.sh production

# Or manually with Docker Compose
docker-compose -f docker/docker-compose.yml up -d
```

## Architecture

The UI connects to two main services:

- **MCP PDL Server** (REST API): `http://localhost:8080`
- **WebSocket Server** (Real-time): `ws://localhost:8081`

## Environment Configuration

### Environment Variables

Create a `.env.local` file for local development:

```env
# Server URLs
MCP_SERVER_URL=http://localhost:8080
WEBSOCKET_URL=ws://localhost:8081

# Next.js Configuration  
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1

# Optional: Discord notifications for deployment
DISCORD_WEBHOOK_URL=your_webhook_url
```

### Production Environment

For production deployment, set these environment variables:

```env
NODE_ENV=production
MCP_SERVER_URL=https://your-api-server.com
WEBSOCKET_URL=wss://your-websocket-server.com
```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

The project includes complete Docker configuration for production deployment.

#### Single Container
```bash
# Build image
docker build -f docker/Dockerfile -t mcp-pdl-ui:latest .

# Run container
docker run -p 3000:3000 \
  -e MCP_SERVER_URL=http://your-server:8080 \
  -e WEBSOCKET_URL=ws://your-server:8081 \
  mcp-pdl-ui:latest
```

#### Full Stack with Docker Compose
```bash
# Deploy entire stack (UI + Server + Nginx)
docker-compose -f docker/docker-compose.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f mcp-pdl-ui
```

### Option 2: Standalone Deployment

#### Build for Production
```bash
npm run build
npm start
```

#### Using PM2 (Process Manager)
```bash
npm install -g pm2
npm run build

# Start with PM2
pm2 start npm --name "mcp-pdl-ui" -- start
pm2 save
pm2 startup
```

### Option 3: Cloud Deployment

#### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

#### AWS/GCP/Azure
- Build Docker image and push to container registry
- Deploy using cloud container services (ECS, Cloud Run, Container Instances)
- Configure load balancer and SSL certificates

## Testing

### Unit Tests
```bash
npm test
```

### End-to-End Tests
```bash
# Run E2E test suite
./package-scripts/test-e2e.sh

# Or manually
npm run test:e2e
```

### Integration Tests
```bash
# Start servers first
npm run dev &
cd ../.. && node test-integration.js

# Kill background process
pkill -f "npm run dev"
```

## Monitoring & Health Checks

### Health Check Endpoint
```bash
curl http://localhost:3000/api/health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "version": "1.0.0", 
  "services": {
    "ui": "healthy",
    "mcp_server": "healthy",
    "websocket": "configured"
  }
}
```

### Nginx Monitoring (if using Docker Compose)
- Access logs: `docker-compose logs nginx`
- Metrics endpoint: `http://localhost/nginx_status`

## Security Considerations

### Headers
The application includes security headers:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff  
- Referrer-Policy: origin-when-cross-origin

### Rate Limiting
Nginx configuration includes rate limiting:
- API endpoints: 10 requests/second
- UI endpoints: 20 requests/second

### SSL/TLS
For production, configure SSL certificates in `docker/nginx/nginx.conf`

## Performance Optimization

### Build Optimizations
- Console logs removed in production
- Image optimization enabled (WebP, AVIF)
- Gzip compression via Nginx
- Static asset caching (1 year)

### Runtime Optimizations
- WebSocket connection pooling
- Component lazy loading
- Optimized bundle splitting

## Troubleshooting

### Common Issues

#### UI not connecting to server
```bash
# Check server status
curl http://localhost:8080/health

# Check environment variables
docker exec mcp-pdl-ui env | grep MCP_SERVER_URL
```

#### WebSocket connection issues
```bash
# Test WebSocket connectivity  
npm install -g wscat
wscat -c ws://localhost:8081
```

#### Docker build failures
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -f docker/Dockerfile .
```

### Logs

#### Container logs
```bash
# UI logs
docker-compose logs -f mcp-pdl-ui

# All service logs  
docker-compose logs -f
```

#### PM2 logs (if using PM2)
```bash
pm2 logs mcp-pdl-ui
pm2 monit
```

## Scaling

### Horizontal Scaling
- Run multiple UI containers behind load balancer
- Use Redis for session sharing if needed
- WebSocket scaling requires sticky sessions

### Vertical Scaling
- Increase container memory limits
- Optimize Node.js heap size
- Enable HTTP/2 in Nginx

## Backup & Recovery

### Database
The UI doesn't store persistent data, but ensure MCP PDL Server database is backed up.

### Configuration
- Backup environment variables
- Version control all configuration files
- Document custom Nginx configurations

## Support

### Logs Location
- Container: `/app/logs`
- PM2: `~/.pm2/logs/`
- Nginx: `/var/log/nginx/`

### Key Metrics to Monitor
- Response time to MCP server
- WebSocket connection count
- Memory usage
- Error rates

### Alerting
Configure alerts for:
- Health check failures
- High error rates (>5%)
- Memory usage >80%
- WebSocket disconnections

For additional support, check the project repository or contact the development team.