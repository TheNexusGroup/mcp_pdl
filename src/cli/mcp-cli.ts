#!/usr/bin/env node

import { program } from 'commander';
import { MCPConfigManager } from '../utils/config-manager.js';
import { promises as fs } from 'fs';
import { join } from 'path';

program
  .name('mcp-pdl')
  .description('MCP PDL project management CLI')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new MCP PDL project in the current directory')
  .option('-n, --name <name>', 'Project name')
  .option('-d, --description <description>', 'Project description')
  .option('--start-phase <phase>', 'Starting phase (1-7)', '1')
  .action(async (options) => {
    const cwd = process.cwd();
    const projectName = options.name || require('path').basename(cwd);
    const startPhase = parseInt(options.startPhase);

    if (startPhase < 1 || startPhase > 7) {
      console.error('Error: Start phase must be between 1 and 7');
      process.exit(1);
    }

    try {
      // Check if config already exists
      const existing = await MCPConfigManager.findProjectConfig(cwd);
      if (existing) {
        console.error('Error: MCP PDL project already exists in this directory tree');
        console.log(`Found existing config at: ${existing.configPath}`);
        process.exit(1);
      }

      const config = await MCPConfigManager.createProjectConfig(
        cwd,
        projectName,
        options.description
      );

      console.log('✅ MCP PDL project initialized successfully!');
      console.log(`Project Name: ${config.project.name}`);
      console.log(`Project ID: ${config.project.id}`);
      console.log(`Config Location: ${join(cwd, '.claude/.mcp.config')}`);
      
    } catch (error) {
      console.error('Error initializing project:', error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show current project status')
  .action(async () => {
    try {
      const result = await MCPConfigManager.getProjectFromCurrentDirectory();
      if (!result) {
        console.error('No MCP PDL project found in current directory tree');
        process.exit(1);
      }

      const { config } = result;
      
      console.log('📊 MCP PDL Project Status');
      console.log('========================');
      console.log(`Project: ${config.project.name}`);
      console.log(`ID: ${config.project.id}`);
      console.log(`Path: ${config.project.full_path}`);
      if (config.project.description) {
        console.log(`Description: ${config.project.description}`);
      }
      console.log(`Created: ${config.project.created_at}`);
      console.log(`Updated: ${config.project.updated_at}`);
      console.log('\nNote: Project state is managed by the MCP PDL server.');
      
    } catch (error) {
      console.error('Error getting project status:', error);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show or update project configuration')
  .option('--show', 'Show current configuration')
  .option('--set <key=value>', 'Set configuration value')
  .option('--example', 'Show example configuration')
  .action(async (options) => {
    if (options.example) {
      const exampleConfig = MCPConfigManager.generateExampleConfig();
      console.log('Example .mcp.config:');
      console.log(JSON.stringify(exampleConfig, null, 2));
      return;
    }

    if (options.show || (!options.set)) {
      try {
        const result = await MCPConfigManager.getProjectFromCurrentDirectory();
        if (!result) {
          console.error('No MCP PDL project found in current directory tree');
          process.exit(1);
        }

        console.log('Current Configuration:');
        console.log(JSON.stringify(result.config, null, 2));
        
      } catch (error) {
        console.error('Error reading configuration:', error);
        process.exit(1);
      }
    }

    if (options.set) {
      // TODO: Implement configuration setting
      console.log('Configuration setting not yet implemented');
    }
  });

program
  .command('validate')
  .description('Validate project configuration')
  .action(async () => {
    try {
      const result = await MCPConfigManager.getProjectFromCurrentDirectory();
      if (!result) {
        console.error('No MCP PDL project found in current directory tree');
        process.exit(1);
      }

      const validation = await MCPConfigManager.validateConfig(result.config);
      
      if (validation.isValid) {
        console.log('✅ Configuration is valid');
      } else {
        console.log('❌ Configuration has errors:');
        validation.errors.forEach(error => {
          console.log(`  - ${error}`);
        });
        process.exit(1);
      }
      
    } catch (error) {
      console.error('Error validating configuration:', error);
      process.exit(1);
    }
  });

program
  .command('sync')
  .description('Sync local configuration with MCP PDL server')
  .action(async () => {
    try {
      const result = await MCPConfigManager.getProjectFromCurrentDirectory();
      if (!result) {
        console.error('No MCP PDL project found in current directory tree');
        process.exit(1);
      }

      console.log('🔄 Syncing with MCP PDL server...');
      const success = await MCPConfigManager.syncWithServer(result.config);
      
      if (success) {
        console.log('✅ Successfully synced with server');
      } else {
        console.log('❌ Failed to sync with server');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('Error syncing with server:', error);
      process.exit(1);
    }
  });

program.parse();

export default program;