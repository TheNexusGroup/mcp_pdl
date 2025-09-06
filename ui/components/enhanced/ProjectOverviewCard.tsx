'use client'

import { motion } from 'framer-motion'
import { Calendar, Users, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { Project, PhaseStatus } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

interface ProjectOverviewCardProps {
  project: Project
  isSelected: boolean
  onSelect: () => void
}

export function ProjectOverviewCard({ project, isSelected, onSelect }: ProjectOverviewCardProps) {
  const getStatusIcon = (status: PhaseStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'in_progress':
        return <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
      case 'blocked':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (progress: number) => {
    if (progress >= 80) return 'from-green-500 to-green-600'
    if (progress >= 60) return 'from-blue-500 to-blue-600'
    if (progress >= 40) return 'from-yellow-500 to-yellow-600'
    return 'from-gray-400 to-gray-500'
  }

  const currentPhase = project.roadmap.roadmap_phases.find(phase => phase.status === 'in_progress')
  const completedPhases = project.roadmap.roadmap_phases.filter(phase => phase.status === 'completed').length
  const totalPhases = project.roadmap.roadmap_phases.length
  const activeSprints = project.roadmap.roadmap_phases.reduce((total, phase) => 
    total + phase.sprints.filter(sprint => sprint.status === 'active').length, 0
  )

  return (
    <motion.div
      onClick={onSelect}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative bg-white/90 backdrop-blur-sm rounded-xl border-2 p-6 cursor-pointer 
        transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10
        ${isSelected 
          ? 'border-blue-500 shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10' 
          : 'border-gray-200 hover:border-blue-300'
        }
      `}
    >
      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
        >
          <CheckCircle className="w-4 h-4 text-white" />
        </motion.div>
      )}

      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
            {project.project_name}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {project.description}
          </p>
        </div>

        {/* Current Phase Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {currentPhase && getStatusIcon(currentPhase.status)}
              <span className="text-sm font-medium text-gray-700">
                {currentPhase ? currentPhase.phase_name : 'Planning'}
              </span>
            </div>
            <span className="text-xs font-medium text-gray-500">
              Phase {completedPhases + 1} of {totalPhases}
            </span>
          </div>

          {/* Progress Visualization */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-gray-600">
              <span>Overall Progress</span>
              <span>{Math.round(project.roadmap.overall_progress)}%</span>
            </div>
            
            <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${project.roadmap.overall_progress}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className={`h-full bg-gradient-to-r ${getStatusColor(project.roadmap.overall_progress)} rounded-full relative`}
              >
                {/* Progress shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-200 rounded-full mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-semibold text-blue-900">
              {totalPhases}
            </div>
            <div className="text-xs text-blue-700">Phases</div>
          </div>
          
          <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 bg-green-200 rounded-full mx-auto mb-2">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-lg font-semibold text-green-900">
              {activeSprints}
            </div>
            <div className="text-xs text-green-700">Active</div>
          </div>
          
          <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 bg-purple-200 rounded-full mx-auto mb-2">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg font-semibold text-purple-900">
              {Object.values(project.team_composition).flat().filter(Boolean).length}
            </div>
            <div className="text-xs text-purple-700">Team</div>
          </div>
        </div>

        {/* Footer with timestamps */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
            <span>Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Pulse animation for active projects */}
        {currentPhase?.status === 'in_progress' && (
          <motion.div
            animate={{ 
              boxShadow: [
                '0 0 0 0 rgba(59, 130, 246, 0)',
                '0 0 0 8px rgba(59, 130, 246, 0.1)',
                '0 0 0 0 rgba(59, 130, 246, 0)'
              ] 
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-xl pointer-events-none"
          />
        )}
      </div>
    </motion.div>
  )
}