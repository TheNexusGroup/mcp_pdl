import { Database } from '../storage/database.js';
import { 
  PDL_PHASE_NAMES,
  PhaseStatus
} from '../models/types.js';
import { v4 as uuidv4 } from 'uuid';

// Legacy response types for backward compatibility
export interface LegacyPhaseResponse {
  project_name: string;
  current_phase: any;
  sprints?: any[];
}

export interface LegacyUpdateResponse {
  success: boolean;
  project_name: string;
  updated_phase: any;
  message: string;
}

export interface LegacyProgressResponse {
  success: boolean;
  project_name: string;
  action: string;
  data: any;
}

export interface LegacyInitResponse {
  success: boolean;
  project_name: string;
  roadmap_created: boolean;
  message: string;
}

export class PDLFunctionHandlers {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async getPhase(projectName: string, includeSprints: boolean = false): Promise<LegacyPhaseResponse> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    // If project has a roadmap, return current phase from roadmap
    if (project.roadmap) {
      const currentPhase = project.roadmap.roadmap_phases.find(p => p.status === 'in_progress');
      const response: LegacyPhaseResponse = {
        project_name: projectName,
        current_phase: currentPhase || project.roadmap.roadmap_phases[0]
      };
      
      if (includeSprints && currentPhase) {
        response.sprints = currentPhase.sprints;
      }
      
      return response;
    }

    // Legacy response for projects without roadmap
    return {
      project_name: projectName,
      current_phase: {
        phase_number: 1,
        phase_name: PDL_PHASE_NAMES[1],
        status: 'not_started' as PhaseStatus,
        completion_percentage: 0
      },
      sprints: []
    };
  }

  async updatePhase(
    projectName: string,
    phaseNumber?: number,
    status?: string,
    completionPercentage?: number,
    notes?: string,
    transitionToNext: boolean = false
  ): Promise<LegacyUpdateResponse> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    // If project has a roadmap, update the roadmap phase
    if (project.roadmap) {
      const currentPhase = project.roadmap.roadmap_phases.find(p => p.status === 'in_progress');
      if (currentPhase) {
        if (status) currentPhase.status = status as PhaseStatus;
        if (completionPercentage !== undefined) currentPhase.completion_percentage = completionPercentage;
        
        await this.db.updateProject(projectName, { roadmap: project.roadmap });
        
        return {
          success: true,
          project_name: projectName,
          updated_phase: {
            phase_number: project.roadmap.roadmap_phases.indexOf(currentPhase) + 1,
            phase_name: currentPhase.phase_name,
            status: currentPhase.status,
            completion_percentage: currentPhase.completion_percentage
          },
          message: `Phase updated successfully`
        };
      }
    }

    // Legacy update for non-roadmap projects
    const targetPhaseNumber = phaseNumber || 1;

    return {
      success: true,
      project_name: projectName,
      updated_phase: {
        phase_number: targetPhaseNumber,
        phase_name: PDL_PHASE_NAMES[targetPhaseNumber],
        status: status as PhaseStatus || 'not_started',
        completion_percentage: completionPercentage || 0
      },
      message: `Phase ${targetPhaseNumber} updated successfully`
    };
  }

  async trackProgress(
    projectName: string,
    action: 'create_sprint' | 'update_sprint' | 'get_sprints' | 'get_timeline',
    sprintData?: any
  ): Promise<LegacyProgressResponse> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    const now = new Date().toISOString();

    switch (action) {
      case 'get_sprints': {
        // Return sprints from roadmap if available
        if (project.roadmap) {
          const allSprints = project.roadmap.roadmap_phases.flatMap(p => p.sprints);
          return {
            success: true,
            project_name: projectName,
            action,
            data: allSprints
          };
        }
        return {
          success: true,
          project_name: projectName,
          action,
          data: []
        };
      }

      case 'get_timeline': {
        // Generate timeline from roadmap if available
        if (project.roadmap) {
          const timeline = project.roadmap.roadmap_phases.map(phase => ({
            phase_name: phase.phase_name,
            status: phase.status,
            start_date: phase.start_date,
            end_date: phase.end_date,
            completion_percentage: phase.completion_percentage,
            sprints: phase.sprints
          }));
          return {
            success: true,
            project_name: projectName,
            action,
            data: timeline
          };
        }
        return {
          success: true,
          project_name: projectName,
          action,
          data: []
        };
      }

      case 'create_sprint':
      case 'update_sprint': {
        // These operations should now use the roadmap functions
        return {
          success: false,
          project_name: projectName,
          action,
          data: 'Please use the roadmap sprint functions for sprint management'
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async initializeProject(
    projectName: string,
    description?: string,
    teamComposition?: any,
    startPhase: number = 1
  ): Promise<LegacyInitResponse> {
    try {
      // Check if project already exists
      const existingProject = await this.db.getProject(projectName);
      if (existingProject) {
        throw new Error(`Project "${projectName}" already exists`);
      }

      const project = await this.db.createProject(projectName, description, teamComposition);

      // Log project initialization
      await this.db.logActivity({
        project_name: projectName,
        timestamp: new Date().toISOString(),
        actor: 'system',
        action: 'project_initialized',
        details: `Project initialized`,
        phase_number: startPhase
      });

      return {
        success: true,
        project_name: projectName,
        roadmap_created: false,
        message: `Project "${projectName}" initialized successfully. Use create_roadmap to set up the project roadmap.`
      };
    } catch (error) {
      return {
        success: false,
        project_name: projectName,
        roadmap_created: false,
        message: `Failed to initialize project: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}