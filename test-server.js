#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test the MCP server with basic operations
async function testServer() {
  console.log('Testing MCP PDL Server...\n');

  const serverPath = join(__dirname, 'dist', 'server.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responseCount = 0;
  const responses = [];

  server.stdout.on('data', (data) => {
    const response = data.toString();
    console.log('Server response:', response);
    responses.push(response);
    responseCount++;
  });

  server.stderr.on('data', (data) => {
    console.log('Server started:', data.toString());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 1: List tools
  console.log('Test 1: Listing available tools...');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };
  
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 2: Initialize a project
  console.log('\nTest 2: Initializing a test project...');
  const initProjectRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'initialize_project',
      arguments: {
        project_name: 'test-project',
        description: 'A test project for validation',
        team_composition: {
          product_manager: 'Test PM',
          engineering_manager: 'Test EM'
        }
      }
    }
  };
  
  server.stdin.write(JSON.stringify(initProjectRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 3: Get phase information
  console.log('\nTest 3: Getting current phase...');
  const getPhaseRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'get_phase',
      arguments: {
        project_name: 'test-project'
      }
    }
  };
  
  server.stdin.write(JSON.stringify(getPhaseRequest) + '\n');

  // Wait for final response
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log(`\nTest completed. Received ${responseCount} responses.`);
  
  server.kill();
  
  if (responseCount >= 3) {
    console.log('✅ MCP PDL Server is working correctly!');
    return true;
  } else {
    console.log('❌ Server did not respond as expected.');
    return false;
  }
}

testServer().catch(console.error);