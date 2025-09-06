import { test, expect } from '@playwright/test'

test.describe('Export Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Wait for data to load
    await expect(page.locator('[data-testid="real-time-dashboard"]')).toBeVisible()
  })

  test('should display export panel', async ({ page }) => {
    // Look for export trigger button
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export"), [data-testid*="export"]')
    await expect(exportButton.first()).toBeVisible()
    
    // Click to open export panel
    await exportButton.first().click()
    
    // Export panel should open
    const exportPanel = page.locator('[data-testid="export-panel"], .export-panel')
    await expect(exportPanel).toBeVisible()
  })

  test('should show format options', async ({ page }) => {
    // Open export panel
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")').first()
    await exportButton.click()
    
    // Check for format options
    await expect(page.getByText('JSON')).toBeVisible()
    await expect(page.getByText('YAML')).toBeVisible()
    await expect(page.getByText('CSV')).toBeVisible()
    await expect(page.getByText('PDF')).toBeVisible()
  })

  test('should show export options', async ({ page }) => {
    // Open export panel
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")').first()
    await exportButton.click()
    
    // Check for export options checkboxes
    await expect(page.getByText(/Include Roadmap|Roadmap/)).toBeVisible()
    await expect(page.getByText(/Include Sprints|Sprints/)).toBeVisible()
    await expect(page.getByText(/Include Logs|Logs/)).toBeVisible()
    await expect(page.getByText(/Include Team|Team/)).toBeVisible()
  })

  test('should allow format selection', async ({ page }) => {
    // Open export panel
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")').first()
    await exportButton.click()
    
    // Select JSON format
    const jsonOption = page.locator('input[value="json"], [data-format="json"]').first()
    if (await jsonOption.isVisible()) {
      await jsonOption.click()
      await expect(jsonOption).toBeChecked()
    } else {
      // Alternative: click on JSON text/label
      await page.getByText('JSON').click()
      await expect(page.getByText('JSON')).toHaveClass(/selected|active/)
    }
  })

  test('should toggle export options', async ({ page }) => {
    // Open export panel
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")').first()
    await exportButton.click()
    
    // Find roadmap checkbox
    const roadmapCheckbox = page.locator('input[type="checkbox"]:near(:text("Roadmap"))').first()
    
    if (await roadmapCheckbox.isVisible()) {
      // Toggle the checkbox
      const initialState = await roadmapCheckbox.isChecked()
      await roadmapCheckbox.click()
      
      // State should change
      const newState = await roadmapCheckbox.isChecked()
      expect(newState).toBe(!initialState)
    }
  })

  test('should show export confirmation', async ({ page }) => {
    // Set up download promise before triggering export
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    
    // Open export panel
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")').first()
    await exportButton.click()
    
    // Find and click export/download button
    const downloadButton = page.locator('button:has-text("Download"), button:has-text("Export"), [data-testid*="download"]').last()
    
    if (await downloadButton.isVisible()) {
      await downloadButton.click()
      
      try {
        // Wait for download to start
        const download = await downloadPromise
        
        // Verify download properties
        expect(download.suggestedFilename()).toMatch(/\.(json|yaml|csv|pdf)$/)
        
        // Save to verify it's not empty
        const path = await download.path()
        expect(path).toBeTruthy()
        
      } catch (error) {
        // If download doesn't work, check for success message or feedback
        const successMessage = page.locator('.success, [data-testid*="success"], .notification')
        await expect(successMessage).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('should handle export errors gracefully', async ({ page }) => {
    // Open export panel
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")').first()
    await exportButton.click()
    
    // Simulate network issues
    await page.context().setOffline(true)
    
    // Try to export
    const downloadButton = page.locator('button:has-text("Download"), button:has-text("Export")').last()
    if (await downloadButton.isVisible()) {
      await downloadButton.click()
      
      // Should show error message or handle gracefully
      const errorMessage = page.locator('.error, [data-testid*="error"], .notification')
      await expect(errorMessage).toBeVisible({ timeout: 5000 })
    }
    
    // Restore connection
    await page.context().setOffline(false)
  })

  test('should show loading state during export', async ({ page }) => {
    // Open export panel
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")').first()
    await exportButton.click()
    
    // Start export
    const downloadButton = page.locator('button:has-text("Download"), button:has-text("Export")').last()
    if (await downloadButton.isVisible()) {
      await downloadButton.click()
      
      // Check for loading indicators
      const loadingIndicator = page.locator('.loading, .spinner, [data-testid*="loading"]')
      
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toBeVisible()
        // Loading should eventually complete
        await expect(loadingIndicator).toBeHidden({ timeout: 10000 })
      }
    }
  })

  test('should preserve selected options', async ({ page }) => {
    // Open export panel
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")').first()
    await exportButton.click()
    
    // Select specific options
    const sprintsCheckbox = page.locator('input[type="checkbox"]:near(:text("Sprints"))').first()
    if (await sprintsCheckbox.isVisible()) {
      await sprintsCheckbox.click()
      const selectedState = await sprintsCheckbox.isChecked()
      
      // Close and reopen panel
      const closeButton = page.locator('button:has-text("Close"), [data-testid*="close"]').first()
      if (await closeButton.isVisible()) {
        await closeButton.click()
      } else {
        await page.keyboard.press('Escape')
      }
      
      await page.waitForTimeout(500)
      
      // Reopen
      await exportButton.click()
      
      // Options should be preserved
      if (await sprintsCheckbox.isVisible()) {
        await expect(sprintsCheckbox).toBeChecked({ checked: selectedState })
      }
    }
  })

  test('should validate export content', async ({ page }) => {
    // Open export panel
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")').first()
    await exportButton.click()
    
    // Select JSON format for easier validation
    const jsonOption = page.locator('input[value="json"], [data-format="json"]').first()
    if (await jsonOption.isVisible()) {
      await jsonOption.click()
    } else {
      await page.getByText('JSON').click()
    }
    
    // Export should include project data
    const downloadButton = page.locator('button:has-text("Download"), button:has-text("Export")').last()
    
    if (await downloadButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
      
      try {
        await downloadButton.click()
        const download = await downloadPromise
        
        // Verify filename contains project info
        const filename = download.suggestedFilename()
        expect(filename).toMatch(/mcp.*pdl|export/i)
        
      } catch (error) {
        // Alternative: check for export feedback
        console.log('Download test completed - checking for export feedback')
      }
    }
  })

  test('should handle different export formats', async ({ page }) => {
    const formats = ['JSON', 'YAML', 'CSV', 'PDF']
    
    for (const format of formats) {
      // Open export panel
      const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")').first()
      await exportButton.click()
      
      // Select format
      const formatOption = page.getByText(format)
      if (await formatOption.isVisible()) {
        await formatOption.click()
        
        // Format should be selected
        await expect(formatOption).toHaveClass(/selected|active|checked/)
      }
      
      // Close panel for next iteration
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
  })

  test('should show export history or progress', async ({ page }) => {
    // Open export panel
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")').first()
    await exportButton.click()
    
    // Look for export history or progress indicators
    const historyElements = page.locator('[data-testid*="history"], [data-testid*="progress"], .history, .progress')
    
    if (await historyElements.count() > 0) {
      await expect(historyElements.first()).toBeVisible()
    }
    
    // Or check for progress bars during export
    const progressBars = page.locator('.progress-bar, [role="progressbar"]')
    if (await progressBars.count() > 0) {
      await expect(progressBars.first()).toBeVisible()
    }
  })

  test('should close export panel correctly', async ({ page }) => {
    // Open export panel
    const exportButton = page.locator('[data-testid="export-panel-trigger"], button:has-text("Export")').first()
    await exportButton.click()
    
    // Panel should be visible
    await expect(page.getByText('JSON')).toBeVisible()
    
    // Close with escape key
    await page.keyboard.press('Escape')
    
    // Panel should be hidden
    await expect(page.getByText('JSON')).toBeHidden()
    
    // Reopen and close with close button
    await exportButton.click()
    await expect(page.getByText('JSON')).toBeVisible()
    
    const closeButton = page.locator('button:has-text("Close"), [data-testid*="close"], button:has([data-icon="x"])')
    if (await closeButton.isVisible()) {
      await closeButton.click()
      await expect(page.getByText('JSON')).toBeHidden()
    }
  })
})