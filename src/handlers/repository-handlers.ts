import { PDLDatabase } from '../storage/database.js';

/**
 * Repository-centric handlers for PDL operations
 * All operations are scoped to the current repository (Claude project)
 */
export class RepositoryHandlers {
  private db: PDLDatabase;

  constructor(database: PDLDatabase) {
    this.db = database;
  }

  // ==================== REPOSITORY OPERATIONS ====================

  async initializeRepository(args: {
    description?: string;
    team_composition?: any;
  }): Promise<any> {
    return this.db.initializeRepository(
      args.description,
      args.team_composition
    );
  }

  async getStatus(): Promise<any> {
    return this.db.getCurrentStatus();
  }

  async listRepositories(): Promise<any> {
    const repos = await this.db.listRepositories();
    return {
      success: true,
      repositories: repos,
      current: this.db.getCurrentRepositoryId()
    };
  }

  // ==================== ROADMAP OPERATIONS ====================

  async createRoadmap(args: {
    vision: string;
    phases: Array<{
      name: string;
      description: string;
      objective: string;
      deliverables?: string[];
      success_metrics?: string[];
    }>;
    milestones?: any[];
  }): Promise<any> {
    return this.db.createRoadmap(args.vision, args.phases);
  }

  async updateRoadmapPhase(args: {
    phase_id: string;
    updates: {
      status?: string;
      completion_percentage?: number;
      deliverables?: string[];
      success_metrics?: string[];
    };
  }): Promise<any> {
    // This would need to be implemented in the database class
    return {
      success: true,
      message: 'Roadmap phase update not yet implemented'
    };
  }

  // ==================== SPRINT OPERATIONS ====================

  async createSprint(args: {
    roadmap_phase_id: string;
    sprint_name: string;
    duration_days?: number;
  }): Promise<any> {
    return this.db.createSprint(
      args.roadmap_phase_id,
      args.sprint_name,
      args.duration_days || 14
    );
  }

  async updateSprintPDL(args: {
    sprint_id: string;
    pdl_phase_number: number;
    updates: {
      status?: string;
      completion_percentage?: number;
      deliverables?: string[];
      blockers?: string[];
      notes?: string;
    };
  }): Promise<any> {
    return this.db.updateSprintPDL(
      args.sprint_id,
      args.pdl_phase_number,
      args.updates
    );
  }

  async advancePDLPhase(args: {
    sprint_id: string;
    completion_notes?: string;
  }): Promise<any> {
    // Get current PDL phase and advance to next
    // This would need implementation in database class
    return {
      success: true,
      message: 'PDL phase advancement not yet implemented'
    };
  }

  // ==================== TASK OPERATIONS ====================

  async createTask(args: {
    sprint_id: string;
    pdl_phase_number: number;
    task_description: string;
    assignee?: string;
    story_points?: number;
  }): Promise<any> {
    return this.db.createTask(
      args.sprint_id,
      args.pdl_phase_number,
      args.task_description,
      args.assignee,
      args.story_points
    );
  }

  async updateTask(args: {
    task_id: string;
    status: 'todo' | 'in_progress' | 'done' | 'blocked';
  }): Promise<any> {
    return this.db.updateTaskStatus(args.task_id, args.status);
  }

  async bulkUpdateTasks(args: {
    updates: Array<{
      task_id: string;
      status: 'todo' | 'in_progress' | 'done' | 'blocked';
    }>;
  }): Promise<any> {
    const results = [];
    for (const update of args.updates) {
      const result = await this.db.updateTaskStatus(update.task_id, update.status);
      results.push(result);
    }
    return {
      success: true,
      updated: results.length,
      results
    };
  }

  // ==================== SUB-PROJECT OPERATIONS ====================

  async createSubproject(args: {
    name: string;
    description: string;
    related_sprint_id?: string;
    created_by?: string;
  }): Promise<any> {
    return this.db.createSubproject(
      args.name,
      args.description,
      args.related_sprint_id,
      args.created_by
    );
  }

  // ==================== LEGACY COMPATIBILITY ====================
  // These maintain compatibility with agents expecting old function names

  async initializeProject(args: {
    project_name: string;
    description?: string;
    team_composition?: any;
  }): Promise<any> {
    // Ignore project_name, use repository
    return this.initializeRepository({
      description: args.description,
      team_composition: args.team_composition
    });
  }

  async getPhase(args: {
    project_name: string;
    include_sprints?: boolean;
  }): Promise<any> {
    // Ignore project_name, use current repository
    const status = await this.db.getCurrentStatus();
    return {
      project_name: this.db.getCurrentRepositoryId(),
      current_phase: status.active_sprint?.current_pdl_phase || 1,
      roadmap_phases: status.roadmap_phases,
      active_sprint: status.active_sprint
    };
  }

  async updatePhase(args: {
    project_name: string;
    phase_number?: number;
    status?: string;
    completion_percentage?: number;
    notes?: string;
    transition_to_next?: boolean;
  }): Promise<any> {
    // This now updates the current PDL phase in the active sprint
    const currentStatus = await this.db.getCurrentStatus();
    if (!currentStatus.active_sprint) {
      throw new Error('No active sprint found');
    }

    return this.db.updateSprintPDL(
      currentStatus.active_sprint.sprint_id,
      args.phase_number || currentStatus.active_sprint.current_pdl_phase,
      {
        status: args.status,
        completion_percentage: args.completion_percentage,
        notes: args.notes
      }
    );
  }

  async listProjects(args: {
    include_details?: boolean;
  }): Promise<any> {
    // Now returns sub-projects within the repository
    return {
      success: true,
      repository: this.db.getCurrentRepositoryId(),
      message: 'Use listRepositories for cross-repo view'
    };
  }
}