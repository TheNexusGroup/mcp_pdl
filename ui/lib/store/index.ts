import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { ProjectSlice, createProjectSlice } from './projectSlice'
import { UISlice, createUISlice } from './uiSlice'
import { WebSocketSlice, createWebSocketSlice } from './websocketSlice'
import { ExportSlice, createExportSlice } from './exportSlice'

export interface RootState extends ProjectSlice, UISlice, WebSocketSlice, ExportSlice {}

export const useStore = create<RootState>()(
  devtools(
    subscribeWithSelector(
      immer((...a) => ({
        ...createProjectSlice(...a),
        ...createUISlice(...a),
        ...createWebSocketSlice(...a),
        ...createExportSlice(...a),
      }))
    ),
    { name: 'mcp-pdl-store' }
  )
)

// Cache server snapshots to avoid infinite loops
const serverSnapshots = new Map()

const createCachedSelector = <T>(selector: (state: RootState) => T) => {
  return (state: RootState) => {
    if (typeof window === 'undefined') {
      // Server-side
      const key = selector.toString()
      if (!serverSnapshots.has(key)) {
        serverSnapshots.set(key, selector(state))
      }
      return serverSnapshots.get(key)
    }
    return selector(state)
  }
}

// Selectors
export const useProjects = () => useStore((state) => state.projects)
export const useSelectedProject = () => useStore((state) => state.selectedProject)
export const useProjectById = (id: string) => useStore((state) => state.projects.find(p => p.project_name === id))
export const useConnectionStatus = () => useStore((state) => state.connectionStatus)
export const useUIState = () => useStore((state) => ({
  loading: state.loading,
  error: state.error,
  activeTab: state.activeTab,
  searchTerm: state.searchTerm,
}))

// Create stable selector functions
const projectActionsSelector = (state: RootState) => ({
  addProject: state.addProject,
  updateProject: state.updateProject,
  deleteProject: state.deleteProject,
  setSelectedProject: state.setSelectedProject,
  syncWithServer: state.syncWithServer,
  fetchProjects: state.fetchProjects || (() => Promise.resolve()),
})

const webSocketActionsSelector = (state: RootState) => ({
  connect: state.connect || (() => {}),
  disconnect: state.disconnect || (() => {}),
  sendMessage: state.sendMessage || (() => {}),
})

// Actions with stable selectors
export const useProjectActions = () => useStore(projectActionsSelector)
export const useWebSocketActions = () => useStore(webSocketActionsSelector)

const exportActionsSelector = (state: RootState) => ({
  exportProject: state.exportProject,
  exportRoadmap: state.exportRoadmap,
  exportLogs: state.exportLogs,
  exportProjectData: state.exportProjectData,
})

export const useExportActions = () => useStore(exportActionsSelector)