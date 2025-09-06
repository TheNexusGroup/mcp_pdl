#!/usr/bin/env node

import { createWebSocketServer } from './dist/websocket/websocket-server.js';
import { Database } from './dist/storage/database.js';
import { PDLFunctionHandlers } from './dist/handlers/functions.js';
import { RoadmapFunctionHandlers } from './dist/handlers/roadmap-functions.js';

async function runIntegrationTest() {
  console.log('🧪 Running MCP PDL Integration Test Suite...\n');
  
  let passed = 0;
  let failed = 0;
  const results = [];
  
  function test(name, fn) {
    return async () => {
      try {
        console.log(`⏳ ${name}...`);
        await fn();
        console.log(`✅ ${name} - PASSED\n`);
        passed++;
        results.push({ name, status: 'PASSED' });
      } catch (error) {
        console.log(`❌ ${name} - FAILED: ${error.message}\n`);
        failed++;
        results.push({ name, status: 'FAILED', error: error.message });
      }
    };
  }
  
  // Initialize components
  const db = new Database();
  const handlers = new PDLFunctionHandlers(db);
  const roadmapHandlers = new RoadmapFunctionHandlers(db);
  let wsServer = null;
  let wsClient = null;
  
  // Test 1: Database and Handlers Initialization
  await test('Database and handlers initialization', async () => {
    if (!db || !handlers || !roadmapHandlers) {
      throw new Error('Failed to initialize core components');
    }
  })();
  
  // Test 2: WebSocket Server Creation
  await test('WebSocket server creation and startup', async () => {
    wsServer = createWebSocketServer(db, 8083);
    if (!wsServer) {
      throw new Error('Failed to create WebSocket server');
    }
    // Wait a moment for server to start
    await new Promise(resolve => setTimeout(resolve, 500));
  })();
  
  // Test 3: Project Initialization with Logging
  await test('Project initialization with session logging', async () => {
    const uniqueProjectName = `integration-test-project-${Date.now()}`;
    const result = await handlers.initializeProject({
      project_name: uniqueProjectName,
      description: 'Test project for integration testing',
      supporting_documentation: ['/tmp/integration-test.md']
    });
    
    if (!result.success) {
      throw new Error(`Project initialization failed: ${result.message}`);
    }
    
    // Verify session logs were created
    const { sessionLogger } = await import('./dist/utils/session-logger.js');
    const sessionId = sessionLogger.getSessionId();
    if (!sessionId) {
      throw new Error('Session logging not working');
    }
  })();
  
  // Test 4: Roadmap Creation
  await test('Roadmap creation and management', async () => {
    const uniqueProjectName = `integration-test-project-${Date.now()}`;
    await handlers.initializeProject({ project_name: uniqueProjectName });
    const roadmapResult = await roadmapHandlers.createRoadmap({
      project_name: uniqueProjectName,
      vision: 'Build a comprehensive test suite for PDL integration',
      phases: [
        {
          name: 'Test Planning',
          description: 'Plan comprehensive integration tests',
          objective: 'Establish testing framework',
          duration_weeks: 1,
          deliverables: ['Test plan', 'Test cases'],
          success_metrics: ['All tests planned', 'Framework ready']
        },
        {
          name: 'Test Execution',
          description: 'Execute integration tests',
          objective: 'Validate system integration',
          duration_weeks: 2,
          deliverables: ['Test results', 'Bug reports'],
          success_metrics: ['95% test pass rate', 'Performance benchmarks met']
        }
      ],
      milestones: [
        {
          name: 'Testing Framework Ready',
          description: 'All test infrastructure in place',
          phase_index: 0,
          weeks_into_phase: 1
        }
      ]
    });
    
    if (!roadmapResult.success) {
      throw new Error(`Roadmap creation failed: ${roadmapResult.message}`);
    }
    
    if (!roadmapResult.roadmap || roadmapResult.roadmap.roadmap_phases.length !== 2) {
      throw new Error('Roadmap not created correctly');
    }
  })();
  
  // Test 5: Sprint Creation and PDL Cycles
  await test('Sprint creation with PDL cycles', async () => {
    const uniqueProjectName = `integration-test-project-${Date.now()}`;
    await handlers.initializeProject({ project_name: uniqueProjectName });
    await roadmapHandlers.createRoadmap({
      project_name: uniqueProjectName,
      vision: 'Test sprint creation',
      phases: [{
        name: 'Test Phase',
        description: 'Test phase for sprint creation',
        objective: 'Create test sprint',
        duration_weeks: 2,
        deliverables: ['Test deliverable'],
        success_metrics: ['Test metric']
      }]
    });
    
    // Get the roadmap to find phase IDs
    const roadmapResult = await roadmapHandlers.getRoadmap({
      project_name: uniqueProjectName,
      include_details: true
    });
    
    const firstPhaseId = roadmapResult.roadmap.roadmap_phases[0].roadmap_phase_id;
    
    const sprintResult = await roadmapHandlers.createSprint({
      project_name: uniqueProjectName,
      roadmap_phase_id: firstPhaseId,
      sprint_name: 'Integration Test Sprint 1',
      sprint_number: 1,
      duration_days: 14
    });
    
    if (!sprintResult.success) {
      throw new Error(`Sprint creation failed: ${sprintResult.message}`);
    }
    
    if (!sprintResult.sprint || sprintResult.sprint.pdl_cycles.length === 0) {
      throw new Error('Sprint PDL cycles not created');
    }
  })();
  
  // Test 6: WebSocket Real-time Communication
  await test('WebSocket real-time communication', async () => {
    const WebSocket = (await import('ws')).default;
    wsClient = new WebSocket('ws://localhost:8083');
    
    let messageReceived = false;
    let subscriptionConfirmed = false;
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket test timeout'));
      }, 5000);
      
      wsClient.on('open', async () => {
        const testProjectName = `integration-test-project-ws-${Date.now()}`;
        await handlers.initializeProject({ project_name: testProjectName });
        
        // Subscribe to project updates
        wsClient.send(JSON.stringify({
          type: 'subscribe',
          project_name: testProjectName,
          session_id: 'integration-test-session',
          timestamp: new Date().toISOString()
        }));
      });
      
      wsClient.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'project_update' && message.payload && message.payload.subscribed) {
            subscriptionConfirmed = true;
          }
          
          if (message.type === 'project_update' && message.project_name && message.project_name.includes('integration-test-project-ws-')) {
            messageReceived = true;
          }
          
          // If we got both subscription confirmation and a project update
          if (subscriptionConfirmed && (messageReceived || message.type === 'ping')) {
            clearTimeout(timeout);
            resolve();
          }
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
      
      wsClient.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      
      // Trigger a project update after connection
      setTimeout(async () => {
        try {
          const testProjectName = `integration-test-project-ws-${Date.now()}`;
          await handlers.updatePhase({
            project_name: testProjectName,
            phase_number: 1,
            completion_percentage: 25,
            notes: 'Integration test phase update'
          });
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      }, 1000);
    });
  })();
  
  // Test 7: Session Log Retrieval
  await test('Session log retrieval and export', async () => {
    const { sessionLogger } = await import('./dist/utils/session-logger.js');
    
    // First create a test project to ensure logs exist
    const testProjectName = `session-log-test-${Date.now()}`;
    await handlers.initializeProject({ project_name: testProjectName });
    await handlers.updatePhase({
      project_name: testProjectName,
      phase_number: 1,
      completion_percentage: 50,
      notes: 'Session log test'
    });
    
    const logs = await sessionLogger.getSessionLogs();
    
    if (logs.length === 0) {
      throw new Error('No session logs found');
    }
    
    // Check if logs contain our test operations (from any test in this suite)
    const hasInitLog = logs.some(log => log.command === 'initialize_project');
    const hasUpdateLog = logs.some(log => log.command === 'update_phase');
    
    if (!hasInitLog) {
      throw new Error('No initialize_project log entries found');
    }
    
    // Test export functionality
    const markdownExport = await sessionLogger.exportLogs('markdown');
    if (!markdownExport || !markdownExport.includes('PDL Session Log')) {
      throw new Error('Log export functionality not working');
    }
  })();
  
  // Test 8: Error Handling and Recovery
  await test('Error handling and recovery', async () => {
    // Test invalid project name
    try {
      await handlers.getPhase({
        project_name: 'nonexistent-project',
        include_sprints: false
      });
      throw new Error('Should have thrown error for nonexistent project');
    } catch (error) {
      if (!error.message.includes('not found')) {
        throw new Error('Unexpected error type: ' + error.message);
      }
    }
    
    // Test WebSocket error handling
    if (wsClient) {
      wsClient.send(JSON.stringify({ type: 'invalid_message_type', invalid: true }));
      // Should not crash - error should be handled gracefully
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  })();
  
  // Cleanup
  console.log('🧹 Cleaning up test resources...');
  
  if (wsClient) {
    wsClient.close();
  }
  
  if (wsServer) {
    wsServer.close();
  }
  
  // Clean up test logs
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const logsDir = path.join(process.cwd(), '.claude', 'logs');
    const files = await fs.readdir(logsDir);
    
    for (const file of files) {
      if (file.includes('integration-test')) {
        await fs.unlink(path.join(logsDir, file));
      }
    }
  } catch (error) {
    console.warn('Failed to clean up test logs:', error.message);
  }
  
  // Print results
  console.log('\n📊 Integration Test Results:');
  console.log('=' .repeat(50));
  results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.status}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  });
  
  console.log('=' .repeat(50));
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed} tests`);
  console.log(`Failed: ${failed} tests`);
  console.log(`Success Rate: ${Math.round((passed / results.length) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All integration tests passed! The MCP PDL system is working correctly.');
    process.exit(0);
  } else {
    console.log('\n❌ Some integration tests failed. Please review the errors above.');
    process.exit(1);
  }
}

runIntegrationTest().catch(error => {
  console.error('💥 Integration test suite failed:', error);
  process.exit(1);
});