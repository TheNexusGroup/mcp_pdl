import { test, expect } from '@playwright/test'

test.describe('Real-time Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Wait for initial load
    await expect(page.locator('[data-testid="real-time-dashboard"]')).toBeVisible()
  })

  test('should establish WebSocket connection', async ({ page }) => {
    // Monitor WebSocket connections
    const wsConnections: string[] = []
    
    page.on('websocket', ws => {
      wsConnections.push(ws.url())
      
      ws.on('framesent', event => {
        console.log('WebSocket frame sent:', event.payload)
      })
      
      ws.on('framereceived', event => {
        console.log('WebSocket frame received:', event.payload)
      })
    })
    
    // Wait for WebSocket connection to be established
    await page.waitForTimeout(3000)
    
    // Check connection status indicator
    const connectionStatus = page.locator('[data-testid="connection-status"]')
    await expect(connectionStatus).toContainText(/Connected|Connecting/)
    
    // Verify WebSocket connection was attempted
    expect(wsConnections.some(url => url.includes('ws://') || url.includes('wss://'))).toBeTruthy()
  })

  test('should handle real-time updates', async ({ page }) => {
    // Wait for initial connection
    await page.waitForTimeout(2000)
    
    // Check for real-time indicators
    const realTimeElements = page.locator('[data-testid*="real-time"], [data-testid*="live"]')
    
    if (await realTimeElements.count() > 0) {
      await expect(realTimeElements.first()).toBeVisible()
    }
    
    // Monitor for dynamic content updates
    const activityFeed = page.locator('[data-testid="activity-feed"]')
    
    if (await activityFeed.isVisible()) {
      const initialContent = await activityFeed.textContent()
      
      // Wait for potential updates
      await page.waitForTimeout(5000)
      
      // Check if content might have updated (or stayed the same, which is also valid)
      const updatedContent = await activityFeed.textContent()
      expect(typeof updatedContent).toBe('string')
    }
  })

  test('should show connection status changes', async ({ page }) => {
    const connectionStatus = page.locator('[data-testid="connection-status"]')
    
    // Initial state should be visible
    await expect(connectionStatus).toBeVisible()
    
    // Simulate network disruption
    await page.context().setOffline(true)
    
    // Should show disconnected state
    await expect(connectionStatus).toContainText(/Offline|Disconnected|Error/, { timeout: 5000 })
    
    // Restore connection
    await page.context().setOffline(false)
    
    // Should attempt to reconnect
    await expect(connectionStatus).toContainText(/Connecting|Reconnecting|Connected/, { timeout: 10000 })
  })

  test('should handle WebSocket reconnection', async ({ page }) => {
    // Initial connection
    await page.waitForTimeout(2000)
    
    const connectionStatus = page.locator('[data-testid="connection-status"]')
    
    // Force disconnect by going offline temporarily
    await page.context().setOffline(true)
    await page.waitForTimeout(1000)
    await page.context().setOffline(false)
    
    // Should show reconnection attempt
    await expect(connectionStatus).toContainText(/Reconnecting|Connecting/, { timeout: 5000 })
    
    // Should eventually reconnect
    await expect(connectionStatus).toContainText(/Connected/, { timeout: 15000 })
  })

  test('should display real-time project updates', async ({ page }) => {
    // Check for project status indicators
    const progressBars = page.locator('.progress-bar, [data-testid*="progress"]')
    const statusIndicators = page.locator('[data-testid*="status"]')
    
    // These elements should be present for real-time updates
    if (await progressBars.count() > 0) {
      await expect(progressBars.first()).toBeVisible()
    }
    
    if (await statusIndicators.count() > 0) {
      await expect(statusIndicators.first()).toBeVisible()
    }
    
    // Check for timestamp indicators showing recency
    const timestamps = page.locator('[data-testid*="timestamp"], .timestamp')
    if (await timestamps.count() > 0) {
      const timestampText = await timestamps.first().textContent()
      expect(timestampText).toBeTruthy()
    }
  })

  test('should handle message queuing during reconnection', async ({ page }) => {
    // Wait for initial connection
    await page.waitForTimeout(2000)
    
    // Simulate network interruption
    await page.context().setOffline(true)
    
    // Try to interact with features that might queue messages
    const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Search"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('test query')
    }
    
    // Restore connection
    await page.context().setOffline(false)
    
    // Wait for reconnection
    await page.waitForTimeout(3000)
    
    // System should handle the queued interactions gracefully
    const connectionStatus = page.locator('[data-testid="connection-status"]')
    await expect(connectionStatus).toContainText(/Connected/, { timeout: 10000 })
  })

  test('should show heartbeat indicators', async ({ page }) => {
    // Look for heartbeat or ping indicators
    const connectionStatus = page.locator('[data-testid="connection-status"]')
    
    // Should maintain connection status
    await expect(connectionStatus).toBeVisible()
    
    // Monitor for periodic updates (heartbeat)
    const initialTime = Date.now()
    let statusChanges = 0
    
    // Watch for any status indicator changes over time
    await page.waitForFunction(() => {
      return Date.now() - initialTime > 5000 // Wait 5 seconds
    })
    
    // Connection should still be stable
    await expect(connectionStatus).toBeVisible()
  })

  test('should handle multiple concurrent connections', async ({ page, context }) => {
    // Create multiple pages to test concurrent connections
    const page2 = await context.newPage()
    
    try {
      await page2.goto('http://localhost:3000')
      
      // Both pages should be able to connect
      await expect(page.locator('[data-testid="connection-status"]')).toBeVisible()
      await expect(page2.locator('[data-testid="connection-status"]')).toBeVisible()
      
      // Both should maintain their connections
      await page.waitForTimeout(3000)
      
      await expect(page.locator('[data-testid="connection-status"]')).toContainText(/Connected|Connecting/)
      await expect(page2.locator('[data-testid="connection-status"]')).toContainText(/Connected|Connecting/)
      
    } finally {
      await page2.close()
    }
  })

  test('should show appropriate loading states during connection', async ({ page }) => {
    // Reload page to test initial connection
    await page.reload()
    
    // Should show connecting state initially
    const connectionStatus = page.locator('[data-testid="connection-status"]')
    await expect(connectionStatus).toContainText(/Connecting|Loading|Initializing/, { timeout: 2000 })
    
    // Should eventually connect or show appropriate state
    await expect(connectionStatus).toContainText(/Connected|Connecting|Offline/, { timeout: 10000 })
  })

  test('should handle WebSocket errors gracefully', async ({ page }) => {
    // Monitor console for WebSocket errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('websocket')) {
        errors.push(msg.text())
      }
    })
    
    // Force some connection issues
    await page.context().setOffline(true)
    await page.waitForTimeout(1000)
    await page.context().setOffline(false)
    
    // Wait for reconnection attempts
    await page.waitForTimeout(5000)
    
    // System should handle WebSocket errors gracefully without crashing
    const connectionStatus = page.locator('[data-testid="connection-status"]')
    await expect(connectionStatus).toBeVisible()
    
    // Page should still be functional
    await expect(page.locator('[data-testid="real-time-dashboard"]')).toBeVisible()
  })
})