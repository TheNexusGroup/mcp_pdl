import { StateCreator } from 'zustand'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'pdl_update' | 'project_update' | 'phase_update' | 'sprint_update' | 'log_update' | 'error' | 'ping' | 'pong'
  payload?: any
  timestamp?: string
  project_name?: string
  session_id?: string
}

export interface WebSocketState {
  socket: WebSocket | null
  connectionStatus: ConnectionStatus
  connectionAttempts: number
  maxReconnectAttempts: number
  reconnectDelay: number
  lastMessage: WSMessage | null
  messageHistory: Array<{ timestamp: Date; message: WSMessage }>
  subscriptions: Set<string>
  sessionId: string | null
  heartbeatInterval: NodeJS.Timeout | null
}

export interface WebSocketActions {
  connect: (url?: string) => void
  disconnect: () => void
  subscribe: (projectName: string) => void
  unsubscribe: (projectName: string) => void
  sendMessage: (message: WSMessage) => void
  handleIncomingMessage: (message: WSMessage) => void
  clearHistory: () => void
  isConnected: () => boolean
  isConnecting: () => boolean
  startHeartbeat: () => void
  stopHeartbeat: () => void
}

export type WebSocketSlice = WebSocketState & WebSocketActions

export const createWebSocketSlice: StateCreator<
  WebSocketSlice,
  [['zustand/immer', never], ['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  WebSocketSlice
> = (set, get) => ({
  // State
  socket: null,
  connectionStatus: 'disconnected',
  connectionAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  lastMessage: null,
  messageHistory: [],
  subscriptions: new Set<string>(),
  sessionId: null,
  heartbeatInterval: null,

  // Actions
  connect: (url = 'ws://localhost:8080') => {
    const currentSocket = get().socket
    if (currentSocket) {
      currentSocket.close()
    }

    set((state) => {
      state.connectionStatus = 'connecting'
      state.connectionAttempts = 0
    })

    const connectWebSocket = () => {
      try {
        const socket = new WebSocket(url)
        
        socket.onopen = () => {
          set((state) => {
            state.connectionStatus = 'connected'
            state.socket = socket
            state.connectionAttempts = 0
            state.sessionId = `session-${Date.now()}`
          })
          
          // Send initial ping
          const pingMessage: WSMessage = {
            type: 'ping',
            payload: { client: 'pdl-ui' },
            timestamp: new Date().toISOString()
          }
          socket.send(JSON.stringify(pingMessage))
          
          // Start heartbeat
          get().startHeartbeat()
        }

        socket.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data)
            get().handleIncomingMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        socket.onclose = () => {
          set((state) => {
            state.connectionStatus = 'disconnected'
            state.socket = null
          })
          
          get().stopHeartbeat()
          
          // Auto-reconnect logic
          const { connectionAttempts, maxReconnectAttempts, reconnectDelay } = get()
          if (connectionAttempts < maxReconnectAttempts) {
            setTimeout(() => {
              set((state) => {
                state.connectionStatus = 'reconnecting'
                state.connectionAttempts = state.connectionAttempts + 1
              })
              connectWebSocket()
            }, reconnectDelay * (connectionAttempts + 1))
          } else {
            set((state) => {
              state.connectionStatus = 'error'
            })
          }
        }

        socket.onerror = (error) => {
          console.error('WebSocket error:', error)
          set((state) => {
            state.connectionStatus = 'error'
          })
        }
        
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        set((state) => {
          state.connectionStatus = 'error'
        })
      }
    }
    
    connectWebSocket()
  },

  disconnect: () => {
    const socket = get().socket
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close()
    }
    
    get().stopHeartbeat()
    
    set((state) => {
      state.socket = null
      state.connectionStatus = 'disconnected'
      state.subscriptions.clear()
      state.connectionAttempts = 0
    })
  },

  subscribe: (projectName: string) => {
    const { socket, subscriptions, sessionId } = get()
    if (!subscriptions.has(projectName)) {
      set((state) => {
        state.subscriptions.add(projectName)
      })
      
      const message: WSMessage = {
        type: 'subscribe',
        project_name: projectName,
        session_id: sessionId || undefined,
        timestamp: new Date().toISOString()
      }
      get().sendMessage(message)
    }
  },

  unsubscribe: (projectName: string) => {
    const { subscriptions } = get()
    if (subscriptions.has(projectName)) {
      set((state) => {
        state.subscriptions.delete(projectName)
      })
      
      const message: WSMessage = {
        type: 'unsubscribe',
        project_name: projectName,
        timestamp: new Date().toISOString()
      }
      get().sendMessage(message)
    }
  },

  sendMessage: (message: WSMessage) => {
    const socket = get().socket
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    } else {
      console.warn('Cannot send message: WebSocket not connected', message)
    }
  },

  handleIncomingMessage: (message: WSMessage) => {
    set((state) => {
      state.lastMessage = message
      state.messageHistory.push({
        timestamp: new Date(),
        message,
      })
      
      // Keep message history manageable
      if (state.messageHistory.length > 1000) {
        state.messageHistory = state.messageHistory.slice(-500)
      }
    })
    
    // Handle different message types
    const projectActions = get() as any
    switch (message.type) {
      case 'project_update':
        if (projectActions.updateProject && message.project_name && message.payload) {
          projectActions.updateProject(message.project_name, message.payload)
        }
        break
      case 'phase_update':
        if (projectActions.updatePhase && message.project_name && message.payload) {
          projectActions.updatePhase(message.project_name, message.payload)
        }
        break
      case 'sprint_update':
        if (projectActions.updateSprint && message.project_name && message.payload) {
          projectActions.updateSprint(message.project_name, message.payload)
        }
        break
      case 'pdl_update':
        if (projectActions.updatePDL && message.project_name && message.payload) {
          projectActions.updatePDL(message.project_name, message.payload)
        }
        break
      case 'log_update':
        if (projectActions.addLogEntry && message.payload) {
          projectActions.addLogEntry(message.payload)
        }
        break
      case 'pong':
        // Handle pong response
        console.debug('Received pong from server')
        break
      case 'error':
        console.error('WebSocket server error:', message.payload)
        break
    }
  },

  clearHistory: () => {
    set((state) => {
      state.messageHistory = []
      state.lastMessage = null
    })
  },

  // Connection status helpers
  isConnected: () => get().connectionStatus === 'connected',
  isConnecting: () => ['connecting', 'reconnecting'].includes(get().connectionStatus),
  
  // Ping server periodically to maintain connection
  startHeartbeat: () => {
    get().stopHeartbeat() // Clear existing interval
    
    const pingInterval = setInterval(() => {
      const { socket } = get()
      if (socket && socket.readyState === WebSocket.OPEN) {
        const pingMessage: WSMessage = {
          type: 'ping',
          timestamp: new Date().toISOString()
        }
        socket.send(JSON.stringify(pingMessage))
      } else {
        get().stopHeartbeat()
      }
    }, 30000) // Ping every 30 seconds
    
    set((state) => {
      state.heartbeatInterval = pingInterval
    })
  },
  
  stopHeartbeat: () => {
    const interval = get().heartbeatInterval
    if (interval) {
      clearInterval(interval)
      set((state) => {
        state.heartbeatInterval = null
      })
    }
  },
})