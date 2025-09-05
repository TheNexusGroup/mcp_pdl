#!/usr/bin/env node

/**
 * MCP PDL Server Entry Point
 * 
 * Runs the PDL MCP server using the compiled JavaScript
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, 'dist', 'server.js');

// Forward all stdio to parent process
const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('exit', (code) => {
  process.exit(code || 0);
});