import { test, expect } from '@playwright/test'

test.describe('Dashboard UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start the UI development server
    await page.goto('http://localhost:3000')
  })

  test('should display main dashboard components', async ({ page }) => {
    // Check if the main dashboard elements are present
    await expect(page.locator('[data-testid="real-time-dashboard"]')).toBeVisible()
    await expect(page.locator('[data-testid="connection-status"]')).toBeVisible()
    
    // Check if the project selection area is visible
    await expect(page.getByText('mcp-pdl-ui-enhancement')).toBeVisible()
    
    // Verify dashboard stats are displayed
    await expect(page.locator('.stats-card')).toHaveCount.greaterThan(0)
  })

  test('should show real-time connection status', async ({ page }) => {
    // Check initial connection status
    const connectionStatus = page.locator('[data-testid="connection-status"]')
    await expect(connectionStatus).toBeVisible()
    
    // Connection should eventually show as connected or attempting to connect
    await expect(connectionStatus).toContainText(/Connected|Connecting|Reconnecting/)
  })

  test('should display project information', async ({ page }) => {
    // Check if project information is displayed
    await expect(page.getByText('mcp-pdl-ui-enhancement')).toBeVisible()
    await expect(page.getByText(/Complete visualization system/)).toBeVisible()
    
    // Check if team composition is shown
    await expect(page.getByText(/Product Manager|Engineering Manager/)).toBeVisible()
  })

  test('should show interactive roadmap', async ({ page }) => {
    // Check if roadmap visualization is present
    await expect(page.locator('[data-testid="interactive-roadmap"]')).toBeVisible()
    
    // Check for phase indicators
    await expect(page.getByText(/Phase/)).toBeVisible()
    await expect(page.getByText(/Foundation|Development|Testing|Launch/)).toBeVisible()
    
    // Verify progress indicators are present
    await expect(page.locator('.progress-bar, .progress-indicator')).toHaveCount.greaterThan(0)
  })

  test('should display activity feed', async ({ page }) => {
    // Check if activity feed is present
    await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible()
    
    // Should show recent activities
    await expect(page.getByText(/updated|completed|created/)).toBeVisible()
    
    // Check for timestamps
    await expect(page.locator('.timestamp, [data-testid="activity-timestamp"]')).toHaveCount.greaterThan(0)
  })

  test('should have working export functionality', async ({ page }) => {
    // Check if export panel is accessible
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")')
    await expect(exportButton).toBeVisible()
    
    await exportButton.click()
    
    // Check if export options are shown
    await expect(page.getByText(/JSON|YAML|CSV|PDF/)).toBeVisible()
    await expect(page.getByText(/Include Roadmap|Include Sprints/)).toBeVisible()
  })

  test('should display search functionality', async ({ page }) => {
    // Check if search bar is present
    const searchInput = page.locator('[data-testid="search-input"], input[placeholder*="Search"]')
    await expect(searchInput).toBeVisible()
    
    // Test search interaction
    await searchInput.fill('test')
    await expect(searchInput).toHaveValue('test')
  })

  test('should show notification system', async ({ page }) => {
    // Check if notification system is initialized
    await expect(page.locator('[data-testid="notification-system"]')).toBeVisible()
    
    // Notifications container should be present even if empty
    const notificationContainer = page.locator('[data-testid="notifications-container"]')
    await expect(notificationContainer).toBeVisible()
  })

  test('should handle responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 })
    await expect(page.locator('[data-testid="real-time-dashboard"]')).toBeVisible()
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('[data-testid="real-time-dashboard"]')).toBeVisible()
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('[data-testid="real-time-dashboard"]')).toBeVisible()
  })

  test('should show loading states appropriately', async ({ page }) => {
    // Check for initial loading indicators
    const loadingSpinner = page.locator('.loading, .spinner, [data-testid="loading"]')
    
    // Loading states should either be present initially or not at all
    // depending on the data loading strategy
    await expect(page.locator('body')).toBeVisible()
    
    // If there are loading states, they should eventually resolve
    if (await loadingSpinner.isVisible()) {
      await expect(loadingSpinner).toBeHidden({ timeout: 10000 })
    }
  })

  test('should navigate between different views', async ({ page }) => {
    // Check for navigation elements
    const navTabs = page.locator('[role="tab"], .tab, [data-testid*="tab"]')
    
    if (await navTabs.count() > 0) {
      // Click first available tab
      await navTabs.first().click()
      
      // Verify content changes
      await expect(page.locator('.tab-content, [role="tabpanel"]')).toBeVisible()
    }
  })
})

test.describe('Error Handling', () => {
  test('should handle connection errors gracefully', async ({ page }) => {
    // Start with network offline to test error handling
    await page.context().setOffline(true)
    await page.goto('http://localhost:3000')
    
    // Should show offline status
    await expect(page.locator('[data-testid="connection-status"]')).toContainText(/Offline|Disconnected|Error/)
    
    // Restore connection
    await page.context().setOffline(false)
    
    // Should attempt to reconnect
    await expect(page.locator('[data-testid="connection-status"]')).toContainText(/Connecting|Reconnecting/, { timeout: 5000 })
  })

  test('should show appropriate error messages', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Wait for page to load
    await expect(page.locator('[data-testid="real-time-dashboard"]')).toBeVisible()
    
    // Check that error states are handled (no uncaught errors in console)
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // Interact with the page
    await page.waitForTimeout(2000)
    
    // Filter out known acceptable errors (like network timeouts during dev)
    const criticalErrors = errors.filter(error => 
      !error.includes('WebSocket') && 
      !error.includes('Failed to fetch') &&
      !error.includes('net::ERR_CONNECTION_REFUSED')
    )
    
    expect(criticalErrors).toHaveLength(0)
  })
})