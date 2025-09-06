'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  X, 
  Filter,
  Calendar,
  User,
  GitCommit,
  Target,
  FileText,
  Clock,
  ChevronDown
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { SearchResult, FilterOptions } from '@/lib/types'
import Fuse from 'fuse.js'

export function EnhancedSearchBar() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { 
    projects, 
    searchTerm, 
    setSearchTerm, 
    filters, 
    updateFilters 
  } = useStore(state => ({
    projects: state.projects,
    searchTerm: state.searchTerm,
    setSearchTerm: state.setSearchTerm,
    filters: state.filters,
    updateFilters: state.updateFilters,
  }))

  // Create search index
  const searchData = useMemo(() => {
    const data: Array<{
      id: string
      title: string
      description: string
      type: 'project' | 'phase' | 'sprint' | 'task' | 'activity'
      context?: string
    }> = []

    projects.forEach(project => {
      // Add project
      data.push({
        id: project.project_name,
        title: project.project_name,
        description: project.description,
        type: 'project',
      })

      // Add phases
      project.roadmap?.roadmap_phases?.forEach(phase => {
        data.push({
          id: phase.roadmap_phase_id,
          title: phase.phase_name,
          description: phase.phase_description,
          type: 'phase',
          context: `${project.project_name} > ${phase.phase_name}`,
        })

        // Add sprints
        phase.sprints.forEach(sprint => {
          data.push({
            id: sprint.sprint_id,
            title: sprint.sprint_name,
            description: `Sprint ${sprint.sprint_number} in ${phase.phase_name}`,
            type: 'sprint',
            context: `${project.project_name} > ${phase.phase_name} > ${sprint.sprint_name}`,
          })

          // Add tasks from PDL cycles
          sprint.pdl_cycles.forEach(cycle => {
            cycle.tasks.forEach(task => {
              data.push({
                id: task.task_id,
                title: task.description,
                description: `Assigned to ${task.assignee} (${task.story_points} points)`,
                type: 'task',
                context: `${project.project_name} > ${sprint.sprint_name} > ${task.description}`,
              })
            })
          })
        })
      })

      // Add activities
      project.activity_log.forEach(activity => {
        data.push({
          id: `${activity.timestamp}-${activity.action}`,
          title: activity.action.replace('_', ' '),
          description: activity.details,
          type: 'activity',
          context: `${project.project_name} > ${activity.actor}`,
        })
      })
    })

    return data
  }, [projects])

  const fuse = useMemo(() => {
    return new Fuse(searchData, {
      keys: ['title', 'description', 'context'],
      threshold: 0.4,
      includeScore: true,
    })
  }, [searchData])

  // Perform search
  useEffect(() => {
    if (query.trim()) {
      const searchResults = fuse.search(query)
      const formattedResults = searchResults
        .slice(0, 10)
        .map(result => ({
          ...result.item,
          relevance: 1 - (result.score || 0),
        }))
      setResults(formattedResults)
    } else {
      setResults([])
    }
  }, [query, fuse])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setShowFilters(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FileText className="w-4 h-4 text-blue-600" />
      case 'phase':
        return <GitCommit className="w-4 h-4 text-purple-600" />
      case 'sprint':
        return <Target className="w-4 h-4 text-green-600" />
      case 'task':
        return <Clock className="w-4 h-4 text-orange-600" />
      case 'activity':
        return <User className="w-4 h-4 text-gray-600" />
      default:
        return <Search className="w-4 h-4 text-gray-400" />
    }
  }

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'project':
        return 'bg-blue-100 text-blue-800'
      case 'phase':
        return 'bg-purple-100 text-purple-800'
      case 'sprint':
        return 'bg-green-100 text-green-800'
      case 'task':
        return 'bg-orange-100 text-orange-800'
      case 'activity':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const handleResultClick = (result: SearchResult) => {
    // Handle navigation to result
    console.log('Navigate to:', result)
    setIsOpen(false)
    setQuery('')
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setShowFilters(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={searchRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search projects, phases, sprints..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false)
                  setShowFilters(false)
                  e.currentTarget.blur()
                }
              }}
              className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  setResults([])
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`ml-2 p-2 border rounded-lg transition-colors ${
              showFilters 
                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
          >
            <h4 className="text-sm font-medium text-gray-900 mb-3">Advanced Filters</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Range */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Date Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={filters.dateRange[0]?.toISOString().split('T')[0] || ''}
                    onChange={(e) => updateFilters({
                      dateRange: [e.target.value ? new Date(e.target.value) : null, filters.dateRange[1]]
                    })}
                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={filters.dateRange[1]?.toISOString().split('T')[0] || ''}
                    onChange={(e) => updateFilters({
                      dateRange: [filters.dateRange[0], e.target.value ? new Date(e.target.value) : null]
                    })}
                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Status
                </label>
                <div className="flex flex-wrap gap-1">
                  {['not_started', 'in_progress', 'completed', 'blocked'].map(status => (
                    <button
                      key={status}
                      onClick={() => updateFilters({
                        status: filters.status.includes(status as any)
                          ? filters.status.filter(s => s !== status)
                          : [...filters.status, status as any]
                      })}
                      className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                        filters.status.includes(status as any)
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => updateFilters({
                  dateRange: [null, null],
                  status: [],
                  assignee: [],
                  phase: [],
                })}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      <AnimatePresence>
        {isOpen && (query.trim() || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-96 overflow-y-auto"
          >
            {results.length > 0 ? (
              <div className="py-2">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                  {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                </div>
                
                {results.map((result, index) => (
                  <motion.button
                    key={result.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleResultClick(result)}
                    className="w-full px-3 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-b-0 flex items-start space-x-3"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getResultIcon(result.type)}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {result.title}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getResultTypeColor(result.type)}`}>
                          {result.type}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                        {result.description}
                      </p>
                      
                      {result.context && (
                        <p className="text-xs text-gray-400 truncate">
                          {result.context}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-xs text-gray-400">
                      {Math.round(result.relevance * 100)}%
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="px-3 py-6 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No results found for "{query}"</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try different keywords or check your spelling
                </p>
              </div>
            ) : (
              <div className="px-3 py-4 text-center text-gray-500">
                <div className="text-xs">
                  Start typing to search projects, phases, sprints, tasks, and activities
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}