import { Database } from '../storage/database.js';
import { v4 as uuidv4 } from 'uuid';
import { 
  Project, 
  Roadmap, 
  RoadmapPhase, 
  Sprint, 
  PDLPhase, 
  PhaseStatus,
  PDL_PHASE_NAMES 
} from '../models/types.js';

/**
 * Roadmap Manipulation Handler - Full CRUD operations for roadmap management
 * Provides insert, delete, update, and reorganize capabilities for phases, sprints, and tasks
 */
export class RoadmapManipulationHandler {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  // ==================== ROADMAP PHASE OPERATIONS ====================

  /**
   * Insert a new phase into the roadmap at a specific position
   */
  async insertRoadmapPhase(
    projectName: string,
    phase: {
      name: string;
      description: string;
      objective: string;
      duration_weeks: number;
      deliverables?: string[];
      success_metrics?: string[];
      position?: number; // If not provided, adds to end
    }
  ): Promise<any> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    if (!project.roadmap) {
      throw new Error(`Project "${projectName}" does not have a roadmap`);
    }

    const newPhase: RoadmapPhase = {
      roadmap_phase_id: uuidv4(),
      phase_name: phase.name,
      phase_description: phase.description,
      objective: phase.objective,
      deliverables: phase.deliverables || [],
      success_metrics: phase.success_metrics || [],
      status: 'not_started' as PhaseStatus,
      completion_percentage: 0,
      start_date: '',
      end_date: '',
      sprints: []
    };

    // Insert at specified position or end
    const position = phase.position ?? project.roadmap.roadmap_phases.length;
    project.roadmap.roadmap_phases.splice(position, 0, newPhase);

    // Recalculate dates for all phases
    this.recalculatePhaseDates(project.roadmap);

    await this.db.updateProject(projectName, { roadmap: project.roadmap });

