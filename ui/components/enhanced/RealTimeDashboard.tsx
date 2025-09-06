'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  useStore, 
  useProjects, 
  useSelectedProject, 
  useConnectionStatus,
  useProjectActions,
  useWebSocketActions 
} from '@/lib/store'
import { ProjectOverviewCard } from './ProjectOverviewCard'
import { InteractiveRoadmap } from './InteractiveRoadmap'
import { RealTimeActivityFeed } from './RealTimeActivityFeed'
import { EnhancedSearchBar } from './EnhancedSearchBar'
import { ExportPanel } from './ExportPanel'
import { ConnectionStatus } from './ConnectionStatus'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus, Settings, RefreshCw, Filter } from 'lucide-react'

export function RealTimeDashboard() {
  const projects = useProjects()
  const selectedProject = useSelectedProject()
  const connectionStatus = useConnectionStatus()
  const { fetchProjects, syncWithServer } = useProjectActions()
  const { connect } = useWebSocketActions()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Track component mounted state for hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize connection and fetch data
  useEffect(() => {
    connect()
    fetchProjects()
  }, [])

  // Auto-sync every 30 seconds when connected
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const interval = setInterval(syncWithServer, 30000)
      return () => clearInterval(interval)
    }
  }, [connectionStatus, syncWithServer])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await syncWithServer()
      // Add success notification
      useStore.getState().addNotification({
        type: 'success',
        title: 'Data Synced',
        message: 'Project data has been synchronized successfully'
      })
    } catch (error) {
      useStore.getState().addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: 'Failed to synchronize project data'
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" data-testid="real-time-dashboard">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MCP PDL Dashboard
                </h1>
                <p className="text-sm text-gray-600">Real-time Project Development Lifecycle Management</p>
              </div>
              <ConnectionStatus status={connectionStatus} data-testid="connection-status" />
            </div>
            
            <div className="flex items-center space-x-3">
              <EnhancedSearchBar />
              
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
                className="hidden md:flex"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>

              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="hidden md:flex"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Sync
              </Button>

              <ExportPanel />

              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>

              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Projects Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Active Projects</h2>
            <div className="text-sm text-gray-500">
              {projects.length} project{projects.length !== 1 ? 's' : ''} • Last sync: {mounted ? new Date().toLocaleTimeString() : '--:--:--'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {projects.map((project, index) => (
                <motion.div
                  key={project.project_name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ProjectOverviewCard
                    project={project}
                    isSelected={selectedProject?.project_name === project.project_name}
                    onSelect={() => useStore.getState().setSelectedProject(project)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {projects.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="text-gray-400 mb-4">
                <Plus className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-6">Get started by creating your first project</p>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Project Details */}
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200"
          >
            <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
              <div className="px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedProject.project_name}
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      {selectedProject.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-500">
                      {Math.round(selectedProject.roadmap.overall_progress)}% Complete
                    </div>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedProject.roadmap.overall_progress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="roadmap" className="p-6">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="roadmap" className="flex items-center space-x-2">
                  <span>Interactive Roadmap</span>
                </TabsTrigger>
                <TabsTrigger value="sprints" className="flex items-center space-x-2">
                  <span>Sprint Board</span>
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center space-x-2">
                  <span>Live Activity</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center space-x-2">
                  <span>Analytics</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="roadmap" className="space-y-6">
                <InteractiveRoadmap project={selectedProject} />
              </TabsContent>

              <TabsContent value="sprints" className="space-y-6">
                <div className="text-center py-12 text-gray-500">
                  Sprint board component coming in Phase 3...
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <RealTimeActivityFeed activities={selectedProject.activity_log} />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <div className="text-center py-12 text-gray-500">
                  Analytics dashboard coming in Phase 4...
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>
    </div>
  )
}