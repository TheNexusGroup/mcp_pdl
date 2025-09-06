import { sessionLogger, PDLLogEntry } from './session-logger.js'
import { getWebSocketServer } from '../websocket/websocket-server.js'

export interface PDLCommandContext {
  startTime: number
  command: string
  operation: PDLLogEntry['operation']
  parameters: Record<string, any>
  supportingDocumentation?: string[]
}

export class PDLMiddleware {
  private static contexts: Map<string, PDLCommandContext> = new Map()

  /**
   * Start logging a PDL command
   */
  public static async startCommand(
    command: string,
    operation: PDLLogEntry['operation'],
    parameters: Record<string, any>,
    supportingDocs?: string[]
  ): Promise<string> {
    const contextId = `${command}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const context: PDLCommandContext = {
      startTime: Date.now(),
      command,
      operation,
      parameters,
      supportingDocumentation: supportingDocs
    }

    this.contexts.set(contextId, context)
    
    // Initialize session if not already done
    if (!sessionLogger.getCurrentProject() && parameters.project_name) {
      await sessionLogger.initializeSession(
        parameters.project_name,
        process.cwd()
      )
    }

    return contextId
  }

  /**
   * Complete logging a PDL command
   */
  public static async endCommand(
    contextId: string,
    result?: any,
    error?: string
  ): Promise<void> {
    const context = this.contexts.get(contextId)
    if (!context) {
      console.warn(`No context found for command ID: ${contextId}`)
      return
    }

    const duration = Date.now() - context.startTime

    await sessionLogger.logPDLCommand(
      context.command,
      context.operation,
      context.parameters,
      result,
      error,
      duration,
      context.supportingDocumentation
    )

    this.contexts.delete(contextId)
  }

  /**
   * Add supporting documentation to a command context
   */
  public static addSupportingDocumentation(
    contextId: string,
    documentPaths: string[]
  ): void {
    const context = this.contexts.get(contextId)
    if (context) {
      context.supportingDocumentation = [
        ...(context.supportingDocumentation || []),
        ...documentPaths
      ]
    }
  }

  /**
   * Decorator for PDL functions
   */
  public static withLogging(
    command: string,
    operation: PDLLogEntry['operation']
  ) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value

      descriptor.value = async function (...args: any[]) {
        const parameters = args[0] || {}
        const supportingDocs = parameters.supporting_documentation
        
        const contextId = await PDLMiddleware.startCommand(
          command,
          operation,
          parameters,
          supportingDocs
        )

        try {
          const result = await originalMethod.apply(this, args)
          await PDLMiddleware.endCommand(contextId, result)
          
          // Broadcast WebSocket update based on operation type
          const wsServer = getWebSocketServer()
          if (wsServer && parameters.project_name) {
            switch (operation) {
              case 'init':
                wsServer.broadcastProjectUpdate(parameters.project_name, 'project_initialized', result)
                break
              case 'update':
                if (command.includes('phase')) {
                  wsServer.broadcastPhaseUpdate(parameters.project_name, result)
                } else if (command.includes('sprint')) {
                  wsServer.broadcastSprintUpdate(parameters.project_name, result)
                } else if (command.includes('pdl')) {
                  wsServer.broadcastPDLUpdate(parameters.project_name, result)
                } else {
                  wsServer.broadcastProjectUpdate(parameters.project_name, command, result)
                }
                break
              case 'create':
                if (command.includes('roadmap')) {
                  wsServer.broadcastProjectUpdate(parameters.project_name, 'roadmap_created', result)
                } else if (command.includes('sprint')) {
                  wsServer.broadcastSprintUpdate(parameters.project_name, result)
                } else {
                  wsServer.broadcastProjectUpdate(parameters.project_name, command, result)
                }
                break
              case 'advance':
                wsServer.broadcastPDLUpdate(parameters.project_name, result)
                break
              default:
                wsServer.broadcastProjectUpdate(parameters.project_name, command, result)
            }
          }
          
          return result
        } catch (error) {
          await PDLMiddleware.endCommand(
            contextId,
            undefined,
            error instanceof Error ? error.message : String(error)
          )
          throw error
        }
      }

      return descriptor
    }
  }

  /**
   * Manual logging wrapper for function calls
   */
  public static async loggedCall<T>(
    command: string,
    operation: PDLLogEntry['operation'],
    parameters: Record<string, any>,
    fn: () => Promise<T>,
    supportingDocs?: string[]
  ): Promise<T> {
    const contextId = await this.startCommand(
      command,
      operation,
      parameters,
      supportingDocs
    )

    try {
      const result = await fn()
      await this.endCommand(contextId, result)
      return result
    } catch (error) {
      await this.endCommand(
        contextId,
        undefined,
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

// Convenience functions for common operations
export const logPDLInit = async (
  projectName: string,
  parameters: Record<string, any>,
  supportingDocs?: string[]
): Promise<string> => {
  return PDLMiddleware.startCommand('initialize_project', 'init', {
    project_name: projectName,
    ...parameters
  }, supportingDocs)
}

export const logPDLCreate = async (
  command: string,
  parameters: Record<string, any>,
  supportingDocs?: string[]
): Promise<string> => {
  return PDLMiddleware.startCommand(command, 'create', parameters, supportingDocs)
}

export const logPDLUpdate = async (
  command: string,
  parameters: Record<string, any>,
  supportingDocs?: string[]
): Promise<string> => {
  return PDLMiddleware.startCommand(command, 'update', parameters, supportingDocs)
}

export const logPDLAdvance = async (
  command: string,
  parameters: Record<string, any>,
  supportingDocs?: string[]
): Promise<string> => {
  return PDLMiddleware.startCommand(command, 'advance', parameters, supportingDocs)
}

export const endPDLLog = async (
  contextId: string,
  result?: any,
  error?: string
): Promise<void> => {
  return PDLMiddleware.endCommand(contextId, result, error)
}

// Helper function to resolve absolute paths for documentation
export async function resolveDocumentationPaths(
  relativePaths: string[],
  baseDir: string = process.cwd()
): Promise<string[]> {
  const path = await import('path')
  const fs = await import('fs').then(m => m.promises)
  
  const resolvedPaths: string[] = []
  
  for (const relativePath of relativePaths) {
    try {
      const absolutePath = path.resolve(baseDir, relativePath)
      
      // Verify file exists
      await fs.access(absolutePath)
      resolvedPaths.push(absolutePath)
    } catch (error) {
      console.warn(`Documentation file not found: ${relativePath}`)
      // Still add it to the list but mark as missing
      resolvedPaths.push(`${relativePath} [MISSING]`)
    }
  }
  
  return resolvedPaths
}

// Documentation helper for agents
export interface AgentDocumentationHelper {
  addPhaseDocumentation(
    phaseNumber: number,
    documentPaths: string[],
    description?: string
  ): Promise<void>
  
  addSprintDocumentation(
    sprintId: string,
    documentPaths: string[],
    description?: string
  ): Promise<void>
  
  addTaskDocumentation(
    taskId: string,
    documentPaths: string[],
    description?: string
  ): Promise<void>
}

export const createDocumentationHelper = (): AgentDocumentationHelper => ({
  async addPhaseDocumentation(
    phaseNumber: number,
    documentPaths: string[],
    description?: string
  ) {
    const resolvedPaths = await resolveDocumentationPaths(documentPaths)
    await sessionLogger.addSupportingDocumentation(
      `phase_${phaseNumber}_documentation`,
      resolvedPaths,
      description
    )
  },

  async addSprintDocumentation(
    sprintId: string,
    documentPaths: string[],
    description?: string
  ) {
    const resolvedPaths = await resolveDocumentationPaths(documentPaths)
    await sessionLogger.addSupportingDocumentation(
      `sprint_${sprintId}_documentation`,
      resolvedPaths,
      description
    )
  },

  async addTaskDocumentation(
    taskId: string,
    documentPaths: string[],
    description?: string
  ) {
    const resolvedPaths = await resolveDocumentationPaths(documentPaths)
    await sessionLogger.addSupportingDocumentation(
      `task_${taskId}_documentation`,
      resolvedPaths,
      description
    )
  }
})

export const documentationHelper = createDocumentationHelper()