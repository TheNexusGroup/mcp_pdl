export interface Project {
  project_name: string;
  description: string;
  created_at: string;
  updated_at: string;
  team_composition: TeamComposition;
  roadmap: Roadmap;
  activity_log: ActivityLogEntry[];
}

export interface Roadmap {
  roadmap_id: string;
  project_name: string;
  vision: string;
  timeline_start: string;
  timeline_end: string;
  roadmap_phases: RoadmapPhase[];
  milestones: Milestone[];
  overall_progress: number;
}

export interface RoadmapPhase {
  roadmap_phase_id: string;
  phase_name: string;
  phase_description: string;
  objective: string;
  start_date: string;
  end_date: string;
  status: PhaseStatus;
  completion_percentage: number;
  sprints: Sprint[];
  deliverables: string[];
  success_metrics: string[];
}

export interface Milestone {
  milestone_id: string;
  name: string;
  description: string;
  target_date: string;
  achieved_date?: string;
  roadmap_phase_id: string;
  status: 'pending' | 'achieved' | 'missed';
}

export interface TeamComposition {
  product_manager?: string | string[];
  product_designer?: string | string[];
  engineering_manager?: string;
  engineers?: string[];
  qa_engineers?: string[];
  marketing_manager?: string;
  sales_support?: string[];
}

export interface PDLPhase {
  pdl_phase_number: number;
  pdl_phase_name: string;
  status: PhaseStatus;
  start_date: string | null;
  end_date: string | null;
  primary_driver: string;
  completion_percentage: number;
  key_activities: string[];
  deliverables: string[];
  blockers: string[];
  notes: string;
}

export interface Sprint {
  sprint_id: string;
  sprint_name: string;
  sprint_number: number;
  roadmap_phase_id: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  pdl_cycles: PDLCycle[];
  velocity: number;
  burn_down: number[];
  retrospective: string;
}

export interface PDLCycle {
  cycle_id: string;
  sprint_id: string;
  cycle_number: number;
  current_pdl_phase: PDLPhase;
  pdl_phases: Record<string, PDLPhase>;
  start_date: string;
  end_date?: string;
  cycle_velocity: number;
  tasks: Task[];
}

export interface Task {
  task_id: string;
  description: string;
  assignee: string;
  status: TaskStatus;
  story_points: number;
}

export interface ActivityLogEntry {
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  phase_number?: number;
  sprint_id?: string;
}

export type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';
export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export const PDL_PHASE_NAMES: Record<number, string> = {
  1: 'Discovery & Ideation',
  2: 'Definition & Scoping', 
  3: 'Design & Prototyping',
  4: 'Development & Implementation',
  5: 'Testing & Quality Assurance',
  6: 'Launch & Deployment',
  7: 'Post-Launch: Growth & Iteration'
};

export const PDL_PHASE_PRIMARY_DRIVERS: Record<number, string> = {
  1: 'Product Manager',
  2: 'Product Manager',
  3: 'Product Designer',
  4: 'Engineering Manager',
  5: 'QA Engineers',
  6: 'Engineering Manager',
  7: 'Product Manager'
};

export const PDL_PHASE_KEY_ACTIVITIES: Record<number, string[]> = {
  1: ['Research', 'User interviews', 'Market analysis', 'Ideation workshops'],
  2: ['Requirements gathering', 'Scoping', 'Technical feasibility', 'Resource planning'],
  3: ['Wireframing', 'Prototyping', 'User testing', 'Design iterations'],
  4: ['Coding', 'Code reviews', 'Integration', 'Documentation'],
  5: ['Test planning', 'Test execution', 'Bug tracking', 'Performance testing'],
  6: ['Deployment prep', 'Release notes', 'Go-live', 'Monitoring setup'],
  7: ['Metrics analysis', 'User feedback', 'Optimization', 'Feature planning']
};

export interface GetRoadmapResponse {
  project_name: string;
  roadmap: Roadmap;
  current_phase?: RoadmapPhase;
  current_sprint?: Sprint;
  current_pdl_cycle?: PDLCycle;
}

export interface UpdateRoadmapPhaseResponse {
  success: boolean;
  project_name: string;
  updated_phase: {
    roadmap_phase_id: string;
    phase_name: string;
    status: PhaseStatus;
    completion_percentage: number;
  };
  message: string;
}

export interface UpdateSprintPDLResponse {
  success: boolean;
  sprint_id: string;
  pdl_cycle_id: string;
  current_pdl_phase: number;
  message: string;
}

export interface TrackProgressResponse {
  success: boolean;
  project_name: string;
  action: string;
  data: any;
}

export interface CreateRoadmapResponse {
  success: boolean;
  project_name: string;
  roadmap: Roadmap;
  message: string;
}

export interface CreateSprintResponse {
  success: boolean;
  sprint: Sprint;
  message: string;
}

export interface AdvancePDLCycleResponse {
  success: boolean;
  pdl_cycle: PDLCycle;
  message: string;
}

export interface InitializeProjectResponse {
  success: boolean;
  project_name: string;
  roadmap_created: boolean;
  message: string;
}