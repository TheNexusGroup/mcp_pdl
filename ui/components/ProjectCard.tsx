import { Calendar, Users, TrendingUp } from 'lucide-react'

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
}

interface ProjectCardProps {
  project: Project
  isSelected: boolean
  onSelect: () => void
}

export function ProjectCard({ project, isSelected, onSelect }: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'blocked':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'not_started':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200'
      }`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {project.project_name}
          </h3>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {project.description}
          </p>
        </div>

        {/* Phase Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Phase {project.current_phase.phase_number}
            </span>
            <span
              className={`px-2 py-1 text-xs font-medium border rounded-full ${getStatusColor(
                project.current_phase.status
              )}`}
            >
              {project.current_phase.status.replace('_', ' ')}
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            {project.current_phase.phase_name}
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${project.current_phase.completion_percentage}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-500">
            {project.current_phase.completion_percentage}% complete
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xs font-medium text-gray-900">
              {project.sprints.length}
            </div>
            <div className="text-xs text-gray-500">Sprints</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-1">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-xs font-medium text-gray-900">
              {Math.ceil(
                (new Date().getTime() - new Date(project.created_at).getTime()) /
                (1000 * 60 * 60 * 24)
              )}
            </div>
            <div className="text-xs text-gray-500">Days</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full mx-auto mb-1">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xs font-medium text-gray-900">4</div>
            <div className="text-xs text-gray-500">Team</div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
          Updated {formatDate(project.updated_at)}
        </div>
      </div>
    </div>
  )
}