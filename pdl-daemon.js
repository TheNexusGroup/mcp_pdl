#!/usr/bin/env node

// MCP PDL Daemon Wrapper
// Keeps the MCP server running as a daemon service

const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'dist', 'server.js');

console.log('Starting MCP PDL Daemon...');

let child = null;
let restartCount = 0;
const maxRestarts = 5;
const restartDelay = 5000; // 5 seconds

function startServer() {
  if (restartCount >= maxRestarts) {
    console.error(`Max restarts (${maxRestarts}) reached. Exiting.`);
    process.exit(1);
  }

  console.log(`Starting MCP PDL Server (attempt ${restartCount + 1})`);
  
  child = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PDL_DATA_PATH: '/home/persist/repos/lib/mcp_pdl/data'
    }
  });

  // Keep stdin open but don't write to it
  child.stdin.end();

  child.stdout.on('data', (data) => {
    console.log(`[PDL] ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`[PDL] ${data.toString().trim()}`);
  });

  child.on('close', (code) => {
    console.log(`MCP PDL Server exited with code ${code}`);
    restartCount++;
    
    if (code !== 0 && restartCount < maxRestarts) {
      console.log(`Restarting in ${restartDelay/1000} seconds...`);
      setTimeout(startServer, restartDelay);
    }
  });

  child.on('error', (err) => {
    console.error('Failed to start MCP PDL Server:', err);
    restartCount++;
    
    if (restartCount < maxRestarts) {
      setTimeout(startServer, restartDelay);
    }
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  if (child) {
    child.kill('SIGTERM');
  }
  setTimeout(() => {
    process.exit(0);
  }, 5000);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  if (child) {
    child.kill('SIGINT');
  }
  setTimeout(() => {
    process.exit(0);
  }, 5000);
});

// Start the server
startServer();

// Keep the daemon running
setInterval(() => {
  // Health check could go here
}, 30000);