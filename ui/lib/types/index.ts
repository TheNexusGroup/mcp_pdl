// Re-export all types from pdl-types
export * from './pdl-types'

// Legacy types for compatibility
export interface Project {
  project_name: string
  description: string
  created_at: string
  updated_at: string
  team_composition: any
  roadmap?: any
  activity_log: any[]
}

export interface Roadmap {
  roadmap_id: string
  project_name: string
  vision: string
  timeline_start: string
  timeline_end: string
  roadmap_phases: any[]
  milestones: any[]
  overall_progress: number
}

export interface Sprint {
  sprint_id: string
  sprint_name: string
  sprint_number: number
  roadmap_phase_id: string
  start_date: string
  end_date: string
  status: string
  pdl_cycles: any[]
  velocity: number
  burn_down: number[]
  retrospective: string
}

export interface ActivityLogEntry {
  timestamp: string
  actor: string
  action: string
  details: string
  phase_number?: number
  sprint_id?: string
}