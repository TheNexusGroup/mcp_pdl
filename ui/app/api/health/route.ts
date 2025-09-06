import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      services: {
        ui: 'healthy',
        mcp_server: await checkMCPServerHealth(),
        websocket: await checkWebSocketHealth(),
      }
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

async function checkMCPServerHealth(): Promise<string> {
  try {
    const serverUrl = process.env.MCP_SERVER_URL || 'http://localhost:8080'
    const response = await fetch(`${serverUrl}/health`, { 
      method: 'GET',
      timeout: 3000 
    })
    
    return response.ok ? 'healthy' : 'unhealthy'
  } catch {
    return 'unavailable'
  }
}

async function checkWebSocketHealth(): Promise<string> {
  try {
    // For WebSocket health, we just check if the URL is configured
    const wsUrl = process.env.WEBSOCKET_URL || 'ws://localhost:8081'
    return wsUrl ? 'configured' : 'not_configured'
  } catch {
    return 'unavailable'
  }
}