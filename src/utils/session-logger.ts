import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { getWebSocketServer } from '../websocket/websocket-server.js'

export interface PDLLogEntry {
  timestamp: string
  session_id: string
  project_name: string
  command: string
  operation: 'init' | 'create' | 'update' | 'get' | 'advance' | 'track'
  parameters: Record<string, any>
  result?: any
  error?: string
  duration_ms?: number
  user_context?: {
    working_directory: string
    git_branch?: string
    git_commit?: string
  }
  supporting_documentation?: string[]
}

export interface SessionContext {
  session_id: string
  project_name: string
  started_at: string
  last_activity: string
  working_directory: string
  total_commands: number
  git_context?: {
    branch: string
    commit: string
    repository: string
  }
}

export class SessionLogger {
  private static instance: SessionLogger
  private sessionId: string
  private logsDirectory: string
  private currentProject: string | null = null
  private sessionContext: SessionContext | null = null

  private constructor() {
    this.sessionId = this.generateSessionId()
    this.logsDirectory = path.join(process.cwd(), '.claude', 'logs')
    this.ensureLogsDirectory()
  }

  public static getInstance(): SessionLogger {
    if (!SessionLogger.instance) {
      SessionLogger.instance = new SessionLogger()
    }
    return SessionLogger.instance
  }

