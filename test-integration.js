#!/usr/bin/env node

import { PDLDatabase } from './dist/storage/database.js';
import { RepositoryHandlers } from './dist/handlers/repository-handlers.js';

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
  const db = new PDLDatabase();
  const handlers = new RepositoryHandlers(db);
  
  // Test 1: Database and Handlers Initialization
  await test('Database and handlers initialization', async () => {
    if (!db || !handlers) {
      throw new Error('Failed to initialize core components');
    }
  })();
  
  // Test 2: Repository Status Check
  await test('Repository status check', async () => {
    const status = await handlers.getStatus();
    if (!status) {
      throw new Error('Failed to get repository status');
    }
    console.log(`Repository ID: ${status.repository_id || 'Not set'}`);
  })();
  
  // Test 3: Repository Initialization
  await test('Repository initialization', async () => {
    const result = await handlers.initializeRepository({
      description: 'Integration test repository'
    });
    
    if (!result.success) {
      throw new Error(`Repository initialization failed: ${result.message}`);
    }
    
    console.log(`Initialized repository: ${result.repository_id}`);
  })();
  
  // Test 4: Roadmap Creation
  await test('Roadmap creation', async () => {
    const result = await handlers.createRoadmap({
      vision: 'Test roadmap for integration testing',
      phases: [
        {
          name: 'Test Planning Phase',
          description: 'Plan comprehensive integration tests',
          objective: 'Establish testing framework'
        },
        {
          name: 'Test Execution Phase', 
          description: 'Execute integration tests',
          objective: 'Validate system integration'
        }
      ]
    });
    
    if (!result.success) {
      throw new Error(`Roadmap creation failed: ${result.message}`);
    }
    
    console.log(`Created roadmap with ${result.phases_created} phases`);
  })();
  
  // Test 5: Sprint Creation
  await test('Sprint creation', async () => {
    // Get current status to find phase IDs
    const status = await handlers.getStatus();
    if (!status.roadmap_phases || status.roadmap_phases.length === 0) {
      throw new Error('No roadmap phases found');
    }
    
    const firstPhaseId = status.roadmap_phases[0].roadmap_phase_id;
    
    const result = await handlers.createSprint({
      roadmap_phase_id: firstPhaseId,
      sprint_name: 'Integration Test Sprint',
      duration_days: 14
    });
    
    if (!result.success) {
      throw new Error(`Sprint creation failed: ${result.message}`);
    }
    
    console.log(`Created sprint: ${result.sprint_name}`);
  })();
  
  // Test 6: Task Creation and Updates
  await test('Task management', async () => {
    // Get active sprint
    const status = await handlers.getStatus();
    if (!status.active_sprint) {
      throw new Error('No active sprint found');
    }
    
    const sprintId = status.active_sprint.sprint_id;
    
    // Create a task
    const createResult = await handlers.createTask({
      sprint_id: sprintId,
      pdl_phase_number: 1,
      task_description: 'Integration test task',
      assignee: 'Test Engineer',
      story_points: 3
    });
    
    if (!createResult.success) {
      throw new Error(`Task creation failed: ${createResult.message}`);
    }
    
    // Update task status
    const updateResult = await handlers.updateTask({
      task_id: createResult.task_id,
      status: 'in_progress'
    });
    
    if (!updateResult.success) {
      throw new Error(`Task update failed: ${updateResult.message}`);
    }
    
    console.log(`Created and updated task: ${createResult.task_id}`);
  })();
  
  // Test 7: Manipulation Functions
  await test('Dynamic manipulation capabilities', async () => {
    // Test insert roadmap phase
    const insertResult = await handlers.insertRoadmapPhase({
      position: 1,
      phase: {
        name: 'Inserted Test Phase',
        description: 'Phase inserted via manipulation function',
        objective: 'Test dynamic insertion'
      }
    });
    
    if (!insertResult.success) {
      throw new Error(`Phase insertion failed: ${insertResult.message}`);
    }
    
    console.log(`Successfully inserted phase at position 1`);
  })();
  
  // Print results
  console.log('\n📊 Integration Test Results:');
  console.log('='.repeat(50));
  results.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.status}`);
    if (result.error) {
      console.log(`    Error: ${result.error}`);
    }
  });
  
  console.log('='.repeat(50));
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