import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { Database } from '../storage/database.js';
import { sessionLogger } from '../utils/session-logger.js';

export interface WSMessage {
  type: 'subscribe' | 'unsubscribe' | 'pdl_update' | 'project_update' | 'phase_update' | 'sprint_update' | 'log_update' | 'error' | 'ping' | 'pong';
  payload?: any;
  timestamp?: string;
  project_name?: string;
  session_id?: string;
}

export class PDLWebSocketServer {
  private wss: WebSocketServer;
  private httpServer: any;
  private db: Database;
  private clients: Map<any, { subscriptions: Set<string>; sessionId?: string }> = new Map();

  constructor(database: Database, port: number = 8080) {
    this.db = database;
    this.httpServer = createServer();
    this.wss = new WebSocketServer({ server: this.httpServer });
    
    this.setupWebSocketHandlers();
    
    this.httpServer.listen(port, () => {
      console.log(`PDL WebSocket Server running on port ${port}`);
    });
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection established');
      
      // Initialize client state
      this.clients.set(ws, {
        subscriptions: new Set(),
      });

      // Handle incoming messages
      ws.on('message', async (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          this.sendError(ws, 'Invalid message format', error);
        }
      });

      // Handle connection close
      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      this.send(ws, {
        type: 'ping',
        payload: { message: 'PDL WebSocket Server connected' },
        timestamp: new Date().toISOString()
      });
    });
  }

  private async handleMessage(ws: any, message: WSMessage) {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        if (message.project_name) {
          client.subscriptions.add(message.project_name);
          client.sessionId = message.session_id;
          
          this.send(ws, {
            type: 'project_update',
            payload: { subscribed: message.project_name },
            timestamp: new Date().toISOString()
          });

          // Send current project state if available
          try {
            const project = await this.db.getProject(message.project_name);
            if (project) {
              this.send(ws, {
                type: 'project_update',
                payload: { project },
                project_name: message.project_name,
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error(`Failed to get project ${message.project_name}:`, error);
          }
        }
        break;

      case 'unsubscribe':
        if (message.project_name) {
          client.subscriptions.delete(message.project_name);
          this.send(ws, {
            type: 'project_update',
            payload: { unsubscribed: message.project_name },
            timestamp: new Date().toISOString()
          });
        }
        break;

      case 'ping':
        this.send(ws, {
          type: 'pong',
          payload: message.payload,
          timestamp: new Date().toISOString()
        });
        break;

      default:
        this.sendError(ws, 'Unknown message type', { type: message.type });
    }
  }

  private send(ws: any, message: WSMessage) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: any, error: string, details?: any) {
    this.send(ws, {
      type: 'error',
      payload: { error, details },
      timestamp: new Date().toISOString()
    });
  }

  // Public methods for broadcasting updates
  public broadcastProjectUpdate(projectName: string, updateType: string, data: any) {
    const message: WSMessage = {
      type: 'project_update',
      payload: { updateType, data },
      project_name: projectName,
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers(projectName, message);
  }

  public broadcastPhaseUpdate(projectName: string, phaseData: any) {
    const message: WSMessage = {
      type: 'phase_update',
      payload: phaseData,
      project_name: projectName,
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers(projectName, message);
  }

  public broadcastSprintUpdate(projectName: string, sprintData: any) {
    const message: WSMessage = {
      type: 'sprint_update',
      payload: sprintData,
      project_name: projectName,
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers(projectName, message);
  }

  public broadcastPDLUpdate(projectName: string, pdlData: any) {
    const message: WSMessage = {
      type: 'pdl_update',
      payload: pdlData,
      project_name: projectName,
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers(projectName, message);
  }

  public broadcastLogUpdate(projectName: string, sessionId: string, logEntry: any) {
    const message: WSMessage = {
      type: 'log_update',
      payload: logEntry,
      project_name: projectName,
      session_id: sessionId,
      timestamp: new Date().toISOString()
    };

    this.broadcastToSubscribers(projectName, message);
  }

  private broadcastToSubscribers(projectName: string, message: WSMessage) {
    for (const [ws, client] of this.clients.entries()) {
      if (client.subscriptions.has(projectName)) {
        this.send(ws, message);
      }
    }
  }

  public getStats() {
    const stats = {
      totalConnections: this.clients.size,
      subscriptions: new Map<string, number>()
    };

    for (const client of this.clients.values()) {
      for (const subscription of client.subscriptions) {
        stats.subscriptions.set(
          subscription,
          (stats.subscriptions.get(subscription) || 0) + 1
        );
      }
    }

    return stats;
  }

  public close() {
    this.wss.close();
    this.httpServer.close();
  }
}

// Singleton instance
let wsServerInstance: PDLWebSocketServer | null = null;

export function createWebSocketServer(database: Database, port: number = 8080): PDLWebSocketServer {
  if (!wsServerInstance) {
    wsServerInstance = new PDLWebSocketServer(database, port);
  }
  return wsServerInstance;
}

export function getWebSocketServer(): PDLWebSocketServer | null {
  return wsServerInstance;
}