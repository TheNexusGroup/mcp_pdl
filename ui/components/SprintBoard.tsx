import { Calendar, Target, TrendingUp, Users } from 'lucide-react'

interface Sprint {
  sprint_id: string
  sprint_name: string
  status: string
  velocity: number
  tasks: number
  completed_tasks: number
}

interface SprintBoardProps {
  sprints: Sprint[]
}

export function SprintBoard({ sprints }: SprintBoardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'planning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const calculateProgress = (completed: number, total: number) => {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  if (sprints.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Sprints Yet</h3>
        <p className="text-gray-600">Create your first sprint to start tracking progress.</p>
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Create Sprint
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Sprint Overview</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          New Sprint
        </button>
      </div>

      {/* Sprint Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {sprints.map((sprint) => {
          const progress = calculateProgress(sprint.completed_tasks, sprint.tasks)
          
          return (
            <div key={sprint.sprint_id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
              {/* Sprint Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">{sprint.sprint_name}</h4>
                  <span
                    className={`px-2 py-1 text-xs font-medium border rounded-full ${getStatusColor(sprint.status)}`}
                  >
                    {sprint.status}
                  </span>
                </div>
                <div className="text-right text-sm text-gray-500">
                  ID: {sprint.sprint_id.slice(0, 8)}...
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{progress}% complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      sprint.status === 'completed'
                        ? 'bg-green-500'
                        : sprint.status === 'active'
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Sprint Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto mb-2">
                    <Target className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{sprint.tasks}</div>
                  <div className="text-xs text-gray-600">Total Tasks</div>
                </div>

                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{sprint.velocity}</div>
                  <div className="text-xs text-gray-600">Velocity</div>
                </div>

                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full mx-auto mb-2">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-lg font-semibold text-gray-900">{sprint.completed_tasks}</div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
              </div>

              {/* Sprint Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {sprint.status === 'active' ? 'In Progress' : 
                     sprint.status === 'completed' ? 'Completed' : 
                     'Planning Phase'}
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      View Details
                    </button>
                    {sprint.status === 'active' && (
                      <button className="text-sm text-green-600 hover:text-green-800">
                        Complete Sprint
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Sprint Summary */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="font-medium text-blue-900 mb-3">Sprint Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {sprints.length}
            </div>
            <div className="text-sm text-blue-700">Total Sprints</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {sprints.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {sprints.filter(s => s.status === 'active').length}
            </div>
            <div className="text-sm text-yellow-700">Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {sprints.reduce((sum, sprint) => sum + sprint.velocity, 0)}
            </div>
            <div className="text-sm text-purple-700">Total Velocity</div>
          </div>
        </div>
      </div>
    </div>
  )
}