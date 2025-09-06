import { PDLFunctionHandlers } from './functions.js';
import { Database } from '../storage/database.js';
import { MCPConfigManager } from '../utils/config-manager.js';
import { MCPConfig } from '../models/config.js';

export class ConfigAwarePDLHandlers extends PDLFunctionHandlers {
  constructor(database: Database) {
    super(database);
  }

  async initializeProjectWithConfig(
    projectPath: string,
    projectName: string,
    description?: string,
    teamComposition?: any,
    startPhase: number = 1
  ) {
    // Create MCP config file first
    const config = await MCPConfigManager.createProjectConfig(
      projectPath,
      projectName,
      description
    );

    // Then initialize in the database using the config
    const result = await this.initializeProject(
      config.project.name,
      config.project.description,
      teamComposition,
      startPhase
    );

    return { result, config };
  }

  async getPhaseFromCurrentDirectory(includeSprints: boolean = false) {
    const projectInfo = await MCPConfigManager.getProjectFromCurrentDirectory();
    if (!projectInfo) {
      throw new Error('No MCP PDL project found in current directory tree. Use "mcp-pdl init" to create one.');
    }

    return this.getPhase(projectInfo.config.project.name, includeSprints);
  }

  async updatePhaseFromCurrentDirectory(
    phaseNumber?: number,
    status?: string,
    completionPercentage?: number,
    notes?: string,
    transitionToNext: boolean = false
  ) {
    const projectInfo = await MCPConfigManager.getProjectFromCurrentDirectory();
    if (!projectInfo) {
      throw new Error('No MCP PDL project found in current directory tree. Use "mcp-pdl init" to create one.');
    }

    return await this.updatePhase(
      projectInfo.config.project.name,
      phaseNumber,
      status,
      completionPercentage,
      notes,
      transitionToNext
    );
  }

  async trackProgressFromCurrentDirectory(
    action: 'create_sprint' | 'update_sprint' | 'get_sprints' | 'get_timeline',
    sprintData?: any
  ) {
    const projectInfo = await MCPConfigManager.getProjectFromCurrentDirectory();
    if (!projectInfo) {
      throw new Error('No MCP PDL project found in current directory tree. Use "mcp-pdl init" to create one.');
    }

    return await this.trackProgress(
      projectInfo.config.project.name,
      action,
      sprintData
    );
  }

  async getCurrentProjectConfig(): Promise<MCPConfig | null> {
    const projectInfo = await MCPConfigManager.getProjectFromCurrentDirectory();
    return projectInfo?.config || null;
  }

  async validateCurrentProject(): Promise<{ isValid: boolean; errors: string[]; config?: MCPConfig }> {
    const projectInfo = await MCPConfigManager.getProjectFromCurrentDirectory();
    if (!projectInfo) {
      return {
        isValid: false,
        errors: ['No MCP PDL project found in current directory tree']
      };
    }

    const validation = await MCPConfigManager.validateConfig(projectInfo.config);
    return {
      ...validation,
      config: projectInfo.config
    };
  }

  async syncCurrentProjectWithServer(): Promise<boolean> {
    const projectInfo = await MCPConfigManager.getProjectFromCurrentDirectory();
    if (!projectInfo) {
      return false;
    }

    try {
      // Verify project exists on server
      await this.getPhase(projectInfo.config.project.name, true);
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    }
  }
}

// Helper function to create config-aware handlers
export function createConfigAwarePDLHandlers(database: Database): ConfigAwarePDLHandlers {
  return new ConfigAwarePDLHandlers(database);
}