import { Database } from './database.js';
import { CentralizedDatabase } from './centralized-database.js';

/**
 * Database adapter that wraps either local or centralized database
 * to provide a consistent interface for the handlers
 */
export class DatabaseAdapter {
  private wrappedDb: Database | CentralizedDatabase;

  constructor(db: Database | CentralizedDatabase) {
    this.wrappedDb = db;
  }

  // Forward all database methods with proper signatures
  async createProject(projectName: string, description?: string, teamComposition?: any): Promise<any> {
    return this.wrappedDb.createProject(projectName, description, teamComposition);
  }

  async getProject(projectName: string): Promise<any | null> {
    return this.wrappedDb.getProject(projectName);
  }

  async updateProject(projectNameOrProject: string | any, updates?: any): Promise<boolean> {
    if (this.wrappedDb instanceof CentralizedDatabase) {
      // CentralizedDatabase expects (projectName, updates)
      if (typeof projectNameOrProject === 'string') {
        return this.wrappedDb.updateProject(projectNameOrProject, updates);
      } else {
        // Convert project object to updates format
        return this.wrappedDb.updateProject(projectNameOrProject.project_name, {
          description: projectNameOrProject.description,
          team_composition: projectNameOrProject.team_composition,
          roadmap: projectNameOrProject.roadmap
        });
      }
    } else {
      // Original Database expects (projectName, updates)
      if (typeof projectNameOrProject === 'string') {
        return this.wrappedDb.updateProject(projectNameOrProject, updates);
      } else {
        // Extract project name and convert to updates
        return this.wrappedDb.updateProject(projectNameOrProject.project_name, {
          description: projectNameOrProject.description,
          team_composition: projectNameOrProject.team_composition,
          roadmap: projectNameOrProject.roadmap
        });
      }
    }
  }

  async getAllProjects(): Promise<any[]> {
    return this.wrappedDb.getAllProjects();
  }

  async getProjectPhases(projectName: string): Promise<any[]> {
    if (this.wrappedDb instanceof CentralizedDatabase) {
      return this.wrappedDb.getProjectPhases(projectName);
    } else {
      // For original Database, get project and extract phases
      const project = await this.wrappedDb.getProject(projectName);
      return (project as any)?.phases || [];
    }
  }

  async updatePhase(projectName: string, phaseNumber: number, phaseData: any): Promise<void> {
    if (this.wrappedDb instanceof CentralizedDatabase) {
      return this.wrappedDb.updatePhase(projectName, phaseNumber, phaseData);
    } else {
      // For original Database, we need to implement phase update
      // This is a simplified version - in practice you'd want full implementation
      const project = await this.wrappedDb.getProject(projectName);
      if (project && (project as any).phases) {
        const phase = (project as any).phases.find((p: any) => p.phase_number === phaseNumber);
        if (phase) {
          Object.assign(phase, phaseData);
          await this.wrappedDb.updateProject(projectName, { phases: (project as any).phases } as any);
        }
      }
    }
  }

  async createSprint(sprint: any): Promise<void> {
    if (this.wrappedDb instanceof CentralizedDatabase) {
      return this.wrappedDb.createSprint(sprint);
    } else {
      // For original Database, store sprint in project data
      const project = await this.wrappedDb.getProject(sprint.project_name);
      if (project) {
        (project as any).sprints = (project as any).sprints || [];
        (project as any).sprints.push(sprint);
        await this.wrappedDb.updateProject(sprint.project_name, { sprints: (project as any).sprints } as any);
      }
    }
  }

  async updateSprint(sprintId: string, sprintData: any): Promise<void> {
    if (this.wrappedDb instanceof CentralizedDatabase) {
      return this.wrappedDb.updateSprint(sprintId, sprintData);
    } else {
      // For original Database, find and update sprint in project data
      const projects = await this.getAllProjects();
      for (const projectName of projects) {
        const project = await this.wrappedDb.getProject(projectName);
        if (project && (project as any).sprints) {
          const sprint = (project as any).sprints.find((s: any) => s.sprint_id === sprintId);
          if (sprint) {
            Object.assign(sprint, sprintData);
            await this.wrappedDb.updateProject(projectName, { sprints: (project as any).sprints } as any);
            return;
          }
        }
      }
    }
  }

  async getSprints(projectName: string): Promise<any[]> {
    if (this.wrappedDb instanceof CentralizedDatabase) {
      return this.wrappedDb.getSprints(projectName);
    } else {
      // For original Database, get sprints from project data
      const project = await this.wrappedDb.getProject(projectName);
      return (project as any)?.sprints || [];
    }
  }

  async logActivity(entry: any): Promise<void> {
    if (this.wrappedDb instanceof CentralizedDatabase) {
      return this.wrappedDb.logActivity(entry);
    } else {
      // For original Database, add to project activity log
      const project = await this.wrappedDb.getProject(entry.project_name);
      if (project) {
        (project as any).activity_log = (project as any).activity_log || [];
        (project as any).activity_log.push(entry);
        await this.wrappedDb.updateProject(entry.project_name, { activity_log: (project as any).activity_log } as any);
      }
    }
  }

  close(): void {
    this.wrappedDb.close();
  }

  // Expose the underlying database for type-specific operations
  getUnderlyingDatabase(): Database | CentralizedDatabase {
    return this.wrappedDb;
  }

  isCentralized(): boolean {
    return this.wrappedDb instanceof CentralizedDatabase;
  }
}