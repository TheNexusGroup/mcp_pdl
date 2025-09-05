import { CheckCircle, Circle, AlertCircle, Clock } from 'lucide-react'

interface Project {
  project_name: string
  current_phase: {
    phase_number: number
    phase_name: string
    status: string
    completion_percentage: number
  }
}

interface PhaseTimelineProps {
  project: Project
}

const PHASES = [
  { number: 1, name: 'Discovery & Ideation', color: 'purple' },
  { number: 2, name: 'Definition & Scoping', color: 'blue' },
  { number: 3, name: 'Design & Prototyping', color: 'pink' },
  { number: 4, name: 'Development & Implementation', color: 'green' },
  { number: 5, name: 'Testing & Quality Assurance', color: 'orange' },
  { number: 6, name: 'Launch & Deployment', color: 'red' },
  { number: 7, name: 'Post-Launch: Growth & Iteration', color: 'indigo' }
]

export function PhaseTimeline({ project }: PhaseTimelineProps) {
  const getPhaseStatus = (phaseNumber: number) => {
    const currentPhase = project.current_phase.phase_number
    
    if (phaseNumber < currentPhase) {
      return 'completed'
    } else if (phaseNumber === currentPhase) {
      return project.current_phase.status
    } else {
      return 'not_started'
    }
  }

  const getStatusIcon = (status: string, isActive: boolean) => {
    if (status === 'completed') {
      return <CheckCircle className="w-6 h-6 text-green-600" />
    } else if (status === 'blocked') {
      return <AlertCircle className="w-6 h-6 text-red-600" />
    } else if (isActive && status === 'in_progress') {
      return <Clock className="w-6 h-6 text-blue-600" />
    } else {
      return <Circle className="w-6 h-6 text-gray-400" />
    }
  }

  const getProgressWidth = (phaseNumber: number) => {
    if (phaseNumber === project.current_phase.phase_number) {
      return project.current_phase.completion_percentage
    } else if (phaseNumber < project.current_phase.phase_number) {
      return 100
    } else {
      return 0
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Timeline</h3>
        <p className="text-gray-600">
          Currently in Phase {project.current_phase.phase_number}: {project.current_phase.phase_name}
        </p>
      </div>

      <div className="space-y-6">
        {PHASES.map((phase, index) => {
          const status = getPhaseStatus(phase.number)
          const isActive = phase.number === project.current_phase.phase_number
          const progress = getProgressWidth(phase.number)

          return (
            <div key={phase.number} className="relative">
              {/* Connector Line */}
              {index < PHASES.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
              )}

              <div className={`flex items-start space-x-4 ${isActive ? 'bg-blue-50 p-4 rounded-lg' : ''}`}>
                {/* Phase Icon */}
                <div className="flex-shrink-0 relative">
                  {getStatusIcon(status, isActive)}
                  {isActive && (
                    <div className="absolute -inset-2 bg-blue-200 rounded-full animate-pulse opacity-50" />
                  )}
                </div>

                {/* Phase Content */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                        Phase {phase.number}: {phase.name}
                      </h4>
                      {isActive && (
                        <p className="text-sm text-blue-700 mt-1">
                          {project.current_phase.status.replace('_', ' ')} • {progress}% complete
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {status === 'completed' && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Complete
                        </span>
                      )}
                      {status === 'blocked' && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Blocked
                        </span>
                      )}
                      {isActive && status === 'in_progress' && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        status === 'completed' 
                          ? 'bg-green-500' 
                          : isActive 
                            ? 'bg-blue-500' 
                            : 'bg-gray-300'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Phase Description */}
                  <div className="text-sm text-gray-600">
                    {getPhaseDescription(phase.number)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getPhaseDescription(phaseNumber: number): string {
  const descriptions = {
    1: 'Problem validation, market research, and idea generation',
    2: 'Requirements definition, scope planning, and resource allocation',
    3: 'User experience design, prototyping, and validation',
    4: 'Feature development, code implementation, and integration',
    5: 'Quality assurance, testing, and bug resolution',
    6: 'Production deployment and launch coordination',
    7: 'Performance monitoring, user feedback, and iterative improvements'
  }
  
  return descriptions[phaseNumber as keyof typeof descriptions] || ''
}