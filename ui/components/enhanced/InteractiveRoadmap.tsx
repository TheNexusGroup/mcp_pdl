'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Calendar,
  Target,
  Users,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  Play,
  Pause
} from 'lucide-react'
import { Project, RoadmapPhase, PhaseStatus, Sprint } from '@/lib/types'
import { format, formatDistanceToNow, parseISO } from 'date-fns'

interface InteractiveRoadmapProps {
  project: Project
}

export function InteractiveRoadmap({ project }: InteractiveRoadmapProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)

  const getPhaseStatusIcon = (status: PhaseStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />
      case 'in_progress':
        return <Clock className="w-6 h-6 text-blue-600 animate-pulse" />
      case 'blocked':
        return <AlertTriangle className="w-6 h-6 text-red-600" />
      default:
        return <Clock className="w-6 h-6 text-gray-400" />
    }
  }

  const getPhaseColor = (status: PhaseStatus) => {
    switch (status) {
      case 'completed':
        return 'from-green-500 to-green-600'
      case 'in_progress':
        return 'from-blue-500 to-blue-600'
      case 'blocked':
        return 'from-red-500 to-red-600'
      default:
        return 'from-gray-400 to-gray-500'
    }
  }

  const getStatusBadgeColor = (status: PhaseStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'blocked':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const togglePhaseExpansion = (phaseId: string) => {
    setExpandedPhase(expandedPhase === phaseId ? null : phaseId)
  }

  const selectPhase = (phaseId: string) => {
    setSelectedPhase(selectedPhase === phaseId ? null : phaseId)
  }

  return (
    <div className="space-y-6">
      {/* Roadmap Header */}
      <div className="text-center mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Interactive Project Roadmap</h3>
        <p className="text-gray-700 max-w-2xl mx-auto mb-4">
          {project.roadmap.vision}
        </p>
        <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>
              {format(parseISO(project.roadmap.timeline_start), 'MMM d, yyyy')} - {' '}
              {format(parseISO(project.roadmap.timeline_end), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <span>{project.roadmap.overall_progress}% Complete</span>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 via-purple-200 to-blue-200"></div>

        <div className="space-y-8">
          {project.roadmap.roadmap_phases.map((phase, index) => {
            const isExpanded = expandedPhase === phase.roadmap_phase_id
            const isSelected = selectedPhase === phase.roadmap_phase_id
            const activeSprints = phase.sprints.filter(sprint => sprint.status === 'active').length
            const completedSprints = phase.sprints.filter(sprint => sprint.status === 'completed').length
            
            return (
              <motion.div
                key={phase.roadmap_phase_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                {/* Timeline Node */}
                <motion.div 
                  className={`
                    absolute left-4 w-8 h-8 rounded-full border-4 border-white shadow-lg z-10 flex items-center justify-center
                    ${phase.status === 'completed' ? 'bg-green-500' : 
                      phase.status === 'in_progress' ? 'bg-blue-500' : 
                      phase.status === 'blocked' ? 'bg-red-500' : 'bg-gray-400'}
                  `}
                  whileHover={{ scale: 1.1 }}
                >
                  {getPhaseStatusIcon(phase.status)}
                </motion.div>

                {/* Phase Card */}
                <motion.div
                  onClick={() => selectPhase(phase.roadmap_phase_id)}
                  whileHover={{ scale: 1.01 }}
                  className={`
                    ml-16 p-6 bg-white rounded-xl border-2 cursor-pointer transition-all duration-300
                    ${isSelected 
                      ? 'border-blue-500 shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10' 
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                    }
                  `}
                >
                  {/* Phase Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          Phase {index + 1}: {phase.phase_name}
                        </h4>
                        <span className={`px-3 py-1 text-xs font-medium border rounded-full ${getStatusBadgeColor(phase.status)}`}>
                          {phase.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{phase.phase_description}</p>
                      <div className="text-sm text-blue-600 font-medium">
                        🎯 {phase.objective}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePhaseExpansion(phase.roadmap_phase_id)
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{phase.completion_percentage}%</span>
                    </div>
                    <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${phase.completion_percentage}%` }}
                        transition={{ duration: 1.5, ease: 'easeOut', delay: index * 0.1 }}
                        className={`h-full bg-gradient-to-r ${getPhaseColor(phase.status)} rounded-full relative`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Phase Metrics */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <div className="text-sm font-semibold text-blue-900">
                        {formatDistanceToNow(parseISO(phase.start_date))}
                      </div>
                      <div className="text-xs text-blue-700">Duration</div>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <Target className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <div className="text-sm font-semibold text-green-900">
                        {phase.deliverables.length}
                      </div>
                      <div className="text-xs text-green-700">Deliverables</div>
                    </div>
                    
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                      <div className="text-sm font-semibold text-purple-900">
                        {phase.sprints.length}
                      </div>
                      <div className="text-xs text-purple-700">Sprints</div>
                    </div>
                    
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <Users className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                      <div className="text-sm font-semibold text-orange-900">
                        {activeSprints}
                      </div>
                      <div className="text-xs text-orange-700">Active</div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-gray-200 pt-4 mt-4"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Deliverables */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                              <Target className="w-4 h-4 mr-2 text-blue-600" />
                              Deliverables
                            </h5>
                            <ul className="space-y-2">
                              {phase.deliverables.map((deliverable, idx) => (
                                <li key={idx} className="flex items-center text-sm text-gray-700">
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                  {deliverable}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Success Metrics */}
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                              <TrendingUp className="w-4 h-4 mr-2 text-purple-600" />
                              Success Metrics
                            </h5>
                            <ul className="space-y-2">
                              {phase.success_metrics.map((metric, idx) => (
                                <li key={idx} className="flex items-center text-sm text-gray-700">
                                  <Target className="w-4 h-4 mr-2 text-purple-600" />
                                  {metric}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Sprints */}
                        {phase.sprints.length > 0 && (
                          <div className="mt-6">
                            <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-orange-600" />
                              Sprints ({completedSprints}/{phase.sprints.length} completed)
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {phase.sprints.map((sprint) => (
                                <SprintCard key={sprint.sprint_id} sprint={sprint} />
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Milestones */}
      {project.roadmap.milestones.length > 0 && (
        <div className="mt-12 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-purple-600" />
            Key Milestones
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.roadmap.milestones.map((milestone) => (
              <motion.div
                key={milestone.milestone_id}
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-white rounded-lg border border-purple-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{milestone.name}</h5>
                  <span className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${milestone.status === 'achieved' 
                      ? 'bg-green-100 text-green-800' 
                      : milestone.status === 'missed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                    }
                  `}>
                    {milestone.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                <div className="text-xs text-gray-500">
                  Target: {format(parseISO(milestone.target_date), 'MMM d, yyyy')}
                </div>
                {milestone.achieved_date && (
                  <div className="text-xs text-green-600">
                    Achieved: {format(parseISO(milestone.achieved_date), 'MMM d, yyyy')}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Sprint Card Component
interface SprintCardProps {
  sprint: Sprint
}

function SprintCard({ sprint }: SprintCardProps) {
  const getSprintStatusIcon = () => {
    switch (sprint.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'active':
        return <Play className="w-4 h-4 text-blue-600" />
      case 'planning':
        return <Pause className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getSprintStatusColor = () => {
    switch (sprint.status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'planning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <h6 className="font-medium text-sm text-gray-900">{sprint.sprint_name}</h6>
        {getSprintStatusIcon()}
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <span className={`px-2 py-1 text-xs font-medium border rounded-full ${getSprintStatusColor()}`}>
          {sprint.status}
        </span>
        <span className="text-xs text-gray-500">
          Velocity: {sprint.velocity}
        </span>
      </div>
      
      <div className="text-xs text-gray-500">
        {format(parseISO(sprint.start_date), 'MMM d')} - {format(parseISO(sprint.end_date), 'MMM d')}
      </div>
      
      {sprint.pdl_cycles.length > 0 && (
        <div className="mt-2 text-xs text-blue-600">
          {sprint.pdl_cycles.length} PDL cycle{sprint.pdl_cycles.length !== 1 ? 's' : ''}
        </div>
      )}
    </motion.div>
  )
}