#!/bin/bash

# E2E Testing Script for MCP PDL UI
# This script runs comprehensive end-to-end tests

echo "🧪 Starting MCP PDL UI E2E Test Suite..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Install Playwright browsers if needed
if [ ! -d "node_modules/@playwright/test" ]; then
    echo "🎭 Installing Playwright..."
    npx playwright install
fi

# Start the development server in the background
echo "🚀 Starting development server..."
npm run dev &
DEV_SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
until curl -s http://localhost:3000 > /dev/null; do
    sleep 2
done

echo "✅ Development server is ready"

# Run the E2E tests
echo "🎯 Running E2E tests..."

# Run tests with different configurations
echo "📱 Testing on Desktop Chrome..."
npx playwright test --project=chromium

echo "🦊 Testing on Desktop Firefox..."
npx playwright test --project=firefox

echo "📱 Testing on Mobile Chrome..."
npx playwright test --project="Mobile Chrome"

# Generate test report
echo "📊 Generating test report..."
npx playwright show-report

# Clean up
echo "🧹 Cleaning up..."
kill $DEV_SERVER_PID 2>/dev/null || true

echo "✨ E2E testing completed!"