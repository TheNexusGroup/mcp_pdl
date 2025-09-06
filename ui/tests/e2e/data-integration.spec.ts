import { test, expect } from '@playwright/test'

test.describe('Data Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Wait for initial data load
    await expect(page.locator('[data-testid="real-time-dashboard"]')).toBeVisible()
  })

  test('should load and display project data', async ({ page }) => {
    // Check if project information is loaded and displayed
    await expect(page.getByText('mcp-pdl-ui-enhancement')).toBeVisible()
    
    // Check for project description
    await expect(page.getByText(/Complete visualization system|PDL|MCP/)).toBeVisible()
    
    // Verify team composition is displayed
    await expect(page.getByText(/Product Manager|Engineering Manager|Claude Assistant/)).toBeVisible()
  })

  test('should display roadmap data correctly', async ({ page }) => {
    // Check for roadmap visualization
    const roadmapElement = page.locator('[data-testid="interactive-roadmap"]')
    await expect(roadmapElement).toBeVisible()
    
    // Check for phase information
    await expect(page.getByText(/Foundation|Architecture|Design|Development|Testing|Launch/)).toBeVisible()
    
    // Check for progress indicators
    const progressElements = page.locator('.progress-bar, [data-testid*="progress"]')
    if (await progressElements.count() > 0) {
      await expect(progressElements.first()).toBeVisible()
    }
  })

  test('should show sprint information', async ({ page }) => {
    // Look for sprint-related information
    await expect(page.getByText(/Sprint|Foundation Analysis/)).toBeVisible()
    
    // Check for sprint status
    const statusElements = page.locator('[data-testid*="status"], .status')
    if (await statusElements.count() > 0) {
      await expect(statusElements.first()).toBeVisible()
    }
    
    // Verify sprint tasks are displayed
    const taskElements = page.locator('[data-testid*="task"], .task')
    if (await taskElements.count() > 0) {
      await expect(taskElements.first()).toBeVisible()
    }
  })

  test('should display PDL phase information', async ({ page }) => {
    // Check for PDL phase indicators
    await expect(page.getByText(/Discovery|Definition|Design|Development|Testing|Launch|Post-Launch/)).toBeVisible()
    
    // Check for current phase highlighting
    const currentPhase = page.locator('[data-testid*="current-phase"], .current-phase, .active-phase')
    if (await currentPhase.count() > 0) {
      await expect(currentPhase.first()).toBeVisible()
    }
    
    // Verify phase completion percentages
    const completionElements = page.locator('[data-testid*="completion"], .completion')
    if (await completionElements.count() > 0) {
      await expect(completionElements.first()).toBeVisible()
    }
  })

  test('should show activity log data', async ({ page }) => {
    // Check for activity feed
    const activityFeed = page.locator('[data-testid="activity-feed"]')
    await expect(activityFeed).toBeVisible()
    
    // Check for activity entries
    await expect(page.getByText(/updated|completed|created|initialized/)).toBeVisible()
    
    // Verify timestamps are present
    const timestamps = page.locator('[data-testid*="timestamp"], .timestamp')
    if (await timestamps.count() > 0) {
      await expect(timestamps.first()).toBeVisible()
    }
  })

  test('should handle data loading states', async ({ page }) => {
    // Reload to test loading states
    await page.reload()
    
    // Check for loading indicators during data fetch
    const loadingElements = page.locator('.loading, .spinner, [data-testid*="loading"]')
    
    // Loading states should either be present or data should load quickly
    if (await loadingElements.count() > 0) {
      await expect(loadingElements.first()).toBeVisible()
      // Loading should eventually complete
      await expect(loadingElements.first()).toBeHidden({ timeout: 10000 })
    }
    
    // Data should be loaded after loading completes
    await expect(page.getByText('mcp-pdl-ui-enhancement')).toBeVisible()
  })

  test('should display correct statistics', async ({ page }) => {
    // Check for dashboard statistics
    const statsCards = page.locator('.stats-card, [data-testid*="stats"]')
    
    if (await statsCards.count() > 0) {
      await expect(statsCards.first()).toBeVisible()
      
      // Check for numerical stats
      await expect(page.locator(':text-matches("\\d+%")')).toHaveCount.greaterThan(0)
    }
  })

  test('should handle empty data states', async ({ page }) => {
    // Look for empty state handling
    const emptyStates = page.locator('[data-testid*="empty"], .empty-state')
    
    // If there are empty states, they should be handled gracefully
    if (await emptyStates.count() > 0) {
      await expect(emptyStates.first()).toContainText(/No data|Empty|Nothing to show/)
    }
  })

  test('should show data relationships correctly', async ({ page }) => {
    // Check that project → roadmap → sprints → phases relationship is maintained
    
    // Project should be displayed
    await expect(page.getByText('mcp-pdl-ui-enhancement')).toBeVisible()
    
    // Roadmap phases should be linked to project
    await expect(page.getByText(/Phase|Foundation|Development/)).toBeVisible()
    
    // Sprint information should be connected to phases
    const sprintElements = page.locator('[data-testid*="sprint"]')
    if (await sprintElements.count() > 0) {
      await expect(sprintElements.first()).toBeVisible()
    }
  })

  test('should display session logging data', async ({ page }) => {
    // Check if session logging information is accessible
    const logsSection = page.locator('[data-testid*="logs"], [data-testid*="session"]')
    
    if (await logsSection.count() > 0) {
      await expect(logsSection.first()).toBeVisible()
      
      // Check for log entries
      await expect(page.getByText(/session|command|operation/)).toBeVisible()
    } else {
      // If logs section isn't directly visible, check for logs indicator
      await expect(page.getByText(/Log|History|Activity/)).toBeVisible()
    }
  })

  test('should handle data updates correctly', async ({ page }) => {
    // Get initial data state
    const projectTitle = page.locator('h1, h2, [data-testid*="project-title"]').first()
    await expect(projectTitle).toBeVisible()
    
    const initialText = await projectTitle.textContent()
    expect(initialText).toBeTruthy()
    
    // Wait for potential real-time updates
    await page.waitForTimeout(3000)
    
    // Data should remain consistent
    const updatedText = await projectTitle.textContent()
    expect(updatedText).toBeTruthy()
  })

  test('should validate data consistency across components', async ({ page }) => {
    // Get project name from multiple locations
    const projectNames: string[] = []
    
    // Check header
    const headerProject = page.locator('h1:has-text("mcp-pdl-ui-enhancement"), h2:has-text("mcp-pdl-ui-enhancement")').first()
    if (await headerProject.isVisible()) {
      const name = await headerProject.textContent()
      if (name) projectNames.push(name.trim())
    }
    
    // Check project info section
    const projectInfo = page.getByText('mcp-pdl-ui-enhancement')
    if (await projectInfo.isVisible()) {
      const name = await projectInfo.textContent()
      if (name) projectNames.push(name.trim())
    }
    
    // All instances should be consistent
    if (projectNames.length > 1) {
      const uniqueNames = [...new Set(projectNames.map(name => name.toLowerCase()))]
      expect(uniqueNames).toHaveLength(1)
    }
  })

  test('should handle large datasets efficiently', async ({ page }) => {
    // Check that page loads efficiently even with comprehensive data
    const startTime = Date.now()
    
    await page.reload()
    await expect(page.locator('[data-testid="real-time-dashboard"]')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    
    // Should load within reasonable time (10 seconds for comprehensive data)
    expect(loadTime).toBeLessThan(10000)
    
    // UI should be responsive after load
    const searchInput = page.locator('input[placeholder*="Search"]')
    if (await searchInput.isVisible()) {
      await searchInput.click()
      await expect(searchInput).toBeFocused()
    }
  })
})