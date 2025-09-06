'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, 
  User, 
  Terminal,
  GitBranch,
  FolderOpen,
  Download,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle,
  Zap,
  FileText,
  Eye,
  ChevronDown,
  ChevronRight,
  Trash2
} from 'lucide-react'
import { PDLLogEntry, PDLSession, CommandSummary } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow, parseISO, format } from 'date-fns'

interface SessionLogViewerProps {
  sessions?: PDLSession[]
  onExportLogs?: (sessionId: string, format: 'json' | 'csv' | 'markdown') => void
  onDeleteSession?: (sessionId: string) => void
  className?: string
}

export function SessionLogViewer({
  sessions = [],
  onExportLogs,
  onDeleteSession,
  className = ''
}: SessionLogViewerProps) {
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [logEntries, setLogEntries] = useState<PDLLogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterOperation, setFilterOperation] = useState<string>('all')
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set())

  // Mock function to load log entries for a session
  const loadSessionLogs = async (sessionId: string) => {
    // In a real implementation, this would load from the session logger
    const mockLogs: PDLLogEntry[] = [
      {
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        project_name: 'mcp-pdl-ui-enhancement',
        command: 'initialize_project',
        operation: 'init',
        parameters: { project_name: 'mcp-pdl-ui-enhancement', description: 'UI Enhancement Project' },
        result: { success: true },
        duration_ms: 250,
        user_context: {
          working_directory: '/home/persist/repos/lib/mcp_pdl',
          git_branch: 'main',
          git_commit: 'abc123'
        },
        supporting_documentation: ['/path/to/requirements.md', '/path/to/design.figma']
      }
    ]
    setLogEntries(mockLogs)
  }

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSession(sessionId)
    loadSessionLogs(sessionId)
  }

  const filteredLogs = useMemo(() => {
    return logEntries.filter(log => {
      const matchesSearch = searchTerm === '' || 
        log.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.error && log.error.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesOperation = filterOperation === 'all' || log.operation === filterOperation

      return matchesSearch && matchesOperation
    })
  }, [logEntries, searchTerm, filterOperation])

  const toggleDetails = (logId: string) => {
    const newDetails = new Set(showDetails)
    if (newDetails.has(logId)) {
      newDetails.delete(logId)
    } else {
      newDetails.add(logId)
    }
    setShowDetails(newDetails)
  }

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'init':
        return <Zap className="w-4 h-4 text-purple-600" />
      case 'create':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'update':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'get':
        return <Eye className="w-4 h-4 text-cyan-600" />
      case 'advance':
        return <ChevronRight className="w-4 h-4 text-indigo-600" />
      case 'track':
        return <Terminal className="w-4 h-4 text-orange-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'init':
        return 'border-purple-200 bg-purple-50'
      case 'create':
        return 'border-green-200 bg-green-50'
      case 'update':
        return 'border-blue-200 bg-blue-50'
      case 'get':
        return 'border-cyan-200 bg-cyan-50'
      case 'advance':
        return 'border-indigo-200 bg-indigo-50'
      case 'track':
        return 'border-orange-200 bg-orange-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Terminal className="w-6 h-6 mr-3 text-blue-600" />
          PDL Session Logs
        </h2>
        <p className="text-gray-600 mt-1">
          View and manage session activity logs for all projects
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
        {/* Sessions List */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Sessions</h3>
            <span className="text-sm text-gray-500">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <SessionCard
                  key={session.session_id}
                  session={session}
                  isSelected={selectedSession === session.session_id}
                  onSelect={() => handleSessionSelect(session.session_id)}
                  onDelete={() => onDeleteSession?.(session.session_id)}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm">No sessions found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Sessions will appear here as you work with PDL commands
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Log Entries */}
        <div className="lg:col-span-2 p-6">
          {selectedSession ? (
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="font-medium text-gray-900">
                  Session Logs ({filteredLogs.length} entries)
                </h3>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => onExportLogs?.(selectedSession, 'json')}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export JSON
                  </Button>
                  <Button
                    onClick={() => onExportLogs?.(selectedSession, 'csv')}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export CSV
                  </Button>
                  <Button
                    onClick={() => onExportLogs?.(selectedSession, 'markdown')}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Export MD
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search commands, projects, errors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <select
                  value={filterOperation}
                  onChange={(e) => setFilterOperation(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Operations</option>
                  <option value="init">Initialize</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="get">Get</option>
                  <option value="advance">Advance</option>
                  <option value="track">Track</option>
                </select>
              </div>

              {/* Log Entries */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, index) => (
                    <LogEntryCard
                      key={`${log.timestamp}-${index}`}
                      log={log}
                      showDetails={showDetails.has(`${log.timestamp}-${index}`)}
                      onToggleDetails={() => toggleDetails(`${log.timestamp}-${index}`)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm">No log entries match your criteria</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-900 mb-2">Select a Session</p>
                <p className="text-sm">Choose a session from the left to view its logs</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Session Card Component
interface SessionCardProps {
  session: PDLSession
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

function SessionCard({ session, isSelected, onSelect, onDelete }: SessionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onSelect}
      className={`p-4 border rounded-lg cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm text-gray-900 truncate">
            {session.project_name}
          </h4>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {formatDistanceToNow(parseISO(session.started_at), { addSuffix: true })}
          </div>
          
          {session.git_context && (
            <div className="flex items-center">
              <GitBranch className="w-3 h-3 mr-1" />
              {session.git_context.branch}
            </div>
          )}

          <div className="flex items-center">
            <Terminal className="w-3 h-3 mr-1" />
            {session.total_commands} commands
          </div>
        </div>

        <div className="text-xs font-mono text-gray-500 truncate">
          {session.session_id.slice(0, 16)}...
        </div>
      </div>
    </motion.div>
  )
}

// Log Entry Card Component
interface LogEntryCardProps {
  log: PDLLogEntry
  showDetails: boolean
  onToggleDetails: () => void
}

function LogEntryCard({ log, showDetails, onToggleDetails }: LogEntryCardProps) {
  const hasError = !!log.error

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 border-l-4 rounded-r-lg ${
        hasError 
          ? 'border-red-500 bg-red-50' 
          : getOperationColor(log.operation)
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {getOperationIcon(log.operation)}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-sm text-gray-900">{log.command}</h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                hasError
                  ? 'bg-red-100 text-red-800'
                  : log.operation === 'init'
                  ? 'bg-purple-100 text-purple-800'
                  : log.operation === 'create'
                  ? 'bg-green-100 text-green-800'
                  : log.operation === 'update'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {log.operation}
              </span>
            </div>

            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span>{format(parseISO(log.timestamp), 'HH:mm:ss')}</span>
              {log.duration_ms && (
                <span>{log.duration_ms}ms</span>
              )}
              {log.supporting_documentation && log.supporting_documentation.length > 0 && (
                <span className="flex items-center">
                  <FileText className="w-3 h-3 mr-1" />
                  {log.supporting_documentation.length} docs
                </span>
              )}
            </div>

            {hasError && (
              <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-800">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                {log.error}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onToggleDetails}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        >
          {showDetails ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 space-y-3 text-xs"
          >
            {/* Parameters */}
            {log.parameters && Object.keys(log.parameters).length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Parameters:</h5>
                <pre className="p-3 bg-gray-100 rounded font-mono text-xs overflow-x-auto">
                  {JSON.stringify(log.parameters, null, 2)}
                </pre>
              </div>
            )}

            {/* Result */}
            {log.result && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Result:</h5>
                <pre className="p-3 bg-gray-100 rounded font-mono text-xs overflow-x-auto">
                  {JSON.stringify(log.result, null, 2)}
                </pre>
              </div>
            )}

            {/* Supporting Documentation */}
            {log.supporting_documentation && log.supporting_documentation.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Supporting Documentation:</h5>
                <ul className="space-y-1">
                  {log.supporting_documentation.map((doc, idx) => (
                    <li key={idx} className="flex items-center text-gray-700">
                      <FileText className="w-3 h-3 mr-2 text-blue-600" />
                      <span className="font-mono text-xs break-all">{doc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Context */}
            {log.user_context && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Context:</h5>
                <div className="space-y-1 text-gray-700">
                  <div className="flex items-center">
                    <FolderOpen className="w-3 h-3 mr-2" />
                    <span className="font-mono text-xs">{log.user_context.working_directory}</span>
                  </div>
                  {log.user_context.git_branch && (
                    <div className="flex items-center">
                      <GitBranch className="w-3 h-3 mr-2" />
                      <span className="text-xs">{log.user_context.git_branch}</span>
                      {log.user_context.git_commit && (
                        <span className="ml-2 font-mono text-xs text-gray-500">
                          ({log.user_context.git_commit.slice(0, 7)})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}