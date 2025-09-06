import { StateCreator } from 'zustand'
import { Project, GetRoadmapResponse, PDLLogEntry, ActivityLogEntry, ProjectListItem, DashboardStats } from '../types/pdl-types'
import { getMCPClient } from '../services/mcp-client'

export interface ProjectState {
  projects: Project[]
  projectsList: ProjectListItem[]
  selectedProject: Project | null
  selectedProjectName: string | null
  currentRoadmap: GetRoadmapResponse | null
  sessionLogs: PDLLogEntry[]
  dashboardStats: DashboardStats
  loading: boolean
  error: string | null
}

export interface ProjectActions {
  // Project management
  addProject: (project: Project) => void
  updateProject: (projectName: string, updates: Partial<Project>) => void
  deleteProject: (projectName: string) => void
  setSelectedProject: (project: Project | null) => void
  setSelectedProjectByName: (projectName: string) => void
  
  // Data fetching
  fetchProjects: () => Promise<void>
  fetchProjectRoadmap: (projectName: string) => Promise<void>
  fetchSessionLogs: (sessionId?: string) => Promise<void>
  refreshDashboardStats: () => Promise<void>
  
  // Project operations
  initializeProject: (params: {
    project_name: string
    description?: string
    team_composition?: any
    start_phase?: number
  }) => Promise<void>
  
  createRoadmap: (params: {
    project_name: string
    vision: string
    phases: Array<{
      name: string
      description: string
      objective: string
      duration_weeks: number
      deliverables: string[]
      success_metrics: string[]
    }>
    milestones?: Array<{
      name: string
      description: string
      phase_index: number
      weeks_into_phase: number
    }>
  }) => Promise<void>
  
  updatePhase: (projectName: string, params: {
    phase_number?: number
    status?: string
    completion_percentage?: number
    notes?: string
    transition_to_next?: boolean
  }) => Promise<void>
  
  updatePDL: (projectName: string, data: any) => void
  updateSprint: (projectName: string, data: any) => void
  addLogEntry: (logEntry: PDLLogEntry) => void
  
  // Utilities
  clearError: () => void
  clearLogs: () => void
}

export type ProjectSlice = ProjectState & ProjectActions