  private generateSessionId(): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
    const uuid = randomUUID().split('-')[0]
    return `${timestamp}-${uuid}`
  }

  private async ensureLogsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logsDirectory, { recursive: true })
    } catch (error) {
      console.error('Failed to create logs directory:', error)
    }
  }

  public async initializeSession(projectName: string, workingDirectory: string): Promise<void> {
    this.currentProject = projectName
    
    // Try to get git context
    const gitContext = await this.getGitContext(workingDirectory)
    
    this.sessionContext = {
      session_id: this.sessionId,
      project_name: projectName,
      started_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      working_directory: workingDirectory,
      total_commands: 0,
      git_context: gitContext
    }

    // Create session context file
    const sessionFile = path.join(this.logsDirectory, `session-${this.sessionId}.context.json`)
    await this.writeToFile(sessionFile, JSON.stringify(this.sessionContext, null, 2))
  }

  private async getGitContext(workingDirectory: string): Promise<SessionContext['git_context']> {
    try {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      const [branchResult, commitResult, remoteResult] = await Promise.all([
        execAsync('git branch --show-current', { cwd: workingDirectory }).catch(() => ({ stdout: '' })),
        execAsync('git rev-parse HEAD', { cwd: workingDirectory }).catch(() => ({ stdout: '' })),
        execAsync('git config --get remote.origin.url', { cwd: workingDirectory }).catch(() => ({ stdout: '' }))
      ])

      return {
        branch: branchResult.stdout.trim() || 'unknown',
        commit: commitResult.stdout.trim() || 'unknown',
        repository: remoteResult.stdout.trim() || 'unknown'
      }
    } catch {
      return undefined
    }
  }

  public async logPDLCommand(
    command: string,
    operation: PDLLogEntry['operation'],
    parameters: Record<string, any>,
    result?: any,
    error?: string,
    duration?: number,
    supportingDocs?: string[]
  ): Promise<void> {
    if (!this.currentProject || !this.sessionContext) {
      console.warn('Session not initialized. Call initializeSession first.')
      return
    }

    const entry: PDLLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      project_name: this.currentProject,
      command,
      operation,
      parameters: this.sanitizeParameters(parameters),
      result: result ? this.sanitizeResult(result) : undefined,
      error,
      duration_ms: duration,
      user_context: {
        working_directory: this.sessionContext.working_directory,
        git_branch: this.sessionContext.git_context?.branch,
        git_commit: this.sessionContext.git_context?.commit
      },
      supporting_documentation: supportingDocs
    }

    // Update session context
    this.sessionContext.last_activity = entry.timestamp
    this.sessionContext.total_commands += 1

    // Write to project-specific PDL log
    const logFile = path.join(this.logsDirectory, `session-${this.sessionId}.pdl`)
    await this.appendToFile(logFile, JSON.stringify(entry) + '\n')

    // Update session context file
    const sessionFile = path.join(this.logsDirectory, `session-${this.sessionId}.context.json`)
    await this.writeToFile(sessionFile, JSON.stringify(this.sessionContext, null, 2))

    // Also create project-specific aggregated log
    await this.updateProjectLog(entry)

    // Broadcast log update via WebSocket if server is running
    const wsServer = getWebSocketServer();
    if (wsServer) {
      wsServer.broadcastLogUpdate(this.currentProject, this.sessionId, entry);
    }
  }

  private async updateProjectLog(entry: PDLLogEntry): Promise<void> {
    const projectLogFile = path.join(this.logsDirectory, `project-${entry.project_name}.pdl`)
    await this.appendToFile(projectLogFile, JSON.stringify(entry) + '\n')
  }

  private sanitizeParameters(params: Record<string, any>): Record<string, any> {
    // Remove sensitive data and large objects for cleaner logs
    const sanitized = { ...params }
    
    // Remove or truncate large strings
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = sanitized[key].substring(0, 1000) + '... [truncated]'
      }
    })

    return sanitized
  }

  private sanitizeResult(result: any): any {
    // Similar sanitization for results
    if (typeof result === 'string' && result.length > 2000) {
      return result.substring(0, 2000) + '... [truncated]'
    }
    return result
  }

  private async writeToFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf8')
    } catch (error) {
      console.error(`Failed to write to ${filePath}:`, error)
    }
  }

  private async appendToFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.appendFile(filePath, content, 'utf8')
    } catch (error) {
      console.error(`Failed to append to ${filePath}:`, error)
    }
  }

  public getSessionId(): string {
    return this.sessionId
  }

  public getCurrentProject(): string | null {
    return this.currentProject
  }

  public getSessionContext(): SessionContext | null {
    return this.sessionContext
  }

  // Read logs functionality
  public async getSessionLogs(sessionId?: string): Promise<PDLLogEntry[]> {
    const targetSessionId = sessionId || this.sessionId
    const logFile = path.join(this.logsDirectory, `session-${targetSessionId}.pdl`)
    
    try {
      const content = await fs.readFile(logFile, 'utf8')
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
    } catch (error) {
      console.error(`Failed to read session logs for ${targetSessionId}:`, error)
      return []
    }
  }

  public async getProjectLogs(projectName: string): Promise<PDLLogEntry[]> {
    const logFile = path.join(this.logsDirectory, `project-${projectName}.pdl`)
    
    try {
      const content = await fs.readFile(logFile, 'utf8')
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
    } catch (error) {
      console.error(`Failed to read project logs for ${projectName}:`, error)
      return []
    }
  }

  public async getAllSessions(): Promise<SessionContext[]> {
    try {
      const files = await fs.readdir(this.logsDirectory)
      const contextFiles = files.filter(file => file.endsWith('.context.json'))
      
      const sessions: SessionContext[] = []
      for (const file of contextFiles) {
        try {
          const content = await fs.readFile(path.join(this.logsDirectory, file), 'utf8')
          sessions.push(JSON.parse(content))
        } catch (error) {
          console.error(`Failed to read context file ${file}:`, error)
        }
      }
      
      return sessions.sort((a, b) => b.started_at.localeCompare(a.started_at))
    } catch (error) {
      console.error('Failed to get all sessions:', error)
      return []
    }
  }

  // Documentation tracking
  public async addSupportingDocumentation(
    command: string,
    documentPaths: string[],
    description?: string
  ): Promise<void> {
    const entry: PDLLogEntry = {
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      project_name: this.currentProject || 'unknown',
      command: 'add_documentation',
      operation: 'update',
      parameters: {
        target_command: command,
        description,
        document_count: documentPaths.length
      },
      supporting_documentation: documentPaths
    }

    const logFile = path.join(this.logsDirectory, `session-${this.sessionId}.pdl`)
    await this.appendToFile(logFile, JSON.stringify(entry) + '\n')
  }

  // Export logs in different formats
  public async exportLogs(format: 'json' | 'csv' | 'markdown', sessionId?: string): Promise<string> {
    const logs = await this.getSessionLogs(sessionId)
    
    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2)
      
      case 'csv':
        return this.logsToCSV(logs)
      
      case 'markdown':
        return this.logsToMarkdown(logs)
      
      default:
        return JSON.stringify(logs, null, 2)
    }
  }

  private logsToCSV(logs: PDLLogEntry[]): string {
    const headers = ['timestamp', 'command', 'operation', 'project_name', 'duration_ms', 'error', 'supporting_docs_count']
    const rows = logs.map(log => [
      log.timestamp,
      log.command,
      log.operation,
      log.project_name,
      log.duration_ms || '',
      log.error || '',
      log.supporting_documentation?.length || 0
    ])
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  private logsToMarkdown(logs: PDLLogEntry[]): string {
    const sessionContext = this.getSessionContext()
    let md = `# PDL Session Log\n\n`
    
    if (sessionContext) {
      md += `**Session ID:** ${sessionContext.session_id}\n`
      md += `**Project:** ${sessionContext.project_name}\n`
      md += `**Started:** ${sessionContext.started_at}\n`
      md += `**Working Directory:** ${sessionContext.working_directory}\n`
      if (sessionContext.git_context) {
        md += `**Git Branch:** ${sessionContext.git_context.branch}\n`
        md += `**Git Commit:** ${sessionContext.git_context.commit}\n`
      }
      md += `**Total Commands:** ${sessionContext.total_commands}\n\n`
    }

    md += `## Command History\n\n`
    
    logs.forEach((log, index) => {
      md += `### ${index + 1}. ${log.command}\n`
      md += `- **Time:** ${log.timestamp}\n`
      md += `- **Operation:** ${log.operation}\n`
      if (log.duration_ms) md += `- **Duration:** ${log.duration_ms}ms\n`
      if (log.error) md += `- **Error:** ${log.error}\n`
      if (log.supporting_documentation?.length) {
        md += `- **Supporting Documents:** ${log.supporting_documentation.length} files\n`
        log.supporting_documentation.forEach(doc => {
          md += `  - \`${doc}\`\n`
        })
      }
      md += '\n'
    })

    return md
  }
}

// Singleton instance
export const sessionLogger = SessionLogger.getInstance()