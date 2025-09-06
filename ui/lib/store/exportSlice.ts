import { StateCreator } from 'zustand'
import { saveAs } from 'file-saver'
import Papa from 'papaparse'
import yaml from 'js-yaml'
import jsPDF from 'jspdf'
import { Project, Roadmap, ActivityLogEntry } from '../types'

export type ExportFormat = 'json' | 'yaml' | 'csv' | 'pdf'

export interface ExportState {
  isExporting: boolean
  exportProgress: number
  lastExport: {
    format: ExportFormat
    filename: string
    timestamp: Date
  } | null
}

export interface ExportActions {
  exportProject: (project: Project, format: ExportFormat) => Promise<void>
  exportRoadmap: (roadmap: Roadmap, format: ExportFormat) => Promise<void>
  exportLogs: (logs: ActivityLogEntry[], format: ExportFormat) => Promise<void>
  exportProjectData: (projectName: string, format: ExportFormat, includeOptions?: {
    roadmap?: boolean
    sprints?: boolean
    logs?: boolean
    team?: boolean
  }) => Promise<void>
}

export type ExportSlice = ExportState & ExportActions

export const createExportSlice: StateCreator<
  ExportSlice,
  [['zustand/immer', never], ['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  ExportSlice
> = (set, get) => ({
  // State
  isExporting: false,
  exportProgress: 0,
  lastExport: null,

  // Actions
  exportProject: async (project, format) => {
    set((state) => {
      state.isExporting = true
      state.exportProgress = 0
    })

    try {
      const filename = `${project.project_name}_${new Date().toISOString().split('T')[0]}`
      
      set((state) => {
        state.exportProgress = 25
      })

      switch (format) {
        case 'json':
          await exportAsJSON(project, filename)
          break
        case 'yaml':
          await exportAsYAML(project, filename)
          break
        case 'csv':
          await exportProjectAsCSV(project, filename)
          break
        case 'pdf':
          await exportProjectAsPDF(project, filename)
          break
      }

      set((state) => {
        state.exportProgress = 100
        state.lastExport = {
          format,
          filename: `${filename}.${format}`,
          timestamp: new Date(),
        }
      })
    } finally {
      setTimeout(() => {
        set((state) => {
          state.isExporting = false
          state.exportProgress = 0
        })
      }, 1000)
    }
  },

  exportRoadmap: async (roadmap, format) => {
    set((state) => {
      state.isExporting = true
      state.exportProgress = 0
    })

    try {
      const filename = `roadmap_${roadmap.project_name}_${new Date().toISOString().split('T')[0]}`
      
      set((state) => {
        state.exportProgress = 50
      })

      switch (format) {
        case 'json':
          await exportAsJSON(roadmap, filename)
          break
        case 'yaml':
          await exportAsYAML(roadmap, filename)
          break
        case 'csv':
          await exportRoadmapAsCSV(roadmap, filename)
          break
        case 'pdf':
          await exportRoadmapAsPDF(roadmap, filename)
          break
      }

      set((state) => {
        state.exportProgress = 100
        state.lastExport = {
          format,
          filename: `${filename}.${format}`,
          timestamp: new Date(),
        }
      })
    } finally {
      setTimeout(() => {
        set((state) => {
          state.isExporting = false
          state.exportProgress = 0
        })
      }, 1000)
    }
  },

  exportLogs: async (logs, format) => {
    set((state) => {
      state.isExporting = true
      state.exportProgress = 0
    })

    try {
      const filename = `activity_logs_${new Date().toISOString().split('T')[0]}`
      
      set((state) => {
        state.exportProgress = 50
      })

      switch (format) {
        case 'json':
          await exportAsJSON(logs, filename)
          break
        case 'yaml':
          await exportAsYAML(logs, filename)
          break
        case 'csv':
          await exportLogsAsCSV(logs, filename)
          break
        case 'pdf':
          await exportLogsAsPDF(logs, filename)
          break
      }

      set((state) => {
        state.exportProgress = 100
        state.lastExport = {
          format,
          filename: `${filename}.${format}`,
          timestamp: new Date(),
        }
      })
    } finally {
      setTimeout(() => {
        set((state) => {
          state.isExporting = false
          state.exportProgress = 0
        })
      }, 1000)
    }
  },

  exportProjectData: async (projectName, format, includeOptions = {}) => {
    const state = get() as any
    const project = state.projects?.find((p: Project) => p.project_name === projectName)
    
    if (!project) {
      throw new Error(`Project ${projectName} not found`)
    }

    set((state) => {
      state.isExporting = true
      state.exportProgress = 0
    })

    try {
      // Build comprehensive export data
      const exportData: any = {
        project: {
          name: project.project_name,
          description: project.description,
          created_at: project.created_at,
          updated_at: project.updated_at,
        }
      }

      if (includeOptions.team !== false) {
        exportData.team = project.team_composition
        set((state) => { state.exportProgress = 25 })
      }

      if (includeOptions.roadmap !== false) {
        exportData.roadmap = project.roadmap
        set((state) => { state.exportProgress = 50 })
      }

      if (includeOptions.logs !== false) {
        exportData.activity_logs = project.activity_log
        set((state) => { state.exportProgress = 75 })
      }

      const filename = `${projectName}_complete_${new Date().toISOString().split('T')[0]}`
      
      switch (format) {
        case 'json':
          await exportAsJSON(exportData, filename)
          break
        case 'yaml':
          await exportAsYAML(exportData, filename)
          break
        case 'csv':
          // For comprehensive CSV, create multiple sheets/files
          await exportComprehensiveCSV(exportData, filename)
          break
        case 'pdf':
          await exportComprehensivePDF(exportData, filename)
          break
      }

      set((state) => {
        state.exportProgress = 100
        state.lastExport = {
          format,
          filename: `${filename}.${format}`,
          timestamp: new Date(),
        }
      })
    } finally {
      setTimeout(() => {
        set((state) => {
          state.isExporting = false
          state.exportProgress = 0
        })
      }, 1000)
    }
  },
})

// Helper functions
const exportAsJSON = async (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  saveAs(blob, `${filename}.json`)
}

const exportAsYAML = async (data: any, filename: string) => {
  const yamlString = yaml.dump(data, { indent: 2 })
  const blob = new Blob([yamlString], { type: 'text/yaml' })
  saveAs(blob, `${filename}.yaml`)
}

const exportProjectAsCSV = async (project: Project, filename: string) => {
  const csvData = [
    ['Project Name', project.project_name],
    ['Description', project.description],
    ['Created', project.created_at],
    ['Updated', project.updated_at],
    ['Overall Progress', `${project.roadmap.overall_progress}%`],
  ]
  
  const csv = Papa.unparse(csvData)
  const blob = new Blob([csv], { type: 'text/csv' })
  saveAs(blob, `${filename}.csv`)
}

const exportRoadmapAsCSV = async (roadmap: Roadmap, filename: string) => {
  const phases = roadmap.roadmap_phases.map(phase => ({
    'Phase Name': phase.phase_name,
    'Status': phase.status,
    'Progress': `${phase.completion_percentage}%`,
    'Start Date': phase.start_date,
    'End Date': phase.end_date,
    'Objective': phase.objective,
  }))
  
  const csv = Papa.unparse(phases)
  const blob = new Blob([csv], { type: 'text/csv' })
  saveAs(blob, `${filename}.csv`)
}

const exportLogsAsCSV = async (logs: ActivityLogEntry[], filename: string) => {
  const csvData = logs.map(log => ({
    'Timestamp': log.timestamp,
    'Actor': log.actor,
    'Action': log.action,
    'Details': log.details,
    'Phase': log.phase_number || '',
    'Sprint': log.sprint_id || '',
  }))
  
  const csv = Papa.unparse(csvData)
  const blob = new Blob([csv], { type: 'text/csv' })
  saveAs(blob, `${filename}.csv`)
}

const exportProjectAsPDF = async (project: Project, filename: string) => {
  const pdf = new jsPDF()
  pdf.text(`Project: ${project.project_name}`, 10, 10)
  pdf.text(`Description: ${project.description}`, 10, 20)
  pdf.text(`Progress: ${project.roadmap.overall_progress}%`, 10, 30)
  pdf.save(`${filename}.pdf`)
}

const exportRoadmapAsPDF = async (roadmap: Roadmap, filename: string) => {
  const pdf = new jsPDF()
  pdf.text(`Roadmap: ${roadmap.project_name}`, 10, 10)
  pdf.text(`Vision: ${roadmap.vision}`, 10, 20)
  pdf.save(`${filename}.pdf`)
}

const exportLogsAsPDF = async (logs: ActivityLogEntry[], filename: string) => {
  const pdf = new jsPDF()
  pdf.text('Activity Logs', 10, 10)
  logs.slice(0, 20).forEach((log, index) => {
    pdf.text(`${log.timestamp}: ${log.action}`, 10, 20 + (index * 10))
  })
  pdf.save(`${filename}.pdf`)
}

const exportComprehensiveCSV = async (data: any, filename: string) => {
  // Create a zip-like structure or multiple files
  await exportAsJSON(data, filename) // Fallback to JSON for comprehensive export
}

const exportComprehensivePDF = async (data: any, filename: string) => {
  const pdf = new jsPDF()
  pdf.text(`Project Report: ${data.project.name}`, 10, 10)
  pdf.text(`Description: ${data.project.description}`, 10, 20)
  if (data.roadmap) {
    pdf.text(`Vision: ${data.roadmap.vision}`, 10, 30)
  }
  pdf.save(`${filename}.pdf`)
}