export const createProjectSlice: StateCreator<
  ProjectSlice,
  [['zustand/immer', never], ['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  ProjectSlice
> = (set, get) => ({
  // State
  projects: [],
  projectsList: [],
  selectedProject: null,
  selectedProjectName: null,
  currentRoadmap: null,
  sessionLogs: [],
  dashboardStats: {
    total_projects: 0,
    active_projects: 0,
    completed_phases: 0,
    average_progress: 0,
    recent_activity: []
  },
  loading: false,
  error: null,

  // Actions
  addProject: (project) => {
    set((state) => {
      state.projects.push(project)
      state.projectsList.push({
        project_name: project.project_name,
        description: project.description,
        status: project.roadmap?.roadmap_phases?.[0]?.status || 'not_started',
        progress: project.roadmap?.overall_progress || 0,
        last_activity: project.updated_at,
        team_size: Object.values(project.team_composition).flat().length,
        roadmap_phases: project.roadmap?.roadmap_phases?.length || 0,
        active_sprints: project.roadmap?.roadmap_phases?.reduce((sum, phase) => sum + phase.sprints.length, 0) || 0
      })
    })
  },

  updateProject: (projectName, updates) => {
    set((state) => {
      const index = state.projects.findIndex((p) => p.project_name === projectName)
      if (index !== -1) {
        state.projects[index] = { ...state.projects[index], ...updates, updated_at: new Date().toISOString() }
        if (state.selectedProject?.project_name === projectName) {
          state.selectedProject = state.projects[index]
        }
        
        // Update projects list
        const listIndex = state.projectsList.findIndex((p) => p.project_name === projectName)
        if (listIndex !== -1) {
          const project = state.projects[index]
          state.projectsList[listIndex] = {
            project_name: project.project_name,
            description: project.description,
            status: project.roadmap?.roadmap_phases?.[0]?.status || 'not_started',
            progress: project.roadmap?.overall_progress || 0,
            last_activity: project.updated_at,
            team_size: Object.values(project.team_composition).flat().length,
            roadmap_phases: project.roadmap?.roadmap_phases?.length || 0,
            active_sprints: project.roadmap?.roadmap_phases?.reduce((sum, phase) => sum + phase.sprints.length, 0) || 0
          }
        }
      }
    })
  },

  deleteProject: (projectName) => {
    set((state) => {
      state.projects = state.projects.filter((p) => p.project_name !== projectName)
      state.projectsList = state.projectsList.filter((p) => p.project_name !== projectName)
      if (state.selectedProject?.project_name === projectName) {
        state.selectedProject = null
        state.selectedProjectName = null
        state.currentRoadmap = null
      }
    })
  },

  setSelectedProject: (project) => {
    set((state) => {
      state.selectedProject = project
      state.selectedProjectName = project?.project_name || null
    })
  },

  setSelectedProjectByName: (projectName) => {
    const project = get().projects.find(p => p.project_name === projectName)
    get().setSelectedProject(project || null)
    if (project) {
      get().fetchProjectRoadmap(projectName)
    }
  },

  fetchProjects: async () => {
    set((state) => {
      state.loading = true
      state.error = null
    })

    try {
      const mcpClient = getMCPClient()
      
      // For now, use mock data since we don't have a project listing endpoint
      // In production, this would call mcpClient.listProjects() or similar
      const mockProjects: Project[] = [
        {
          project_name: 'mcp-pdl-ui-enhancement',
          description: 'Complete visualization system for MCP PDL with real-time updates',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          team_composition: {
            product_manager: 'Claude Assistant',
            engineering_manager: 'Engineering Manager Agent',
            engineers: ['Frontend Developer Agent', 'Backend Developer Agent'],
            qa_engineers: ['QA Engineer Agent'],
            product_designer: 'Product Designer Agent'
          },
          activity_log: [
            {
              timestamp: new Date().toISOString(),
              actor: 'Claude Assistant',
              action: 'project_updated',
              details: 'WebSocket integration completed'
            }
          ]
        }
      ]

      set((state) => {
        state.projects = mockProjects
        state.projectsList = mockProjects.map(project => ({
          project_name: project.project_name,
          description: project.description,
          status: project.roadmap?.roadmap_phases?.[0]?.status || 'not_started',
          progress: project.roadmap?.overall_progress || 35, // Mock progress
          last_activity: project.updated_at,
          team_size: Object.values(project.team_composition).flat().length,
          roadmap_phases: project.roadmap?.roadmap_phases?.length || 7,
          active_sprints: project.roadmap?.roadmap_phases?.reduce((sum, phase) => sum + phase.sprints.length, 0) || 1
        }))
        state.selectedProject = mockProjects[0]
        state.selectedProjectName = mockProjects[0].project_name
        state.loading = false
      })

      // Fetch roadmap for the first project
      if (mockProjects.length > 0) {
        await get().fetchProjectRoadmap(mockProjects[0].project_name)
      }
    } catch (error) {
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Failed to fetch projects'
        state.loading = false
      })
    }
  },

  fetchProjectRoadmap: async (projectName) => {
    try {
      const mcpClient = getMCPClient()
      const roadmap = await mcpClient.getRoadmap({ project_name: projectName, include_details: true })
      
      set((state) => {
        state.currentRoadmap = roadmap
      })
    } catch (error) {
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Failed to fetch project roadmap'
      })
    }
  },

  fetchSessionLogs: async (sessionId) => {
    try {
      const mcpClient = getMCPClient()
      const logs = await mcpClient.getSessionLogs(sessionId)
      
      set((state) => {
        state.sessionLogs = logs
      })
    } catch (error) {
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Failed to fetch session logs'
      })
    }
  },

  refreshDashboardStats: async () => {
    try {
      const { projects, sessionLogs } = get()
      
      const stats: DashboardStats = {
        total_projects: projects.length,
        active_projects: projects.filter(p => p.roadmap && p.roadmap.overall_progress > 0 && p.roadmap.overall_progress < 100).length,
        completed_phases: projects.reduce((sum, p) => {
          return sum + (p.roadmap?.roadmap_phases?.filter(phase => phase.status === 'completed').length || 0)
        }, 0),
        average_progress: projects.length > 0 ? 
          Math.round(projects.reduce((sum, p) => sum + (p.roadmap?.overall_progress || 0), 0) / projects.length) : 0,
        recent_activity: sessionLogs.slice(-10).map(log => ({
          timestamp: log.timestamp,
          actor: 'System',
          action: log.command,
          details: `${log.operation} operation completed in ${log.duration_ms}ms`,
          phase_number: log.parameters.phase_number
        }))
      }
      
      set((state) => {
        state.dashboardStats = stats
      })
    } catch (error) {
      console.error('Failed to refresh dashboard stats:', error)
    }
  },

  initializeProject: async (params) => {
    set((state) => {
      state.loading = true
      state.error = null
    })

    try {
      const mcpClient = getMCPClient()
      const result = await mcpClient.initializeProject(params)
      
      if (result.success) {
        // Add activity log entry
        const newActivity: ActivityLogEntry = {
          timestamp: new Date().toISOString(),
          actor: 'System',
          action: 'project_initialized',
          details: `Project "${params.project_name}" was initialized successfully`
        }
        
        // For now, create a mock project since we don't have full project data
        const newProject: Project = {
          project_name: params.project_name,
          description: params.description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          team_composition: params.team_composition || {},
          activity_log: [newActivity]
        }
        
        get().addProject(newProject)
        get().setSelectedProject(newProject)
      }
      
      set((state) => {
        state.loading = false
      })
    } catch (error) {
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Failed to initialize project'
        state.loading = false
      })
    }
  },

  createRoadmap: async (params) => {
    set((state) => {
      state.loading = true
      state.error = null
    })

    try {
      const mcpClient = getMCPClient()
      const result = await mcpClient.createRoadmap(params)
      
      if (result.success) {
        set((state) => {
          state.currentRoadmap = {
            project_name: params.project_name,
            roadmap: result.roadmap
          }
        })
        
        // Update the project with the new roadmap
        get().updateProject(params.project_name, { roadmap: result.roadmap })
      }
      
      set((state) => {
        state.loading = false
      })
    } catch (error) {
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Failed to create roadmap'
        state.loading = false
      })
    }
  },

  updatePhase: async (projectName, params) => {
    try {
      const mcpClient = getMCPClient()
      const result = await mcpClient.updatePhase({ project_name: projectName, ...params })
      
      if (result.success) {
        // Refresh the roadmap data
        await get().fetchProjectRoadmap(projectName)
        
        // Add activity log
        const activity: ActivityLogEntry = {
          timestamp: new Date().toISOString(),
          actor: 'User',
          action: 'phase_updated',
          details: `Phase ${params.phase_number} updated to ${params.completion_percentage}% completion`,
          phase_number: params.phase_number
        }
        
        // Update project activity log
        const project = get().projects.find(p => p.project_name === projectName)
        if (project) {
          get().updateProject(projectName, {
            activity_log: [...project.activity_log, activity]
          })
        }
      }
    } catch (error) {
      set((state) => {
        state.error = error instanceof Error ? error.message : 'Failed to update phase'
      })
    }
  },

  updatePDL: (projectName, data) => {
    // Handle PDL updates from WebSocket
    console.log('PDL update for', projectName, data)
    // This would update the current roadmap or project state based on the PDL data
  },

  updateSprint: (projectName, data) => {
    // Handle sprint updates from WebSocket
    console.log('Sprint update for', projectName, data)
    // This would update the current roadmap sprint data
  },

  addLogEntry: (logEntry) => {
    set((state) => {
      state.sessionLogs.unshift(logEntry) // Add to beginning for latest first
      if (state.sessionLogs.length > 1000) {
        state.sessionLogs = state.sessionLogs.slice(0, 500) // Keep only latest 500
      }
    })
  },

  clearError: () => {
    set((state) => {
      state.error = null
    })
  },

  clearLogs: () => {
    set((state) => {
      state.sessionLogs = []
    })
  },
})