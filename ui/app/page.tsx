'use client'

import { useState, useEffect } from 'react'
import { ProjectCard } from '@/components/ProjectCard'
import { PhaseTimeline } from '@/components/PhaseTimeline'
import { SprintBoard } from '@/components/SprintBoard'
import { ActivityLog } from '@/components/ActivityLog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Settings, RefreshCw } from 'lucide-react'

interface Project {
  project_name: string
  description: string
  created_at: string
  updated_at: string
  current_phase: {
    phase_number: number
    phase_name: string
    status: string
    completion_percentage: number
  }
  sprints: any[]
  activity_log: any[]
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  // Mock data for development
  useEffect(() => {
    // Simulate API call
    const mockProjects: Project[] = [
      {
        project_name: 'mcp-pdl-server',
        description: 'MCP Product Development Lifecycle Server - Core implementation and tooling',
        created_at: '2025-09-05T02:25:11.026Z',
        updated_at: '2025-09-05T02:25:11.026Z',
        current_phase: {
          phase_number: 4,
          phase_name: 'Development & Implementation',
          status: 'in_progress',
          completion_percentage: 75
        },
        sprints: [
          {
            sprint_id: 'core-dev-1',
            sprint_name: 'Core Development Sprint 1',
            status: 'completed',
            velocity: 25,
            tasks: 12,
            completed_tasks: 12
          },
          {
            sprint_id: 'ui-dev-1',
            sprint_name: 'UI Development Sprint 1',
            status: 'active',
            velocity: 20,
            tasks: 8,
            completed_tasks: 4
          }
        ],
        activity_log: [
          {
            timestamp: '2025-09-05T02:20:00.000Z',
            action: 'phase_updated',
            details: 'Phase 4 (Development & Implementation) updated: 75% complete',
            actor: 'Claude Code Assistant'
          },
          {
            timestamp: '2025-09-05T02:15:00.000Z',
            action: 'sprint_created',
            details: 'Sprint "UI Development Sprint 1" created for Phase 4',
            actor: 'Claude Code Assistant'
          }
        ]
      }
    ]
    
    setProjects(mockProjects)
    setSelectedProject(mockProjects[0])
    setLoading(false)
  }, [])

  const handleRefresh = async () => {
    setLoading(true)
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MCP PDL Dashboard</h1>
          <p className="text-gray-600 mt-1">Product Development Lifecycle Management</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Projects Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard
            key={project.project_name}
            project={project}
            isSelected={selectedProject?.project_name === project.project_name}
            onSelect={() => setSelectedProject(project)}
          />
        ))}
      </div>

      {/* Project Details */}
      {selectedProject && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">{selectedProject.project_name}</h2>
            <p className="text-gray-600 text-sm mt-1">{selectedProject.description}</p>
          </div>

          <Tabs defaultValue="timeline" className="p-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timeline">Phase Timeline</TabsTrigger>
              <TabsTrigger value="sprints">Sprint Board</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-6">
              <PhaseTimeline project={selectedProject} />
            </TabsContent>

            <TabsContent value="sprints" className="mt-6">
              <SprintBoard sprints={selectedProject.sprints} />
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <ActivityLog activities={selectedProject.activity_log} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}