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
      description,
      teamComposition
    );

    // Then initialize in the database using the config
    const result = await this.initializeProject(
      config.project.name,
      config.project.description,
      config.team,
      startPhase
    );

    // Update config with any changes from server initialization
    if (result.success) {
      await MCPConfigManager.updateProjectConfig(
        `${projectPath}/.claude/.mcp.config`,
        {
          pdl: {
            ...config.pdl,
            current_phase: startPhase,
            start_phase: startPhase
          }
        }
      );
    }

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

    const result = await this.updatePhase(
      projectInfo.config.project.name,
      phaseNumber,
      status,
      completionPercentage,
      notes,
      transitionToNext
    );

    // Update local config to reflect changes
    if (result.success) {
      const updatedPhase = result.updated_phase;
      const currentConfig = projectInfo.config;
      
      const updatedPDL = {
        ...currentConfig.pdl,
        current_phase: updatedPhase.phase_number,
      };

      // Track completed phases
      if (updatedPhase.status === 'completed' && 
          !updatedPDL.phases_completed.includes(updatedPhase.phase_number)) {
        updatedPDL.phases_completed.push(updatedPhase.phase_number);
        updatedPDL.phases_completed.sort((a, b) => a - b);
      }

      // Update current phase if transitioning
      if (transitionToNext && updatedPhase.status === 'completed' && updatedPhase.phase_number < 7) {
        updatedPDL.current_phase = updatedPhase.phase_number + 1;
      }

      await MCPConfigManager.updateProjectConfig(projectInfo.configPath, {
        pdl: updatedPDL
      });
    }

    return result;
  }

  async trackProgressFromCurrentDirectory(
    action: 'create_sprint' | 'update_sprint' | 'get_sprints' | 'get_timeline',
    sprintData?: any
  ) {
    const projectInfo = await MCPConfigManager.getProjectFromCurrentDirectory();
    if (!projectInfo) {
      throw new Error('No MCP PDL project found in current directory tree. Use "mcp-pdl init" to create one.');
    }

    const result = await this.trackProgress(
      projectInfo.config.project.name,
      action,
      sprintData
    );

    // Update local config for sprint tracking
    if (result.success && (action === 'create_sprint' || action === 'update_sprint')) {
      const currentConfig = projectInfo.config;
      let updatedPDL = { ...currentConfig.pdl };

      if (action === 'create_sprint') {
        updatedPDL.total_sprints += 1;
        if (sprintData && sprintData.sprint_name) {
          updatedPDL.active_sprints.push(sprintData.sprint_name);
        }
      }

      if (action === 'update_sprint' && sprintData?.status === 'completed') {
        // Remove from active sprints if completed
        updatedPDL.active_sprints = updatedPDL.active_sprints.filter(
          name => name !== sprintData.sprint_name
        );
      }

      await MCPConfigManager.updateProjectConfig(projectInfo.configPath, {
        pdl: updatedPDL
      });
    }

    return result;
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
      // Get current server state
      const serverPhase = await this.getPhase(projectInfo.config.project.name, true);
      const serverTimeline = await this.trackProgress(
        projectInfo.config.project.name,
        'get_timeline'
      );

      // Update local config with server state
      const updatedPDL = {
        ...projectInfo.config.pdl,
        current_phase: serverPhase.current_phase.phase_number,
      };

      // Sync completed phases from server
      if (serverTimeline.success && serverTimeline.data) {
        const completedPhases = serverTimeline.data
          .filter((phase: any) => phase.status === 'completed')
          .map((phase: any) => phase.phase_number);
        
        updatedPDL.phases_completed = completedPhases;
      }

      await MCPConfigManager.updateProjectConfig(projectInfo.configPath, {
        pdl: updatedPDL
      });

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