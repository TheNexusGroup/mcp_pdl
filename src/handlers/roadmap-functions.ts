import { Database } from '../storage/database.js';
import { 
  Roadmap,
  RoadmapPhase,
  Sprint,
  PDLCycle,
  PDLPhase,
  Milestone,
  Task,
  GetRoadmapResponse,
  CreateRoadmapResponse,
  UpdateRoadmapPhaseResponse,
  CreateSprintResponse,
  UpdateSprintPDLResponse,
  AdvancePDLCycleResponse,
  PDL_PHASE_NAMES,
  PDL_PHASE_PRIMARY_DRIVERS,
  PDL_PHASE_KEY_ACTIVITIES,
  PhaseStatus,
  SprintStatus
} from '../models/types.js';
import { v4 as uuidv4 } from 'uuid';

export class RoadmapFunctionHandlers {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async createRoadmap(
    projectName: string,
    vision: string,
    phases: Array<{
      name: string;
      description: string;
      objective: string;
      duration_weeks: number;
      deliverables: string[];
      success_metrics: string[];
    }>,
    milestones?: Array<{
      name: string;
      description: string;
      phase_index: number;
      weeks_into_phase: number;
    }>
  ): Promise<CreateRoadmapResponse> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    const now = new Date();
    const roadmapPhases: RoadmapPhase[] = [];
    let currentDate = new Date(now);

    // Create roadmap phases
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const phaseStartDate = new Date(currentDate);
      const phaseEndDate = new Date(currentDate);
      phaseEndDate.setDate(phaseEndDate.getDate() + (phase.duration_weeks * 7));

      roadmapPhases.push({
        roadmap_phase_id: uuidv4(),
        phase_name: phase.name,
        phase_description: phase.description,
        objective: phase.objective,
        start_date: phaseStartDate.toISOString(),
        end_date: phaseEndDate.toISOString(),
        status: i === 0 ? 'in_progress' : 'not_started',
        completion_percentage: 0,
        sprints: [],
        deliverables: phase.deliverables,
        success_metrics: phase.success_metrics
      });

