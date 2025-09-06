import { PDLDatabase } from '../storage/database.js';

/**
 * Repository-centric handlers with clean terminology
 * - Projects (what agents work on)
 * - Phases (iterations within projects)  
 * - Steps (7 PDL steps within phases)
 * - Tasks (work items within steps)
 * - Documentation (docs created during work)
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
    return this.db.listRepositories();
  }

  async getMetadata(args: {
    params?: { [key: string]: any };
  }): Promise<any> {
    return this.db.getMetadata(args.params);
  }

  // ==================== PROJECT OPERATIONS ====================

  async createProject(args: {
    project_name: string;
    description: string;
    objective: string;
  }): Promise<any> {
    return this.db.createProject(
      args.project_name,
      args.description,
      args.objective
    );
  }

  async listProjects(args: {
    repository_id?: string;
    search?: string;
  }): Promise<any> {
    return this.db.listProjects(args.repository_id, args.search);
  }

  // ==================== PHASE OPERATIONS ====================

  async createPhase(args: {
    project_id: string;
    phase_name: string;
    duration_days?: number;
  }): Promise<any> {
    return this.db.createPhase(
      args.project_id,
      args.phase_name,
      args.duration_days || 14
    );
  }

  async listPhases(args: {
    project_id?: string;
    search?: string;
  }): Promise<any> {
    return this.db.listPhases(args.project_id, args.search);
  }

  // ==================== STEP OPERATIONS ====================

  async updateStep(args: {
    phase_id: string;
    step_number: number;
    updates: {
      status?: string;
      completion_percentage?: number;
      deliverables?: string[];
      blockers?: string[];
      notes?: string;
    };
  }): Promise<any> {
    return this.db.updateStep(
      args.phase_id,
      args.step_number,
      args.updates
    );
  }

  async listSteps(args: {
    phase_id?: string;
    search?: string;
  }): Promise<any> {
    return this.db.listSteps(args.phase_id, args.search);
  }

  // ==================== TASK OPERATIONS ====================

  async createTask(args: {
    phase_id: string;
    step_number: number;
    task_description: string;
    assignee?: string;
    story_points?: number;
  }): Promise<any> {
    return this.db.createTask(
      args.phase_id,
      args.step_number,
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

  async listTasks(args: {
    phase_id?: string;
    step_number?: number;
    search?: string;
  }): Promise<any> {
    return this.db.listTasks(args.phase_id, args.step_number, args.search);
  }

  // ==================== DOCUMENTATION OPERATIONS ====================

  async createDocumentation(args: {
    name: string;
    path: string;
    summary_brief?: string;
    creating_agent?: string;
    project_id?: string;
    phase_id?: string;
    task_id?: string;
  }): Promise<any> {
    return this.db.createDocumentation(args);
  }

  async listDocumentation(args: {
    project_id?: string;
    phase_id?: string;
    search?: string;
  }): Promise<any> {
    return this.db.listDocumentation(args.project_id, args.phase_id, args.search);
  }

  // ==================== LEGACY COMPATIBILITY ====================
  // These maintain compatibility with agents expecting old function names

  async initializeProject(args: {
    project_name: string;
    description?: string;
    team_composition?: any;
  }): Promise<any> {
    // Initialize repository first if needed
    await this.initializeRepository({
      description: args.description,
      team_composition: args.team_composition
    });
    
    // Then create a project with the given name
    return this.createProject({
      project_name: args.project_name,
      description: args.description || '',
      objective: args.description || ''
    });
  }

  async createRoadmap(args: {
    vision: string;
    phases: Array<{
      name: string;
      description: string;
      objective: string;
      deliverables?: string[];
      success_metrics?: string[];
    }>;
  }): Promise<any> {
    // Create projects from the old "roadmap phases"
    const results = [];
    for (const phase of args.phases) {
      const result = await this.createProject({
        project_name: phase.name,
        description: phase.description,
        objective: phase.objective
      });
      results.push(result);
    }
    
    return {
      success: true,
      projects_created: results.length,
      message: `Created ${results.length} projects`
    };
  }

  async createSprint(args: {
    roadmap_phase_id: string;
    sprint_name: string;
    duration_days?: number;
  }): Promise<any> {
    // Map old sprint creation to phase creation
    return this.createPhase({
      project_id: args.roadmap_phase_id,
      phase_name: args.sprint_name,
      duration_days: args.duration_days
    });
  }

  async updateSprintPDL(args: {
    sprint_id: string;
    pdl_phase_number: number;
    updates: any;
  }): Promise<any> {
    // Map old PDL phase update to step update
    return this.updateStep({
      phase_id: args.sprint_id,
      step_number: args.pdl_phase_number,
      updates: args.updates
    });
  }

  async updatePhase(args: {
    project_name: string;
    phase_number?: number;
    status?: string;
    completion_percentage?: number;
    notes?: string;
  }): Promise<any> {
    // Get current status to find active phase
    const currentStatus = await this.db.getCurrentStatus();
    if (!currentStatus.active_phase) {
      throw new Error('No active phase found');
    }

    return this.updateStep({
      phase_id: currentStatus.active_phase.phase_id,
      step_number: args.phase_number || currentStatus.active_phase.current_step,
      updates: {
        status: args.status,
        completion_percentage: args.completion_percentage,
        notes: args.notes
      }
    });
  }

  async getPhase(args: {
    project_name: string;
    include_sprints?: boolean;
  }): Promise<any> {
    const status = await this.db.getCurrentStatus();
    return {
      project_name: args.project_name,
      current_phase: status.active_phase?.current_step || 1,
      projects: status.projects,
      active_phase: status.active_phase
    };
  }
}