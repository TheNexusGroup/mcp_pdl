'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, 
  User, 
  GitCommit, 
  Calendar, 
  CheckCircle, 
  AlertTriangle,
  Target,
  Zap,
  Filter,
  Search,
  Download,
  RefreshCw
} from 'lucide-react'
import { ActivityLogEntry } from '@/lib/types'
import { formatDistanceToNow, parseISO, isToday, isYesterday, format } from 'date-fns'
import { Button } from '@/components/ui/button'

interface RealTimeActivityFeedProps {
  activities: ActivityLogEntry[]
}

interface ActivityGroup {
  date: string
  displayDate: string
  activities: ActivityLogEntry[]
}

export function RealTimeActivityFeed({ activities }: RealTimeActivityFeedProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedActions, setSelectedActions] = useState<string[]>([])
  const [selectedActors, setSelectedActors] = useState<string[]>([])
  const [isLive, setIsLive] = useState(true)

  // Get unique action types and actors for filters
  const uniqueActions = Array.from(new Set(activities.map(a => a.action)))
  const uniqueActors = Array.from(new Set(activities.map(a => a.actor)))

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const matchesSearch = searchTerm === '' || 
        activity.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.action.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesAction = selectedActions.length === 0 || selectedActions.includes(activity.action)
      const matchesActor = selectedActors.length === 0 || selectedActors.includes(activity.actor)

      return matchesSearch && matchesAction && matchesActor
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [activities, searchTerm, selectedActions, selectedActors])

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: { [key: string]: ActivityGroup } = {}
    
    filteredActivities.forEach(activity => {
      const activityDate = parseISO(activity.timestamp)
      const dateKey = format(activityDate, 'yyyy-MM-dd')
      
      let displayDate: string
      if (isToday(activityDate)) {
        displayDate = 'Today'
      } else if (isYesterday(activityDate)) {
        displayDate = 'Yesterday'
      } else {
        displayDate = format(activityDate, 'MMMM d, yyyy')
      }

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          displayDate,
          activities: []
        }
      }
      
      groups[dateKey].activities.push(activity)
    })

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
  }, [filteredActivities])

  const getActionIcon = (action: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      'phase_updated': <GitCommit className="w-4 h-4 text-blue-600" />,
      'sprint_created': <Calendar className="w-4 h-4 text-green-600" />,
      'sprint_updated': <Target className="w-4 h-4 text-yellow-600" />,
      'project_initialized': <CheckCircle className="w-4 h-4 text-purple-600" />,
      'phase_transitioned': <Zap className="w-4 h-4 text-indigo-600" />,
      'roadmap_created': <Target className="w-4 h-4 text-pink-600" />,
      'milestone_achieved': <CheckCircle className="w-4 h-4 text-green-600" />,
      'task_completed': <CheckCircle className="w-4 h-4 text-blue-600" />,
      'blocker_reported': <AlertTriangle className="w-4 h-4 text-red-600" />,
    }
    
    return iconMap[action] || <Clock className="w-4 h-4 text-gray-600" />
  }

  const getActionColor = (action: string) => {
    const colorMap: { [key: string]: string } = {
      'phase_updated': 'border-blue-200 bg-blue-50',
      'sprint_created': 'border-green-200 bg-green-50',
      'sprint_updated': 'border-yellow-200 bg-yellow-50',
      'project_initialized': 'border-purple-200 bg-purple-50',
      'phase_transitioned': 'border-indigo-200 bg-indigo-50',
      'roadmap_created': 'border-pink-200 bg-pink-50',
      'milestone_achieved': 'border-green-200 bg-green-50',
      'task_completed': 'border-blue-200 bg-blue-50',
      'blocker_reported': 'border-red-200 bg-red-50',
    }
    
    return colorMap[action] || 'border-gray-200 bg-gray-50'
  }

  const formatActionTitle = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const toggleActionFilter = (action: string) => {
    setSelectedActions(prev => 
      prev.includes(action) 
        ? prev.filter(a => a !== action)
        : [...prev, action]
    )
  }

  const toggleActorFilter = (actor: string) => {
    setSelectedActors(prev => 
      prev.includes(actor) 
        ? prev.filter(a => a !== actor)
        : [...prev, actor]
    )
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedActions([])
    setSelectedActors([])
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-gray-400 mb-4"
        >
          <Clock className="w-16 h-16 mx-auto" />
        </motion.div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
        <p className="text-gray-600">Project activity will appear here as work progresses.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">Live Activity Feed</h3>
          <motion.div
            animate={{ scale: isLive ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 2, repeat: isLive ? Infinity : 0 }}
            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              isLive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-600' : 'bg-gray-400'}`} />
            <span>{isLive ? 'Live' : 'Paused'}</span>
          </motion.div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => setIsLive(!isLive)}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {isLive ? <RefreshCw className="w-4 h-4 mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            {isLive ? 'Pause' : 'Resume'}
          </Button>
          
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Action Filters */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filter by Action Type
          </label>
          <div className="flex flex-wrap gap-2">
            {uniqueActions.map(action => (
              <button
                key={action}
                onClick={() => toggleActionFilter(action)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  selectedActions.includes(action)
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {formatActionTitle(action)}
              </button>
            ))}
          </div>
        </div>

        {/* Actor Filters */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <User className="w-4 h-4 mr-2" />
            Filter by Actor
          </label>
          <div className="flex flex-wrap gap-2">
            {uniqueActors.map(actor => (
              <button
                key={actor}
                onClick={() => toggleActorFilter(actor)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  selectedActors.includes(actor)
                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {actor}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {(searchTerm || selectedActions.length > 0 || selectedActors.length > 0) && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Activity Groups */}
      <div className="space-y-6">
        <AnimatePresence>
          {groupedActivities.map((group) => (
            <motion.div
              key={group.date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Date Header */}
              <div className="sticky top-0 bg-white/90 backdrop-blur-sm py-2 z-10">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-600" />
                  {group.displayDate}
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {group.activities.length} event{group.activities.length !== 1 ? 's' : ''}
                  </span>
                </h4>
              </div>

              {/* Activities Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                <div className="space-y-4">
                  {group.activities.map((activity, index) => (
                    <motion.div
                      key={`${activity.timestamp}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative flex space-x-4"
                    >
                      {/* Timeline dot */}
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full border-2 border-current">
                          {getActionIcon(activity.action)}
                        </div>
                      </div>

                      {/* Activity content */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`flex-grow p-4 rounded-lg border-l-4 ${getActionColor(activity.action)} hover:shadow-md transition-all`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-900">
                            {formatActionTitle(activity.action)}
                          </h5>
                          <span className="text-xs text-gray-500 ml-4 flex-shrink-0">
                            {formatDistanceToNow(parseISO(activity.timestamp), { addSuffix: true })}
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 mb-3">
                          {activity.details}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>{activity.actor}</span>
                            </div>
                            
                            {activity.phase_number && (
                              <div className="flex items-center space-x-1">
                                <GitCommit className="w-3 h-3" />
                                <span>Phase {activity.phase_number}</span>
                              </div>
                            )}
                            
                            {activity.sprint_id && (
                              <div className="flex items-center space-x-1">
                                <Target className="w-3 h-3" />
                                <span>Sprint {activity.sprint_id.slice(0, 8)}...</span>
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-gray-400">
                            {format(parseISO(activity.timestamp), 'h:mm a')}
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* No Results */}
      {filteredActivities.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your search or filter criteria.</p>
          <Button onClick={clearFilters} variant="outline" size="sm">
            Clear filters
          </Button>
        </motion.div>
      )}

      {/* Activity Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <h4 className="font-medium text-gray-900 mb-3">Activity Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {filteredActivities.length}
            </div>
            <div className="text-sm text-blue-700">Total Events</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {filteredActivities.filter(a => a.action.includes('completed')).length}
            </div>
            <div className="text-sm text-green-700">Completions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {uniqueActors.length}
            </div>
            <div className="text-sm text-purple-700">Contributors</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {isToday(parseISO(filteredActivities[0]?.timestamp || new Date().toISOString())) 
                ? filteredActivities.filter(a => isToday(parseISO(a.timestamp))).length 
                : 0}
            </div>
            <div className="text-sm text-orange-700">Today</div>
          </div>
        </div>
      </div>
    </div>
  )
}