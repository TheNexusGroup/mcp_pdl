import { Clock, User, GitCommit, Calendar, AlertCircle, CheckCircle } from 'lucide-react'

interface Activity {
  timestamp: string
  action: string
  details: string
  actor: string
}

interface ActivityLogProps {
  activities: Activity[]
}

export function ActivityLog({ activities }: ActivityLogProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'phase_updated':
        return <GitCommit className="w-4 h-4 text-blue-600" />
      case 'sprint_created':
        return <Calendar className="w-4 h-4 text-green-600" />
      case 'sprint_updated':
        return <CheckCircle className="w-4 h-4 text-yellow-600" />
      case 'project_initialized':
        return <CheckCircle className="w-4 h-4 text-purple-600" />
      case 'phase_transitioned':
        return <GitCommit className="w-4 h-4 text-indigo-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'phase_updated':
        return 'border-blue-200 bg-blue-50'
      case 'sprint_created':
        return 'border-green-200 bg-green-50'
      case 'sprint_updated':
        return 'border-yellow-200 bg-yellow-50'
      case 'project_initialized':
        return 'border-purple-200 bg-purple-50'
      case 'phase_transitioned':
        return 'border-indigo-200 bg-indigo-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24)

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60))
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else if (diffInDays < 7) {
      const days = Math.floor(diffInDays)
      return `${days} day${days !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  const formatActionTitle = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
        <p className="text-gray-600">Project activity will appear here as work progresses.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <button className="text-sm text-blue-600 hover:text-blue-800">
          View All Activity
        </button>
      </div>

      {/* Activity Timeline */}
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="relative">
            {/* Timeline connector */}
            {index < activities.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200" />
            )}

            <div className={`flex space-x-4 p-4 rounded-lg border-l-4 ${getActionColor(activity.action)}`}>
              {/* Activity Icon */}
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full border-2 border-current">
                  {getActionIcon(activity.action)}
                </div>
              </div>

              {/* Activity Content */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {formatActionTitle(activity.action)}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>

                <p className="text-sm text-gray-700 mb-2">
                  {activity.details}
                </p>

                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <User className="w-3 h-3" />
                  <span>{activity.actor}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-3">Activity Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-gray-900">
              {activities.length}
            </div>
            <div className="text-xs text-gray-600">Total Events</div>
          </div>
          <div>
            <div className="text-xl font-bold text-blue-600">
              {activities.filter(a => a.action === 'phase_updated').length}
            </div>
            <div className="text-xs text-blue-700">Phase Updates</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-600">
              {activities.filter(a => a.action.includes('sprint')).length}
            </div>
            <div className="text-xs text-green-700">Sprint Actions</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-600">
              {new Set(activities.map(a => a.actor)).size}
            </div>
            <div className="text-xs text-purple-700">Contributors</div>
          </div>
        </div>
      </div>
    </div>
  )
}