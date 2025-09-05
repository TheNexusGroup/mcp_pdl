#!/usr/bin/env node

/**
 * Comprehensive test of all PDL MCP functions
 * Tests the complete workflow from project initialization to sprint PDL cycles
 */

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

async function testAllPDLFunctions() {
  console.log('🧪 COMPREHENSIVE PDL SYSTEM TEST\n');
  console.log('================================\n');
  
  const projectName = 'TestProject_' + Date.now();
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 1: Initialize Project
    console.log('📌 Test 1: Initialize Project');
    try {
      const initResult = await sendRequest('tools/call', {
        name: 'initialize_project',
        arguments: {
          project_name: projectName,
          description: 'Comprehensive test project for PDL system',
          team_composition: {
            product_manager: 'Alice PM',
            product_designer: 'Bob Designer',
            engineering_manager: 'Charlie EM',
            engineers: ['Dave Dev', 'Eve Engineer'],
            qa_engineers: ['Frank QA', 'Grace Tester'],
            marketing_manager: 'Henry Marketing',
            sales_support: ['Ivy Sales']
          },
          start_phase: 1
        }
      });
      console.log('✅ Project initialized:', JSON.parse(initResult.content[0].text).project_name);
      testsPassed++;
    } catch (error) {
      console.log('❌ Failed to initialize project:', error.message);
      testsFailed++;
    }
    
    // Test 2: Create Roadmap
    console.log('\n📌 Test 2: Create Roadmap');
    let roadmap;
    try {
      const roadmapResult = await sendRequest('tools/call', {
        name: 'create_roadmap',
        arguments: {
          project_name: projectName,
          vision: 'Build a comprehensive test suite demonstrating all PDL capabilities',
          phases: [
            {
              name: 'Foundation Phase',
              description: 'Establish core infrastructure and architecture',
              objective: 'Create solid technical foundation',
              duration_weeks: 6,
              deliverables: ['Core API', 'Database Schema', 'Authentication'],
              success_metrics: ['API response < 200ms', '99% uptime', 'OAuth2 integration']
            },
            {
              name: 'Feature Development',
              description: 'Build main product features',
              objective: 'Deliver core user functionality',
              duration_weeks: 8,
              deliverables: ['User Dashboard', 'Admin Panel', 'Reporting Engine'],
              success_metrics: ['5 core features', 'Mobile responsive', 'Real-time updates']
            },
            {
              name: 'Polish & Launch',
              description: 'Refine and prepare for production',
              objective: 'Production-ready release',
              duration_weeks: 4,
              deliverables: ['Performance optimization', 'Security audit', 'Documentation'],
              success_metrics: ['100% test coverage', 'A+ security rating', 'Complete docs']
            }
          ],
          milestones: [
            {
              name: 'Alpha Release',
              description: 'Internal testing version',
              phase_index: 0,
              weeks_into_phase: 4
            },
            {
              name: 'Beta Release',
              description: 'External testing version',
              phase_index: 1,
              weeks_into_phase: 6
            },
            {
              name: 'Production Launch',
              description: 'Public release',
              phase_index: 2,
              weeks_into_phase: 3
            }
          ]
        }
      });
      roadmap = JSON.parse(roadmapResult.content[0].text).roadmap;
      console.log('✅ Roadmap created with', roadmap.roadmap_phases.length, 'phases and', roadmap.milestones.length, 'milestones');
      testsPassed++;
    } catch (error) {
      console.log('❌ Failed to create roadmap:', error.message);
      testsFailed++;
      throw error; // Can't continue without roadmap
    }
    
    // Test 3: Create Sprint
    console.log('\n📌 Test 3: Create Sprint');
    let sprint;
    try {
      const phaseId = roadmap.roadmap_phases[0].roadmap_phase_id;
      const sprintResult = await sendRequest('tools/call', {
        name: 'create_sprint',
        arguments: {
          project_name: projectName,
          roadmap_phase_id: phaseId,
          sprint_name: 'Sprint Alpha: Core Setup',
          sprint_number: 1,
          duration_days: 14
        }
      });
      sprint = JSON.parse(sprintResult.content[0].text).sprint;
      console.log('✅ Sprint created:', sprint.sprint_name);
      console.log('   PDL Cycles:', sprint.pdl_cycles.length);
      console.log('   Initial PDL Phase:', sprint.pdl_cycles[0].current_pdl_phase.pdl_phase_name);
      testsPassed++;
    } catch (error) {
      console.log('❌ Failed to create sprint:', error.message);
      testsFailed++;
      throw error;
    }
    
    // Test 4: Update Sprint PDL
    console.log('\n📌 Test 4: Update Sprint PDL Phase');
    try {
      const updateResult = await sendRequest('tools/call', {
        name: 'update_sprint_pdl',
        arguments: {
          project_name: projectName,
          sprint_id: sprint.sprint_id,
          pdl_phase_number: 1,
          updates: {
            status: 'in_progress',
            completion_percentage: 75,
            tasks: [
              {
                task_id: 'task-001',
                description: 'Research user requirements',
                assignee: 'Alice PM',
                status: 'done',
                story_points: 3
              },
              {
                task_id: 'task-002',
                description: 'Competitive analysis',
                assignee: 'Henry Marketing',
                status: 'in_progress',
                story_points: 5
              }
            ],
            notes: 'Discovery phase progressing well, insights documented'
          }
        }
      });
      console.log('✅', JSON.parse(updateResult.content[0].text).message);
      testsPassed++;
    } catch (error) {
      console.log('❌ Failed to update sprint PDL:', error.message);
      testsFailed++;
    }
    
    // Test 5: Advance PDL Cycle
    console.log('\n📌 Test 5: Advance PDL Cycle Through All Phases');
    try {
      const phases = [
        'Discovery & Ideation',
        'Definition & Scoping',
        'Design & Prototyping',
        'Development & Implementation',
        'Testing & Quality Assurance',
        'Launch & Deployment',
        'Post-Launch: Growth & Iteration'
      ];
      
      for (let i = 1; i <= 7; i++) {
        const advanceResult = await sendRequest('tools/call', {
          name: 'advance_pdl_cycle',
          arguments: {
            project_name: projectName,
            sprint_id: sprint.sprint_id,
            completion_notes: `Completed ${phases[i-1]}`
          }
        });
        const result = JSON.parse(advanceResult.content[0].text);
        if (i < 7) {
          console.log(`   ✅ Advanced to Phase ${i+1}: ${result.pdl_cycle.current_pdl_phase.pdl_phase_name}`);
        } else {
          console.log(`   ✅ Completed PDL Cycle 1`);
        }
      }
      testsPassed++;
    } catch (error) {
      console.log('❌ Failed to advance PDL cycle:', error.message);
      testsFailed++;
    }
    
    // Test 6: Get Roadmap Status
    console.log('\n📌 Test 6: Get Roadmap Status');
    try {
      const statusResult = await sendRequest('tools/call', {
        name: 'get_roadmap',
        arguments: {
          project_name: projectName,
          include_details: true
        }
      });
      const status = JSON.parse(statusResult.content[0].text);
      console.log('✅ Roadmap Status Retrieved:');
      console.log('   Project:', status.roadmap.project_name);
      console.log('   Vision:', status.roadmap.vision);
      console.log('   Overall Progress:', status.roadmap.overall_progress + '%');
      console.log('   Timeline:', new Date(status.roadmap.timeline_start).toLocaleDateString(), 
                  'to', new Date(status.roadmap.timeline_end).toLocaleDateString());
      if (status.current_phase) {
        console.log('   Current Phase:', status.current_phase.phase_name);
      }
      testsPassed++;
    } catch (error) {
      console.log('❌ Failed to get roadmap status:', error.message);
      testsFailed++;
    }
    
    // Test 7: Update Roadmap Phase
    console.log('\n📌 Test 7: Update Roadmap Phase');
    try {
      const phaseId = roadmap.roadmap_phases[0].roadmap_phase_id;
      const updatePhaseResult = await sendRequest('tools/call', {
        name: 'update_roadmap_phase',
        arguments: {
          project_name: projectName,
          roadmap_phase_id: phaseId,
          updates: {
            status: 'in_progress',
            completion_percentage: 25,
            deliverables: ['Core API', 'Database Schema', 'Authentication', 'Logging System'],
            success_metrics: ['API response < 200ms', '99% uptime', 'OAuth2 integration', 'ELK stack integrated']
          }
        }
      });
      console.log('✅', JSON.parse(updatePhaseResult.content[0].text).message);
      testsPassed++;
    } catch (error) {
      console.log('❌ Failed to update roadmap phase:', error.message);
      testsFailed++;
    }
    
    // Test 8: Legacy Functions - Get Phase
    console.log('\n📌 Test 8: Legacy Function - Get Phase');
    try {
      const phaseResult = await sendRequest('tools/call', {
        name: 'get_phase',
        arguments: {
          project_name: projectName,
          include_sprints: true
        }
      });
      const phase = JSON.parse(phaseResult.content[0].text);
      console.log('✅ Current phase:', phase.current_phase.phase_name);
      console.log('   Sprints in phase:', phase.sprints ? phase.sprints.length : 0);
      testsPassed++;
    } catch (error) {
      console.log('❌ Failed to get phase:', error.message);
      testsFailed++;
    }
    
    // Test 9: Legacy Functions - Update Phase
    console.log('\n📌 Test 9: Legacy Function - Update Phase');
    try {
      const updateResult = await sendRequest('tools/call', {
        name: 'update_phase',
        arguments: {
          project_name: projectName,
          phase_number: 1,
          status: 'in_progress',
          completion_percentage: 30,
          notes: 'Making good progress on foundation',
          transition_to_next: false
        }
      });
      console.log('✅', JSON.parse(updateResult.content[0].text).message);
      testsPassed++;
    } catch (error) {
      console.log('❌ Failed to update phase:', error.message);
      testsFailed++;
    }
    
    // Test 10: Track Progress - Get Timeline
    console.log('\n📌 Test 10: Track Progress - Get Timeline');
    try {
      const timelineResult = await sendRequest('tools/call', {
        name: 'track_progress',
        arguments: {
          project_name: projectName,
          action: 'get_timeline'
        }
      });
      const timeline = JSON.parse(timelineResult.content[0].text);
      console.log('✅ Timeline retrieved with', timeline.data.length, 'phases');
      timeline.data.forEach(phase => {
        console.log(`   - ${phase.phase_name}: ${phase.status} (${phase.completion_percentage}%)`);
      });
      testsPassed++;
    } catch (error) {
      console.log('❌ Failed to get timeline:', error.message);
      testsFailed++;
    }
    
    // Test 11: Create Additional Sprint with Multiple PDL Cycles
    console.log('\n📌 Test 11: Create Second Sprint and Run Multiple PDL Cycles');
    try {
      const phaseId = roadmap.roadmap_phases[0].roadmap_phase_id;
      const sprint2Result = await sendRequest('tools/call', {
        name: 'create_sprint',
        arguments: {
          project_name: projectName,
          roadmap_phase_id: phaseId,
          sprint_name: 'Sprint Beta: API Development',
          sprint_number: 2,
          duration_days: 14
        }
      });
      const sprint2 = JSON.parse(sprint2Result.content[0].text).sprint;
      console.log('✅ Sprint 2 created:', sprint2.sprint_name);
      
      // Run through 2 quick PDL cycles
      for (let cycle = 1; cycle <= 2; cycle++) {
        console.log(`   Running PDL Cycle ${cycle}...`);
        for (let i = 1; i <= 7; i++) {
          await sendRequest('tools/call', {
            name: 'advance_pdl_cycle',
            arguments: {
              project_name: projectName,
              sprint_id: sprint2.sprint_id
            }
          });
        }
        console.log(`   ✅ Completed PDL Cycle ${cycle}`);
      }
      testsPassed++;
    } catch (error) {
      console.log('❌ Failed to create second sprint:', error.message);
      testsFailed++;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
    
    if (testsFailed === 0) {
      console.log('\n🎉 ALL PDL FUNCTIONS WORKING CORRECTLY!');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the errors above.');
    }
    
  } catch (error) {
    console.error('\n💥 Critical test failure:', error.message);
    if (error.data) {
      console.error('Error details:', error.data);
    }
  } finally {
    // Clean up
    server.kill();
    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

// Handle server errors
server.stderr.on('data', (data) => {
  const message = data.toString();
  if (!message.includes('MCP PDL Server running')) {
    console.error('Server error:', message);
  }
});

// Run the comprehensive test
testAllPDLFunctions();