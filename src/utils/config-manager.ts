import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MCPConfig, DEFAULT_MCP_CONFIG } from '../models/config.js';

export class MCPConfigManager {
  private static readonly CONFIG_FILENAME = '.mcp.config';
  private static readonly CLAUDE_DIR = '.claude';

  static async findProjectConfig(startPath: string): Promise<{ config: MCPConfig; configPath: string } | null> {
    let currentPath = startPath;
    const root = '/';

    while (currentPath !== root) {
      const claudeDir = join(currentPath, this.CLAUDE_DIR);
      const configPath = join(claudeDir, this.CONFIG_FILENAME);
      
      try {
        await fs.access(configPath);
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData) as MCPConfig;
        return { config, configPath };
      } catch (error) {
        // Config doesn't exist at this level, try parent directory
      }

      const parentPath = dirname(currentPath);
      if (parentPath === currentPath) break; // Reached filesystem root
      currentPath = parentPath;
    }

    return null;
  }

  static async createProjectConfig(
    projectPath: string,
    projectName: string,
    description?: string
  ): Promise<MCPConfig> {
    const claudeDir = join(projectPath, this.CLAUDE_DIR);
    const configPath = join(claudeDir, this.CONFIG_FILENAME);

    // Ensure .claude directory exists
    try {
      await fs.mkdir(claudeDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const now = new Date().toISOString();
    const config: MCPConfig = {
      ...DEFAULT_MCP_CONFIG,
      version: "1.0.0",
      project: {
        name: projectName,
        id: uuidv4(),  // Unique Claude project ID for cross-reference
        full_path: projectPath,
        description: description || '',
        created_at: now,
        updated_at: now
      }
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return config;
  }

  static async updateProjectConfig(
    configPath: string,
    updates: Partial<MCPConfig>
  ): Promise<MCPConfig> {
    const configData = await fs.readFile(configPath, 'utf-8');
    const currentConfig = JSON.parse(configData) as MCPConfig;

    const updatedConfig: MCPConfig = {
      ...currentConfig,
      ...updates,
      project: {
        ...currentConfig.project,
        ...updates.project,
        updated_at: new Date().toISOString()
      }
    };

    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8');
    return updatedConfig;
  }

  static async getProjectFromCurrentDirectory(): Promise<{ config: MCPConfig; configPath: string } | null> {
    const cwd = process.cwd();
    return this.findProjectConfig(cwd);
  }

  static async validateConfig(config: MCPConfig): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!config.version) {
      errors.push('Missing version field');
    }

    if (!config.project) {
      errors.push('Missing project configuration');
    } else {
      if (!config.project.name) {
        errors.push('Missing project name');
      }
      if (!config.project.id) {
        errors.push('Missing project ID');
      }
      if (!config.project.full_path) {
        errors.push('Missing project full path');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async syncWithServer(config: MCPConfig): Promise<boolean> {
    // This would sync the local config with the MCP PDL server
    // For now, this is a placeholder for future implementation
    try {
      // TODO: Implement server synchronization
      // - Compare local config with server project state
      // - Update local config if server has newer data
      // - Push local changes to server if needed
      return true;
    } catch (error) {
      console.error('Failed to sync with server:', error);
      return false;
    }
  }

  static generateExampleConfig(): MCPConfig {
    const now = new Date().toISOString();
    return {
      version: "1.0.0",
      project: {
        name: "my-awesome-project",
        id: uuidv4(),  // Unique Claude project ID
        full_path: "/path/to/my-awesome-project",
        description: "An example project using MCP PDL",
        created_at: now,
        updated_at: now
      }
    };
  }
}

export default MCPConfigManager;