    return {
      success: true,
      project_name: projectName,
      inserted_phase: newPhase,
      position: position,
      message: `Phase "${phase.name}" inserted at position ${position}`
    };
  }

  /**
   * Delete a phase from the roadmap
   */
  async deleteRoadmapPhase(
    projectName: string,
    phaseId: string,
    reassignSprints?: string // Optional: phase ID to move sprints to
  ): Promise<any> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    if (!project.roadmap) {
      throw new Error(`Project "${projectName}" does not have a roadmap`);
    }

    const phaseIndex = project.roadmap.roadmap_phases.findIndex(p => p.roadmap_phase_id === phaseId);
    if (phaseIndex === -1) {
      throw new Error(`Phase with ID "${phaseId}" not found`);
    }

    const deletedPhase = project.roadmap.roadmap_phases[phaseIndex];

    // Handle sprints reassignment if specified
    if (reassignSprints && deletedPhase.sprints.length > 0) {
      const targetPhase = project.roadmap.roadmap_phases.find(p => p.roadmap_phase_id === reassignSprints);
      if (targetPhase) {
        targetPhase.sprints.push(...deletedPhase.sprints);
      }
    }

    // Remove the phase
    project.roadmap.roadmap_phases.splice(phaseIndex, 1);

    // Recalculate dates
    this.recalculatePhaseDates(project.roadmap);

    await this.db.updateProject(projectName, { roadmap: project.roadmap });

    return {
      success: true,
      project_name: projectName,
      deleted_phase: deletedPhase.phase_name,
      sprints_reassigned: reassignSprints ? deletedPhase.sprints.length : 0,
      message: `Phase "${deletedPhase.phase_name}" deleted successfully`
    };
  }

  /**
   * Reorganize/reorder roadmap phases
   */
  async reorganizeRoadmapPhases(
    projectName: string,
    phaseOrder: string[] // Array of phase IDs in desired order
  ): Promise<any> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    if (!project.roadmap) {
      throw new Error(`Project "${projectName}" does not have a roadmap`);
    }

    // Create a map of phases
    const phaseMap = new Map<string, RoadmapPhase>();
    project.roadmap.roadmap_phases.forEach(phase => {
      phaseMap.set(phase.roadmap_phase_id, phase);
    });

    // Rebuild phases array in new order
    const reorderedPhases: RoadmapPhase[] = [];
    for (const phaseId of phaseOrder) {
      const phase = phaseMap.get(phaseId);
      if (phase) {
        reorderedPhases.push(phase);
      }
    }

    // Add any phases not in the order array (shouldn't happen, but safety)
    project.roadmap.roadmap_phases.forEach(phase => {
      if (!phaseOrder.includes(phase.roadmap_phase_id)) {
        reorderedPhases.push(phase);
      }
    });

    project.roadmap.roadmap_phases = reorderedPhases;

    // Recalculate dates
    this.recalculatePhaseDates(project.roadmap);

    await this.db.updateProject(projectName, { roadmap: project.roadmap });

    return {
      success: true,
      project_name: projectName,
      new_order: reorderedPhases.map(p => ({ id: p.roadmap_phase_id, name: p.phase_name })),
      message: 'Roadmap phases reorganized successfully'
    };
  }

  // ==================== SPRINT OPERATIONS ====================

  /**
   * Insert a new sprint into a roadmap phase
   */
  async insertSprint(
    projectName: string,
    phaseId: string,
    sprint: {
      sprint_name: string;
      duration_days?: number;
      position?: number; // Position within the phase
    }
  ): Promise<any> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    if (!project.roadmap) {
      throw new Error(`Project "${projectName}" does not have a roadmap`);
    }

    const phase = project.roadmap.roadmap_phases.find(p => p.roadmap_phase_id === phaseId);
    if (!phase) {
      throw new Error(`Phase with ID "${phaseId}" not found`);
    }

    const newSprint: Sprint = {
      sprint_id: uuidv4(),
      sprint_name: sprint.sprint_name,
      sprint_number: phase.sprints.length + 1,
      roadmap_phase_id: phaseId,
      start_date: new Date().toISOString(),
      end_date: '',
      status: 'planning' as any,
      pdl_cycles: [],
      velocity: 0,
      burn_down: [],
      retrospective: ''
    };

    // Insert at specified position or end
    const position = sprint.position ?? phase.sprints.length;
    phase.sprints.splice(position, 0, newSprint);

    // Renumber sprints
    phase.sprints.forEach((s, index) => {
      s.sprint_number = index + 1;
    });

    await this.db.updateProject(projectName, { roadmap: project.roadmap });

    return {
      success: true,
      project_name: projectName,
      phase_name: phase.phase_name,
      inserted_sprint: newSprint,
      position: position,
      message: `Sprint "${sprint.sprint_name}" inserted in phase "${phase.phase_name}"`
    };
  }

  /**
   * Delete a sprint from a roadmap phase
   */
  async deleteSprint(
    projectName: string,
    sprintId: string,
    reassignTasks?: string // Optional: sprint ID to move tasks to
  ): Promise<any> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    if (!project.roadmap) {
      throw new Error(`Project "${projectName}" does not have a roadmap`);
    }

    let foundPhase: RoadmapPhase | null = null;
    let sprintIndex = -1;

    // Find the sprint in any phase
    for (const phase of project.roadmap.roadmap_phases) {
      const index = phase.sprints.findIndex(s => s.sprint_id === sprintId);
      if (index !== -1) {
        foundPhase = phase;
        sprintIndex = index;
        break;
      }
    }

    if (!foundPhase || sprintIndex === -1) {
      throw new Error(`Sprint with ID "${sprintId}" not found`);
    }

    const deletedSprint = foundPhase.sprints[sprintIndex];

    // Note: Task reassignment would need to be handled at PDL cycle level
    // This is a simplified version - real implementation would need to handle PDL cycles

    // Remove the sprint
    foundPhase.sprints.splice(sprintIndex, 1);

    // Renumber remaining sprints
    foundPhase.sprints.forEach((s, index) => {
      s.sprint_number = index + 1;
    });

    await this.db.updateProject(projectName, { roadmap: project.roadmap });

    return {
      success: true,
      project_name: projectName,
      deleted_sprint: deletedSprint.sprint_name,
      tasks_reassigned: 0, // Would need PDL cycle inspection
      message: `Sprint "${deletedSprint.sprint_name}" deleted successfully`
    };
  }

  /**
   * Reorganize sprints within or across phases
   */
  async reorganizeSprints(
    projectName: string,
    movements: Array<{
      sprint_id: string;
      target_phase_id: string;
      position: number;
    }>
  ): Promise<any> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    if (!project.roadmap) {
      throw new Error(`Project "${projectName}" does not have a roadmap`);
    }

    const movedSprints: any[] = [];

    // Process each movement
    for (const move of movements) {
      // Find and remove sprint from current location
      let sprint: Sprint | null = null;
      for (const phase of project.roadmap.roadmap_phases) {
        const index = phase.sprints.findIndex(s => s.sprint_id === move.sprint_id);
        if (index !== -1) {
          sprint = phase.sprints.splice(index, 1)[0];
          break;
        }
      }

      if (!sprint) {
        continue; // Skip if sprint not found
      }

      // Find target phase
      const targetPhase = project.roadmap.roadmap_phases.find(p => p.phase_id === move.target_phase_id);
      if (!targetPhase) {
        continue; // Skip if target phase not found
      }

      // Update sprint's phase reference
      sprint.roadmap_phase_id = move.target_phase_id;

      // Insert at new position
      targetPhase.sprints.splice(move.position, 0, sprint);

      movedSprints.push({
        sprint_name: sprint.sprint_name,
        new_phase: targetPhase.phase_name,
        new_position: move.position
      });
    }

    // Renumber all sprints in affected phases
    for (const phase of project.roadmap.roadmap_phases) {
      phase.sprints.forEach((s, index) => {
        s.sprint_number = index + 1;
      });
    }

    await this.db.updateProject(projectName, { roadmap: project.roadmap });

    return {
      success: true,
      project_name: projectName,
      moved_sprints: movedSprints,
      message: `Reorganized ${movedSprints.length} sprints successfully`
    };
  }

  // Task operations removed - tasks are managed within PDL cycles, not directly on sprints
  // Agents should use the existing PDL phase update functions for task management

  // ==================== HELPER FUNCTIONS ====================

  private recalculatePhaseDates(roadmap: Roadmap): void {
    let currentDate = new Date();
    
    for (const phase of roadmap.roadmap_phases) {
      if (phase.status === 'completed' && phase.end_date) {
        // Skip completed phases, use their end date as reference
        currentDate = new Date(phase.end_date);
      } else {
        // Calculate dates for non-completed phases
        phase.start_date = currentDate.toISOString();
        const endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + (phase.duration_weeks * 7));
        phase.end_date = endDate.toISOString();
        currentDate = endDate;
      }
    }
  }

  private initializePDLPhases(): PDLPhase[] {
    return Array.from({ length: 7 }, (_, i) => ({
      phase_number: i + 1,
      phase_name: PDL_PHASE_NAMES[i + 1],
      status: 'not_started' as PhaseStatus,
      completion_percentage: 0,
      tasks: [],
      blockers: [],
      notes: ''
    }));
  }
}