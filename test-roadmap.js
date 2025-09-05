#!/usr/bin/env node

// Test script for the enhanced PDL system with roadmap functionality

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start the MCP PDL server
const serverPath = path.join(__dirname, 'dist', 'server.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Helper function to send requests to the server
function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    
    const responseHandler = (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const response = JSON.parse(line);
          if (response.id === id) {
            server.stdout.removeListener('data', responseHandler);
            if (response.error) {
              reject(response.error);
            } else {
              resolve(response.result);
            }
          }
        } catch (e) {
          // Continue processing other lines
        }
      }
    };
    
    server.stdout.on('data', responseHandler);
    
    setTimeout(() => {
      server.stdout.removeListener('data', responseHandler);
      reject(new Error('Request timeout'));
    }, 5000);
  });
}

async function testRoadmapSystem() {
  console.log('🚀 Testing Enhanced PDL System with Roadmap\n');
  
  try {
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 1. Initialize a new project
    console.log('1️⃣ Initializing project...');
    const initResult = await sendRequest('tools/call', {
      name: 'initialize_project',
      arguments: {
        project_name: 'TestProject2024',
        description: 'A test project for roadmap functionality',
        team_composition: {
          product_manager: 'Alice',
          product_designer: 'Bob',
          engineering_manager: 'Charlie',
          engineers: ['David', 'Eve'],
          qa_engineers: ['Frank'],
          marketing_manager: 'Grace'
        }
      }
    });
    console.log('✅ Project initialized:', JSON.parse(initResult.content[0].text).message);
    
    // 2. Create a roadmap with multiple phases
    console.log('\n2️⃣ Creating roadmap...');
    const roadmapResult = await sendRequest('tools/call', {
      name: 'create_roadmap',
      arguments: {
        project_name: 'TestProject2024',
        vision: 'Build a revolutionary product that transforms user experience',
        phases: [
          {
            name: 'MVP Development',
            description: 'Build the minimum viable product',
            objective: 'Launch core features to early adopters',
            duration_weeks: 8,
            deliverables: ['Core API', 'Basic UI', 'User authentication'],
            success_metrics: ['100 beta users', '90% uptime', 'Sub-2s page load']
          },
          {
            name: 'Feature Expansion',
            description: 'Add advanced features based on feedback',
            objective: 'Enhance product capabilities',
            duration_weeks: 12,
            deliverables: ['Advanced analytics', 'Integration APIs', 'Mobile app'],
            success_metrics: ['1000 active users', '4.5+ app rating', '50+ integrations']
          },
          {
            name: 'Scale & Optimize',
            description: 'Optimize for growth and performance',
            objective: 'Prepare for mass market',
            duration_weeks: 10,
            deliverables: ['Performance optimizations', 'Global CDN', 'Enterprise features'],
            success_metrics: ['10K users', '<100ms latency', '99.9% uptime']
          }
        ],
        milestones: [
          {
            name: 'Beta Launch',
            description: 'Launch to beta users',
            phase_index: 0,
            weeks_into_phase: 6
          },
          {
            name: 'Public Launch',
            description: 'Open to general public',
            phase_index: 1,
            weeks_into_phase: 8
          }
        ]
      }
    });
    const roadmap = JSON.parse(roadmapResult.content[0].text);
    console.log('✅ Roadmap created with', roadmap.roadmap.roadmap_phases.length, 'phases and', roadmap.roadmap.milestones.length, 'milestones');
    
    // 3. Create a sprint in the first phase
    console.log('\n3️⃣ Creating sprint in first phase...');
    const phaseId = roadmap.roadmap.roadmap_phases[0].roadmap_phase_id;
    const sprintResult = await sendRequest('tools/call', {
      name: 'create_sprint',
      arguments: {
        project_name: 'TestProject2024',
        roadmap_phase_id: phaseId,
        sprint_name: 'Sprint 1: Foundation',
        sprint_number: 1,
        duration_days: 14
      }
    });
    const sprint = JSON.parse(sprintResult.content[0].text);
    console.log('✅ Sprint created:', sprint.sprint.sprint_name);
    console.log('   Initial PDL Phase:', sprint.sprint.pdl_cycles[0].current_pdl_phase.pdl_phase_name);
    
    // 4. Update PDL phase within the sprint
    console.log('\n4️⃣ Updating PDL phase in sprint...');
    const updatePDLResult = await sendRequest('tools/call', {
      name: 'update_sprint_pdl',
      arguments: {
        project_name: 'TestProject2024',
        sprint_id: sprint.sprint.sprint_id,
        pdl_phase_number: 1,
        updates: {
          status: 'in_progress',
          completion_percentage: 50,
          notes: 'User research in progress'
        }
      }
    });
    console.log('✅ PDL phase updated:', JSON.parse(updatePDLResult.content[0].text).message);
    
    // 5. Advance to next PDL phase
    console.log('\n5️⃣ Advancing PDL cycle...');
    const advanceResult = await sendRequest('tools/call', {
      name: 'advance_pdl_cycle',
      arguments: {
        project_name: 'TestProject2024',
        sprint_id: sprint.sprint.sprint_id,
        completion_notes: 'Discovery phase complete, moving to definition'
      }
    });
    const advanced = JSON.parse(advanceResult.content[0].text);
    console.log('✅', advanced.message);
    
    // 6. Get current roadmap status
    console.log('\n6️⃣ Getting roadmap status...');
    const statusResult = await sendRequest('tools/call', {
      name: 'get_roadmap',
      arguments: {
        project_name: 'TestProject2024',
        include_details: true
      }
    });
    const status = JSON.parse(statusResult.content[0].text);
    console.log('✅ Current Status:');
    console.log('   Overall Progress:', status.roadmap.overall_progress + '%');
    console.log('   Current Phase:', status.current_phase?.phase_name || 'N/A');
    console.log('   Current Sprint:', status.current_sprint?.sprint_name || 'N/A');
    console.log('   Current PDL Phase:', status.current_pdl_cycle?.current_pdl_phase.pdl_phase_name || 'N/A');
    
    // 7. Test rapid PDL cycling
    console.log('\n7️⃣ Testing rapid PDL cycling...');
    for (let i = 3; i <= 7; i++) {
      const cycleResult = await sendRequest('tools/call', {
        name: 'advance_pdl_cycle',
        arguments: {
          project_name: 'TestProject2024',
          sprint_id: sprint.sprint.sprint_id
        }
      });
      const cycle = JSON.parse(cycleResult.content[0].text);
      console.log(`   ➡️ Advanced to PDL Phase ${i}: ${cycle.pdl_cycle.current_pdl_phase.pdl_phase_name}`);
    }
    
    // Complete the cycle
    const completeCycleResult = await sendRequest('tools/call', {
      name: 'advance_pdl_cycle',
      arguments: {
        project_name: 'TestProject2024',
        sprint_id: sprint.sprint.sprint_id
      }
    });
    const completedCycle = JSON.parse(completeCycleResult.content[0].text);
    console.log('✅', completedCycle.message);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.data) {
      console.error('Error details:', error.data);
    }
  } finally {
    // Clean up
    server.kill();
    process.exit(0);
  }
}

// Handle server errors
server.stderr.on('data', (data) => {
  const message = data.toString();
  if (!message.includes('MCP PDL Server running')) {
    console.error('Server error:', message);
  }
});

// Run the test
testRoadmapSystem();