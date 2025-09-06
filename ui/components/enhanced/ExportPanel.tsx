'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Download, 
  FileJson, 
  FileText, 
  FileSpreadsheet,
  FileImage,
  Settings,
  Calendar,
  Users,
  GitCommit,
  Activity,
  ChevronDown,
  X,
  Check
} from 'lucide-react'
import { useExportActions, useStore } from '@/lib/store'
import { ExportFormat } from '@/lib/types/pdl-types'

interface ExportOptions {
  includeRoadmap: boolean
  includeSprints: boolean
  includeLogs: boolean
  includeTeam: boolean
  dateRange: [Date | null, Date | null]
}

import { Button } from '@/components/ui/button'

export function ExportPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'yaml' | 'csv' | 'pdf'>('json')
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeRoadmap: true,
    includeSprints: true,
    includeLogs: true,
    includeTeam: true,
    dateRange: [null, null],
  })
  const [isExporting, setIsExporting] = useState(false)

  const { exportProject, exportRoadmap, exportLogs, exportProjectData } = useExportActions()
  const selectedProject = useStore(state => state.selectedProject)
  const exportState = useStore(state => ({
    isExporting: state.isExporting,
    exportProgress: state.exportProgress,
    lastExport: state.lastExport,
  }))

  const formatOptions = [
    {
      format: 'json' as const,
      label: 'JSON',
      description: 'Structured data format for APIs and development',
      icon: <FileJson className="w-5 h-5 text-blue-600" />,
      extension: '.json',
      recommended: true,
    },
    {
      format: 'yaml' as const,
      label: 'YAML',
      description: 'Human-readable data serialization format',
      icon: <FileText className="w-5 h-5 text-green-600" />,
      extension: '.yaml',
    },
    {
      format: 'csv' as const,
      label: 'CSV',
      description: 'Comma-separated values for spreadsheets',
      icon: <FileSpreadsheet className="w-5 h-5 text-orange-600" />,
      extension: '.csv',
    },
    {
      format: 'pdf' as const,
      label: 'PDF',
      description: 'Formatted document for sharing and printing',
      icon: <FileImage className="w-5 h-5 text-red-600" />,
      extension: '.pdf',
    },
  ]

  const handleExport = async () => {
    if (!selectedProject) return

    setIsExporting(true)
    try {
      await exportProjectData(
        selectedProject.project_name,
        selectedFormat,
        {
          roadmap: exportOptions.includeRoadmap,
          sprints: exportOptions.includeSprints,
          logs: exportOptions.includeLogs,
          team: exportOptions.includeTeam,
        }
      )

      // Show success notification
      useStore.getState().addNotification({
        type: 'success',
        title: 'Export Complete',
        message: `Project data exported successfully as ${selectedFormat.toUpperCase()}`,
      })

      setIsOpen(false)
    } catch (error) {
      useStore.getState().addNotification({
        type: 'error',
        title: 'Export Failed',
        message: error instanceof Error ? error.message : 'Failed to export project data',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const getFormatInfo = (format: 'json' | 'yaml' | 'csv' | 'pdf') => {
    return formatOptions.find(opt => opt.format === format)
  }

  if (!selectedProject) {
    return (
      <Button variant="outline" size="sm" disabled className="text-xs">
        <Download className="w-4 h-4 mr-1" />
        Export
      </Button>
    )
  }

  return (
    <div className="relative">
      <Button 
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="text-xs"
        disabled={exportState.isExporting}
      >
        <Download className="w-4 h-4 mr-1" />
        {exportState.isExporting ? 'Exporting...' : 'Export'}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 flex items-center">
                  <Download className="w-4 h-4 mr-2 text-blue-600" />
                  Export Project Data
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Export "{selectedProject.project_name}" data
              </p>
            </div>

            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {/* Format Selection */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  Export Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {formatOptions.map((option) => (
                    <motion.button
                      key={option.format}
                      onClick={() => {
                        setSelectedFormat(option.format)
                        setExportOptions(prev => ({ ...prev, format: option.format }))
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        selectedFormat === option.format
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          {option.icon}
                          <span className="text-sm font-medium">{option.label}</span>
                        </div>
                        {option.recommended && (
                          <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{option.description}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Export Options */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block flex items-center">
                  <Settings className="w-3 h-3 mr-1" />
                  Include Data
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeRoadmap}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeRoadmap: e.target.checked 
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex items-center">
                      <GitCommit className="w-4 h-4 mr-1 text-purple-600" />
                      Roadmap & Phases
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeSprints}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeSprints: e.target.checked 
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-green-600" />
                      Sprints & Tasks
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeLogs}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeLogs: e.target.checked 
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex items-center">
                      <Activity className="w-4 h-4 mr-1 text-orange-600" />
                      Activity Logs
                    </span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeTeam}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeTeam: e.target.checked 
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex items-center">
                      <Users className="w-4 h-4 mr-1 text-blue-600" />
                      Team Information
                    </span>
                  </label>
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Date Range (Optional)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="date"
                    value={exportOptions.dateRange?.[0]?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      dateRange: e.target.value 
                        ? [new Date(e.target.value), prev.dateRange?.[1] || null]
                        : [null, prev.dateRange?.[1] || null]
                    }))}
                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={exportOptions.dateRange?.[1]?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      dateRange: e.target.value 
                        ? [prev.dateRange?.[0] || null, new Date(e.target.value)]
                        : [prev.dateRange?.[0] || null, null]
                    }))}
                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="To"
                  />
                </div>
              </div>

              {/* Export Progress */}
              {exportState.isExporting && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Exporting...</span>
                    <span className="text-sm text-blue-700">{exportState.exportProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${exportState.exportProgress}%` }}
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              )}

              {/* Last Export Info */}
              {exportState.lastExport && !exportState.isExporting && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center text-sm text-green-800">
                    <Check className="w-4 h-4 mr-2" />
                    <span>
                      Last exported as {exportState.lastExport.format.toUpperCase()} on{' '}
                      {exportState.lastExport.timestamp.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Format Preview */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-xs font-medium text-gray-700 mb-1">Preview:</div>
                <div className="text-xs text-gray-600">
                  {selectedProject.project_name}
                  {getFormatInfo(selectedFormat)?.extension}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Estimated size: ~{Math.round(JSON.stringify(selectedProject).length / 1024)}KB
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleExport}
                  disabled={exportState.isExporting}
                  size="sm"
                  className="text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-3 h-3 mr-1" />
                  {exportState.isExporting ? 'Exporting...' : `Export ${selectedFormat.toUpperCase()}`}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}