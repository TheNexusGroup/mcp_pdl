#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { PDLDatabase } from './storage/database.js';
import { RepositoryHandlers } from './handlers/repository-handlers.js';

// Initialize database and handlers
const db = new PDLDatabase();
const handlers = new RepositoryHandlers(db);

const server = new Server(
  {
    name: 'mcp-pdl',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ==================== REPOSITORY OPERATIONS ====================
      {
        name: 'initialize_repository',
        description: 'Initialize PDL tracking for current repository (auto-detects Claude project ID)',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Repository description',
            },
            team_composition: {
              type: 'object',
              description: 'Team member assignments',
            },
          },
        },
      },
      {
        name: 'get_status',
        description: 'Get current repository PDL status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_repositories',
        description: 'List all repositories with PDL tracking',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },

      // ==================== ROADMAP OPERATIONS ====================
      {
        name: 'create_roadmap',
        description: 'Create product roadmap for repository',
        inputSchema: {
          type: 'object',
          properties: {
            vision: {
              type: 'string',
              description: 'Product vision statement',
            },
            phases: {
              type: 'array',
              description: 'Roadmap phases',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  objective: { type: 'string' },
                  deliverables: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  success_metrics: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
                required: ['name', 'description', 'objective'],
              },
            },
          },
          required: ['vision', 'phases'],
        },
      },

      // ==================== SPRINT OPERATIONS ====================
      {
        name: 'create_sprint',
        description: 'Create new sprint with 7-phase PDL cycle',
        inputSchema: {
          type: 'object',
          properties: {
            roadmap_phase_id: {
              type: 'string',
              description: 'ID of roadmap phase this sprint belongs to',
            },
            sprint_name: {
              type: 'string',
              description: 'Name of the sprint',
            },
            duration_days: {
              type: 'integer',
              description: 'Sprint duration in days (default: 14)',
              default: 14,
            },
          },
          required: ['roadmap_phase_id', 'sprint_name'],
        },
      },
      {
        name: 'update_sprint_pdl',
        description: 'Update PDL phase within sprint (1-7)',
        inputSchema: {
          type: 'object',
          properties: {
            sprint_id: {
              type: 'string',
              description: 'Sprint ID',
            },
            pdl_phase_number: {
              type: 'integer',
              description: 'PDL phase number (1-7)',
              minimum: 1,
              maximum: 7,
            },
            updates: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['not_started', 'in_progress', 'completed', 'blocked'],
                },
                completion_percentage: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 100,
                },
                deliverables: {
                  type: 'array',
                  items: { type: 'string' },
                },
                blockers: {
                  type: 'array',
                  items: { type: 'string' },
                },
                notes: { type: 'string' },
              },
            },
          },
          required: ['sprint_id', 'pdl_phase_number'],
        },
      },

      // ==================== TASK OPERATIONS ====================
      {
        name: 'create_task',
        description: 'Create task within PDL phase',
        inputSchema: {
          type: 'object',
          properties: {
            sprint_id: {
              type: 'string',
              description: 'Sprint ID',
            },
            pdl_phase_number: {
              type: 'integer',
              description: 'PDL phase (1-7)',
              minimum: 1,
              maximum: 7,
            },
            task_description: {
              type: 'string',
              description: 'Task description',
            },
            assignee: {
              type: 'string',
              description: 'Person assigned',
            },
            story_points: {
              type: 'integer',
              description: 'Story points estimate',
            },
          },
          required: ['sprint_id', 'pdl_phase_number', 'task_description'],
        },
      },
      {
        name: 'update_task',
        description: 'Update task status',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID',
            },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'done', 'blocked'],
              description: 'New status',
            },
          },
          required: ['task_id', 'status'],
        },
      },

      // ==================== SUB-PROJECT OPERATIONS ====================
      {
        name: 'create_subproject',
        description: 'Create sub-project (what agents call "projects")',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Sub-project name',
            },
            description: {
              type: 'string',
              description: 'Sub-project description',
            },
            related_sprint_id: {
              type: 'string',
              description: 'Related sprint ID',
            },
            created_by: {
              type: 'string',
              description: 'Agent/role that created it',
            },
          },
          required: ['name', 'description'],
        },
      },

      // ==================== MANIPULATION TOOLS ====================
      {
        name: 'insert_roadmap_phase',
        description: 'Insert new roadmap phase at specific position',
        inputSchema: {
          type: 'object',
          properties: {
            position: {
              type: 'integer',
              description: 'Position to insert at (1-based)',
              minimum: 1,
            },
            phase: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                objective: { type: 'string' },
                deliverables: {
                  type: 'array',
                  items: { type: 'string' },
                },
                success_metrics: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['name', 'description', 'objective'],
            },
          },
          required: ['position', 'phase'],
        },
      },
      {
        name: 'delete_roadmap_phase',
        description: 'Delete roadmap phase and optionally reassign sprints',
        inputSchema: {
          type: 'object',
          properties: {
            phase_id: {
              type: 'string',
              description: 'Phase ID to delete',
            },
            reassign_sprints_to: {
              type: 'string',
              description: 'Phase ID to move sprints to (optional)',
            },
          },
          required: ['phase_id'],
        },
      },
      {
        name: 'reorder_roadmap_phases',
        description: 'Reorder roadmap phases',
        inputSchema: {
          type: 'object',
          properties: {
            phase_order: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of phase IDs in desired order',
            },
          },
          required: ['phase_order'],
        },
      },
      {
        name: 'insert_sprint',
        description: 'Insert new sprint at specific position within phase',
        inputSchema: {
          type: 'object',
          properties: {
            roadmap_phase_id: {
              type: 'string',
              description: 'Roadmap phase ID',
            },
            position: {
              type: 'integer',
              description: 'Position within phase (1-based)',
              minimum: 1,
            },
            sprint: {
              type: 'object',
              properties: {
                sprint_name: { type: 'string' },
                duration_days: { type: 'integer', default: 14 },
              },
              required: ['sprint_name'],
            },
          },
          required: ['roadmap_phase_id', 'position', 'sprint'],
        },
      },
      {
        name: 'delete_sprint',
        description: 'Delete sprint and optionally reassign tasks',
        inputSchema: {
          type: 'object',
          properties: {
            sprint_id: {
              type: 'string',
              description: 'Sprint ID to delete',
            },
            reassign_tasks_to: {
              type: 'string',
              description: 'Sprint ID to move tasks to (optional)',
            },
          },
          required: ['sprint_id'],
        },
      },
      {
        name: 'move_sprint',
        description: 'Move sprint to different phase and position',
        inputSchema: {
          type: 'object',
          properties: {
            sprint_id: {
              type: 'string',
              description: 'Sprint ID to move',
            },
            target_phase_id: {
              type: 'string',
              description: 'Target roadmap phase ID',
            },
            position: {
              type: 'integer',
              description: 'New position in target phase',
              minimum: 1,
            },
          },
          required: ['sprint_id', 'target_phase_id', 'position'],
        },
      },
      {
        name: 'insert_task_at_position',
        description: 'Insert task at specific position in PDL phase',
        inputSchema: {
          type: 'object',
          properties: {
            sprint_id: {
              type: 'string',
              description: 'Sprint ID',
            },
            pdl_phase_number: {
              type: 'integer',
              description: 'PDL phase (1-7)',
              minimum: 1,
              maximum: 7,
            },
            position: {
              type: 'integer',
              description: 'Position within phase tasks',
              minimum: 1,
            },
            task: {
              type: 'object',
              properties: {
                task_description: { type: 'string' },
                assignee: { type: 'string' },
                story_points: { type: 'integer' },
              },
              required: ['task_description'],
            },
          },
          required: ['sprint_id', 'pdl_phase_number', 'position', 'task'],
        },
      },
      {
        name: 'delete_task_by_id',
        description: 'Delete task by ID',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to delete',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'move_task',
        description: 'Move task to different sprint and PDL phase',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to move',
            },
            target_sprint_id: {
              type: 'string',
              description: 'Target sprint ID',
            },
            target_pdl_phase: {
              type: 'integer',
              description: 'Target PDL phase (1-7)',
              minimum: 1,
              maximum: 7,
            },
          },
          required: ['task_id', 'target_sprint_id', 'target_pdl_phase'],
        },
      },
      {
        name: 'bulk_update_task_statuses',
        description: 'Update multiple task statuses at once',
        inputSchema: {
          type: 'object',
          properties: {
            updates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  task_id: { type: 'string' },
                  status: {
                    type: 'string',
                    enum: ['todo', 'in_progress', 'done', 'blocked'],
                  },
                },
                required: ['task_id', 'status'],
              },
            },
          },
          required: ['updates'],
        },
      },

      // ==================== LEGACY COMPATIBILITY ====================
      {
        name: 'initialize_project',
        description: '[LEGACY] Initialize project - now uses repository',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: { type: 'string' },
            description: { type: 'string' },
            team_composition: { type: 'object' },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'get_phase',
        description: '[LEGACY] Get current phase - now gets PDL phase in sprint',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: { type: 'string' },
            include_sprints: { type: 'boolean' },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'update_phase',
        description: '[LEGACY] Update phase - now updates sprint PDL phase',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: { type: 'string' },
            phase_number: { type: 'integer' },
            status: { type: 'string' },
            completion_percentage: { type: 'integer' },
            notes: { type: 'string' },
            transition_to_next: { type: 'boolean' },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'list_projects',
        description: '[LEGACY] List projects - now lists repositories',
        inputSchema: {
          type: 'object',
          properties: {
            include_details: { type: 'boolean' },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Missing arguments',
        },
      ],
      isError: true,
    };
  }

  try {
    let result: any;

    switch (name) {
      // Repository operations
      case 'initialize_repository':
        result = await handlers.initializeRepository(args as any);
        break;
      case 'get_status':
        result = await handlers.getStatus();
        break;
      case 'list_repositories':
        result = await handlers.listRepositories();
        break;

      // Roadmap operations
      case 'create_roadmap':
        result = await handlers.createRoadmap(args as any);
        break;

      // Sprint operations
      case 'create_sprint':
        result = await handlers.createSprint(args as any);
        break;
      case 'update_sprint_pdl':
        result = await handlers.updateSprintPDL(args as any);
        break;

      // Task operations
      case 'create_task':
        result = await handlers.createTask(args as any);
        break;
      case 'update_task':
        result = await handlers.updateTask(args as any);
        break;

      // Sub-project operations
      case 'create_subproject':
        result = await handlers.createSubproject(args as any);
        break;

      // Manipulation operations
      case 'insert_roadmap_phase':
        result = await handlers.insertRoadmapPhase(args as any);
        break;
      case 'delete_roadmap_phase':
        result = await handlers.deleteRoadmapPhase(args as any);
        break;
      case 'reorder_roadmap_phases':
        result = await handlers.reorderRoadmapPhases(args as any);
        break;
      case 'insert_sprint':
        result = await handlers.insertSprint(args as any);
        break;
      case 'delete_sprint':
        result = await handlers.deleteSprint(args as any);
        break;
      case 'move_sprint':
        result = await handlers.moveSprint(args as any);
        break;
      case 'insert_task_at_position':
        result = await handlers.insertTaskAtPosition(args as any);
        break;
      case 'delete_task_by_id':
        result = await handlers.deleteTaskById(args as any);
        break;
      case 'move_task':
        result = await handlers.moveTask(args as any);
        break;
      case 'bulk_update_task_statuses':
        result = await handlers.bulkUpdateTaskStatuses(args as any);
        break;

      // Legacy compatibility
      case 'initialize_project':
        result = await handlers.initializeProject(args as any);
        break;
      case 'get_phase':
        result = await handlers.getPhase(args as any);
        break;
      case 'update_phase':
        result = await handlers.updatePhase(args as any);
        break;
      case 'list_projects':
        result = await handlers.listProjects(args as any);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP PDL Server v2.0.0 - Repository-centric design with full manipulation capabilities');
}

main().catch((error: unknown) => {
  console.error('Server error:', error);
  process.exit(1);
});