      currentDate = phaseEndDate;
    }

    // Create milestones
    const roadmapMilestones: Milestone[] = [];
    if (milestones) {
      for (const milestone of milestones) {
        const phase = roadmapPhases[milestone.phase_index];
        if (phase) {
          const milestoneDate = new Date(phase.start_date);
          milestoneDate.setDate(milestoneDate.getDate() + (milestone.weeks_into_phase * 7));

          roadmapMilestones.push({
            milestone_id: uuidv4(),
            name: milestone.name,
            description: milestone.description,
            target_date: milestoneDate.toISOString(),
            roadmap_phase_id: phase.roadmap_phase_id,
            status: 'pending'
          });
        }
      }
    }

    const roadmap: Roadmap = {
      roadmap_id: uuidv4(),
      project_name: projectName,
      vision,
      timeline_start: roadmapPhases[0].start_date,
      timeline_end: roadmapPhases[roadmapPhases.length - 1].end_date,
      roadmap_phases: roadmapPhases,
      milestones: roadmapMilestones,
      overall_progress: 0
    };

    await this.db.updateProject(projectName, { roadmap });

    await this.db.logActivity({
      project_name: projectName,
      timestamp: now.toISOString(),
      actor: 'system',
      action: 'roadmap_created',
      details: `Roadmap created with ${roadmapPhases.length} phases and ${roadmapMilestones.length} milestones`
    });

    return {
      success: true,
      project_name: projectName,
      roadmap,
      message: `Roadmap created with ${roadmapPhases.length} phases`
    };
  }

  async createSprint(
    projectName: string,
    roadmapPhaseId: string,
    sprintName: string,
    sprintNumber: number,
    durationDays: number = 14
  ): Promise<CreateSprintResponse> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    const phase = project.roadmap?.roadmap_phases.find(p => p.roadmap_phase_id === roadmapPhaseId);
    if (!phase) {
      throw new Error(`Roadmap phase "${roadmapPhaseId}" not found`);
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + durationDays);

    // Create initial PDL cycle for the sprint
    const initialPDLCycle = this.createInitialPDLCycle();

    const sprint: Sprint = {
      sprint_id: uuidv4(),
      sprint_name: sprintName,
      sprint_number: sprintNumber,
      roadmap_phase_id: roadmapPhaseId,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      status: 'planning',
      pdl_cycles: [initialPDLCycle],
      velocity: 0,
      burn_down: [],
      retrospective: ''
    };

    // Add sprint to phase
    phase.sprints.push(sprint);
    await this.db.updateProject(projectName, { roadmap: project.roadmap });

    await this.db.logActivity({
      project_name: projectName,
      timestamp: now.toISOString(),
      actor: 'system',
      action: 'sprint_created',
      details: `Sprint "${sprintName}" created in phase "${phase.phase_name}" with initial PDL cycle`,
      sprint_id: sprint.sprint_id
    });

    return {
      success: true,
      sprint,
      message: `Sprint "${sprintName}" created with initial PDL cycle`
    };
  }

  async advancePDLCycle(
    projectName: string,
    sprintId: string,
    completionNotes?: string
  ): Promise<AdvancePDLCycleResponse> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    let targetSprint: Sprint | undefined;
    let targetPhase: RoadmapPhase | undefined;

    for (const phase of project.roadmap?.roadmap_phases || []) {
      const sprint = phase.sprints.find(s => s.sprint_id === sprintId);
      if (sprint) {
        targetSprint = sprint;
        targetPhase = phase;
        break;
      }
    }

    if (!targetSprint || !targetPhase) {
      throw new Error(`Sprint "${sprintId}" not found`);
    }

    const currentCycle = targetSprint.pdl_cycles[targetSprint.pdl_cycles.length - 1];
    const currentPhaseNum = currentCycle.current_pdl_phase.pdl_phase_number;

    if (currentPhaseNum < 7) {
      // Advance to next PDL phase within the same cycle
      const nextPhaseNum = currentPhaseNum + 1;
      currentCycle.pdl_phases[currentPhaseNum.toString()].status = 'completed';
      currentCycle.pdl_phases[currentPhaseNum.toString()].completion_percentage = 100;
      currentCycle.pdl_phases[currentPhaseNum.toString()].end_date = new Date().toISOString();

      currentCycle.pdl_phases[nextPhaseNum.toString()].status = 'in_progress';
      currentCycle.pdl_phases[nextPhaseNum.toString()].start_date = new Date().toISOString();
      currentCycle.current_pdl_phase = currentCycle.pdl_phases[nextPhaseNum.toString()];

      await this.db.updateProject(projectName, { roadmap: project.roadmap });

      return {
        success: true,
        pdl_cycle: currentCycle,
        message: `Advanced to PDL phase ${nextPhaseNum}: ${PDL_PHASE_NAMES[nextPhaseNum]}`
      };
    } else {
      // Complete current cycle and optionally start a new one
      currentCycle.pdl_phases[7].status = 'completed';
      currentCycle.pdl_phases[7].completion_percentage = 100;
      currentCycle.pdl_phases[7].end_date = new Date().toISOString();
      currentCycle.end_date = new Date().toISOString();

      // Create a new PDL cycle if sprint is still active
      if (targetSprint.status === 'active') {
        const newCycle = this.createInitialPDLCycle(targetSprint.sprint_id, targetSprint.pdl_cycles.length + 1);
        targetSprint.pdl_cycles.push(newCycle);
        await this.db.updateProject(projectName, { roadmap: project.roadmap });

        return {
          success: true,
          pdl_cycle: newCycle,
          message: `Completed PDL cycle ${currentCycle.cycle_number} and started new cycle ${newCycle.cycle_number}`
        };
      } else {
        await this.db.updateProject(projectName, { roadmap: project.roadmap });

        return {
          success: true,
          pdl_cycle: currentCycle,
          message: `Completed final PDL cycle ${currentCycle.cycle_number} for sprint`
        };
      }
    }
  }

  async updateSprintPDL(
    projectName: string,
    sprintId: string,
    pdlPhaseNumber: number,
    updates: {
      status?: PhaseStatus;
      completion_percentage?: number;
      tasks?: Task[];
      blockers?: string[];
      notes?: string;
    }
  ): Promise<UpdateSprintPDLResponse> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    let targetSprint: Sprint | undefined;
    for (const phase of project.roadmap?.roadmap_phases || []) {
      const sprint = phase.sprints.find(s => s.sprint_id === sprintId);
      if (sprint) {
        targetSprint = sprint;
        break;
      }
    }

    if (!targetSprint) {
      throw new Error(`Sprint "${sprintId}" not found`);
    }

    const currentCycle = targetSprint.pdl_cycles[targetSprint.pdl_cycles.length - 1];
    const pdlPhase = currentCycle.pdl_phases[pdlPhaseNumber.toString()];

    if (!pdlPhase) {
      throw new Error(`PDL phase ${pdlPhaseNumber} not found in current cycle`);
    }

    // Apply updates
    if (updates.status !== undefined) pdlPhase.status = updates.status;
    if (updates.completion_percentage !== undefined) pdlPhase.completion_percentage = updates.completion_percentage;
    if (updates.blockers) pdlPhase.blockers = updates.blockers;
    if (updates.notes) pdlPhase.notes = updates.notes;
    if (updates.tasks) currentCycle.tasks = [...currentCycle.tasks, ...updates.tasks];

    await this.db.updateProject(projectName, { roadmap: project.roadmap });

    await this.db.logActivity({
      project_name: projectName,
      timestamp: new Date().toISOString(),
      actor: 'system',
      action: 'sprint_pdl_updated',
      details: `Updated PDL phase ${pdlPhaseNumber} in sprint "${targetSprint.sprint_name}"`,
      sprint_id: sprintId
    });

    return {
      success: true,
      sprint_id: sprintId,
      pdl_cycle_id: currentCycle.cycle_id,
      current_pdl_phase: pdlPhaseNumber,
      message: `Updated PDL phase ${pdlPhaseNumber}: ${PDL_PHASE_NAMES[pdlPhaseNumber]}`
    };
  }

  async getRoadmap(
    projectName: string,
    includeDetails: boolean = true
  ): Promise<GetRoadmapResponse> {
    const project = await this.db.getProject(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }

    if (!project.roadmap) {
      throw new Error(`Project "${projectName}" does not have a roadmap`);
    }

    const response: GetRoadmapResponse = {
      project_name: projectName,
      roadmap: project.roadmap
    };

    if (includeDetails) {
      // Find current active phase
      const currentPhase = project.roadmap.roadmap_phases.find(p => p.status === 'in_progress');
      if (currentPhase) {
        response.current_phase = currentPhase;

        // Find active sprint in current phase
        const activeSprint = currentPhase.sprints.find(s => s.status === 'active');
        if (activeSprint) {
          response.current_sprint = activeSprint;

          // Get current PDL cycle
          const currentCycle = activeSprint.pdl_cycles[activeSprint.pdl_cycles.length - 1];
          if (currentCycle) {
            response.current_pdl_cycle = currentCycle;
          }
        }
      }
    }

    return response;
  }

  async updateRoadmapPhase(
    projectName: string,
    roadmapPhaseId: string,
    updates: {
      status?: PhaseStatus;
      completion_percentage?: number;
      deliverables?: string[];
      success_metrics?: string[];
    }
  ): Promise<UpdateRoadmapPhaseResponse> {
    const project = await this.db.getProject(projectName);
    if (!project || !project.roadmap) {
      throw new Error(`Project "${projectName}" or its roadmap not found`);
    }

    const phase = project.roadmap.roadmap_phases.find(p => p.roadmap_phase_id === roadmapPhaseId);
    if (!phase) {
      throw new Error(`Roadmap phase "${roadmapPhaseId}" not found`);
    }

    // Apply updates
    if (updates.status !== undefined) phase.status = updates.status;
    if (updates.completion_percentage !== undefined) phase.completion_percentage = updates.completion_percentage;
    if (updates.deliverables) phase.deliverables = updates.deliverables;
    if (updates.success_metrics) phase.success_metrics = updates.success_metrics;

    // Update overall roadmap progress
    const totalPhases = project.roadmap.roadmap_phases.length;
    const totalProgress = project.roadmap.roadmap_phases.reduce((sum, p) => sum + p.completion_percentage, 0);
    project.roadmap.overall_progress = Math.round(totalProgress / totalPhases);

    await this.db.updateProject(projectName, { roadmap: project.roadmap });

    return {
      success: true,
      project_name: projectName,
      updated_phase: {
        roadmap_phase_id: phase.roadmap_phase_id,
        phase_name: phase.phase_name,
        status: phase.status,
        completion_percentage: phase.completion_percentage
      },
      message: `Updated roadmap phase "${phase.phase_name}"`
    };
  }

  private createInitialPDLCycle(sprintId?: string, cycleNumber: number = 1): PDLCycle {
    const now = new Date().toISOString();
    const pdlPhases: Record<string, PDLPhase> = {};

    for (let i = 1; i <= 7; i++) {
      pdlPhases[i.toString()] = {
        pdl_phase_number: i,
        pdl_phase_name: PDL_PHASE_NAMES[i],
        status: i === 1 ? 'in_progress' : 'not_started',
        start_date: i === 1 ? now : null,
        end_date: null,
        primary_driver: PDL_PHASE_PRIMARY_DRIVERS[i],
        completion_percentage: 0,
        key_activities: PDL_PHASE_KEY_ACTIVITIES[i],
        deliverables: [],
        blockers: [],
        notes: ''
      };
    }

    return {
      cycle_id: uuidv4(),
      sprint_id: sprintId || '',
      cycle_number: cycleNumber,
      current_pdl_phase: pdlPhases['1'],
      pdl_phases: pdlPhases,
      start_date: now,
      cycle_velocity: 0,
      tasks: []
    };
  }
}