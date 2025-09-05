#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { getDatabase, DatabaseAdapter } from './storage/database-factory.js';
import { PDLFunctionHandlers } from './handlers/functions.js';
import { RoadmapFunctionHandlers } from './handlers/roadmap-functions.js';

// Initialize database asynchronously
let db: DatabaseAdapter;
let handlers: PDLFunctionHandlers;
let roadmapHandlers: RoadmapFunctionHandlers;

const server = new Server(
  {
    name: 'mcp-pdl',
    version: '1.0.0',
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
      {
        name: 'get_phase',
        description: 'Retrieves the current phase information for a project',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Unique project identifier',
            },
            include_sprints: {
              type: 'boolean',
              description: 'Include sprint details in response',
              default: false,
            },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'update_phase',
        description: 'Updates phase status and details for a project',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Unique project identifier',
            },
            phase_number: {
              type: 'integer',
              description: 'Phase to update (1-7), defaults to current',
              minimum: 1,
              maximum: 7,
            },
            status: {
              type: 'string',
              enum: ['not_started', 'in_progress', 'completed', 'blocked'],
              description: 'Phase status',
            },
            completion_percentage: {
              type: 'integer',
              description: 'Completion percentage (0-100)',
              minimum: 0,
              maximum: 100,
            },
            notes: {
              type: 'string',
              description: 'Update notes or blockers',
            },
            transition_to_next: {
              type: 'boolean',
              description: 'Auto-transition to next phase if current is completed',
              default: false,
            },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'track_progress',
        description: 'Records and retrieves progress updates for sprints within phases',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Unique project identifier',
            },
            action: {
              type: 'string',
              enum: ['create_sprint', 'update_sprint', 'get_sprints', 'get_timeline'],
              description: 'Action to perform',
            },
            sprint_data: {
              type: 'object',
              description: 'Sprint data for create/update actions',
              properties: {
                sprint_id: {
                  type: 'string',
                  description: 'Sprint identifier (required for updates)',
                },
                sprint_name: {
                  type: 'string',
                  description: 'Sprint name',
                },
                phase_number: {
                  type: 'integer',
                  description: 'Associated phase (1-7)',
                  minimum: 1,
                  maximum: 7,
                },
                start_date: {
                  type: 'string',
                  description: 'Sprint start date (ISO 8601)',
                },
                end_date: {
                  type: 'string',
                  description: 'Sprint end date (ISO 8601)',
                },
                status: {
                  type: 'string',
                  enum: ['planning', 'active', 'completed', 'cancelled'],
                  description: 'Sprint status',
                },
                tasks: {
                  type: 'array',
                  description: 'Task list',
                  items: {
                    type: 'object',
                    properties: {
                      task_id: { type: 'string' },
                      description: { type: 'string' },
                      assignee: { type: 'string' },
                      status: {
                        type: 'string',
                        enum: ['todo', 'in_progress', 'done', 'blocked']
                      },
                      story_points: { type: 'integer' }
                    },
                    required: ['task_id', 'description', 'status']
                  }
                },
                velocity: {
                  type: 'integer',
                  description: 'Story points or task completion rate',
                },
                burn_down: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Daily burn-down data',
                },
                retrospective: {
                  type: 'string',
                  description: 'Sprint retrospective notes',
                },
              },
            },
          },
          required: ['project_name', 'action'],
        },
      },
      {
        name: 'initialize_project',
        description: 'Creates a new project with PDL phase structure',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Unique project identifier',
            },
            description: {
              type: 'string',
              description: 'Project description',
            },
            team_composition: {
              type: 'object',
              description: 'Role assignments',
              properties: {
                product_manager: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } }
                  ],
                  description: 'Product manager(s)'
                },
                product_designer: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } }
                  ],
                  description: 'Product designer(s)'
                },
                engineering_manager: {
                  type: 'string',
                  description: 'Engineering manager'
                },
                engineers: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Software engineers'
                },
                qa_engineers: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'QA engineers'
                },
                marketing_manager: {
                  type: 'string',
                  description: 'Marketing manager'
                },
                sales_support: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Sales & support team'
                }
              }
            },
            start_phase: {
              type: 'integer',
              description: 'Starting phase (default: 1)',
              minimum: 1,
              maximum: 7,
              default: 1,
            },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'create_roadmap',
        description: 'Creates a comprehensive roadmap with phases and milestones',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Unique project identifier',
            },
            vision: {
              type: 'string',
              description: 'Overall product vision and roadmap goals',
            },
            phases: {
              type: 'array',
              description: 'Roadmap phases',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Phase name' },
                  description: { type: 'string', description: 'Phase description' },
                  objective: { type: 'string', description: 'Phase objective' },
                  duration_weeks: { type: 'integer', description: 'Duration in weeks' },
                  deliverables: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Key deliverables',
                  },
                  success_metrics: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Success metrics',
                  },
                },
                required: ['name', 'description', 'objective', 'duration_weeks'],
              },
            },
            milestones: {
              type: 'array',
              description: 'Key milestones',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Milestone name' },
                  description: { type: 'string', description: 'Milestone description' },
                  phase_index: { type: 'integer', description: 'Index of associated phase' },
                  weeks_into_phase: { type: 'integer', description: 'Weeks into the phase' },
                },
                required: ['name', 'description', 'phase_index'],
              },
            },
          },
          required: ['project_name', 'vision', 'phases'],
        },
      },
      {
        name: 'create_sprint',
        description: 'Creates a new sprint within a roadmap phase with PDL cycle',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Unique project identifier',
            },
            roadmap_phase_id: {
              type: 'string',
              description: 'ID of the roadmap phase',
            },
            sprint_name: {
              type: 'string',
              description: 'Sprint name',
            },
            sprint_number: {
              type: 'integer',
              description: 'Sprint number within phase',
            },
            duration_days: {
              type: 'integer',
              description: 'Sprint duration in days (default: 14)',
              default: 14,
            },
          },
          required: ['project_name', 'roadmap_phase_id', 'sprint_name', 'sprint_number'],
        },
      },
      {
        name: 'advance_pdl_cycle',
        description: 'Advances sprint to next PDL phase or creates new cycle',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Unique project identifier',
            },
            sprint_id: {
              type: 'string',
              description: 'Sprint identifier',
            },
            completion_notes: {
              type: 'string',
              description: 'Notes on phase completion',
            },
          },
          required: ['project_name', 'sprint_id'],
        },
      },
      {
        name: 'update_sprint_pdl',
        description: 'Updates the current PDL phase within a sprint',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Unique project identifier',
            },
            sprint_id: {
              type: 'string',
              description: 'Sprint identifier',
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
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      task_id: { type: 'string' },
                      description: { type: 'string' },
                      assignee: { type: 'string' },
                      status: {
                        type: 'string',
                        enum: ['todo', 'in_progress', 'done', 'blocked'],
                      },
                      story_points: { type: 'integer' },
                    },
                  },
                },
                blockers: {
                  type: 'array',
                  items: { type: 'string' },
                },
                notes: { type: 'string' },
              },
            },
          },
          required: ['project_name', 'sprint_id', 'pdl_phase_number'],
        },
      },
      {
        name: 'get_roadmap',
        description: 'Retrieves complete roadmap with current status',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Unique project identifier',
            },
            include_details: {
              type: 'boolean',
              description: 'Include current phase, sprint, and PDL cycle details',
              default: true,
            },
          },
          required: ['project_name'],
        },
      },
      {
        name: 'update_roadmap_phase',
        description: 'Updates a roadmap phase status and metrics',
        inputSchema: {
          type: 'object',
          properties: {
            project_name: {
              type: 'string',
              description: 'Unique project identifier',
            },
            roadmap_phase_id: {
              type: 'string',
              description: 'Roadmap phase identifier',
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
                success_metrics: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
          required: ['project_name', 'roadmap_phase_id'],
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
    switch (name) {
      case 'get_phase': {
        const result = await handlers.getPhase(
          args.project_name as string,
          args.include_sprints as boolean
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_phase': {
        const result = await handlers.updatePhase(
          args.project_name as string,
          args.phase_number as number,
          args.status as string,
          args.completion_percentage as number,
          args.notes as string,
          args.transition_to_next as boolean
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'track_progress': {
        const result = await handlers.trackProgress(
          args.project_name as string,
          args.action as 'create_sprint' | 'update_sprint' | 'get_sprints' | 'get_timeline',
          args.sprint_data as any
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'initialize_project': {
        const result = await handlers.initializeProject(
          args.project_name as string,
          args.description as string,
          args.team_composition as any,
          args.start_phase as number
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_roadmap': {
        const result = await roadmapHandlers.createRoadmap(
          args.project_name as string,
          args.vision as string,
          args.phases as any,
          args.milestones as any
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_sprint': {
        const result = await roadmapHandlers.createSprint(
          args.project_name as string,
          args.roadmap_phase_id as string,
          args.sprint_name as string,
          args.sprint_number as number,
          args.duration_days as number
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'advance_pdl_cycle': {
        const result = await roadmapHandlers.advancePDLCycle(
          args.project_name as string,
          args.sprint_id as string,
          args.completion_notes as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_sprint_pdl': {
        const result = await roadmapHandlers.updateSprintPDL(
          args.project_name as string,
          args.sprint_id as string,
          args.pdl_phase_number as number,
          args.updates as any
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_roadmap': {
        const result = await roadmapHandlers.getRoadmap(
          args.project_name as string,
          args.include_details as boolean
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_roadmap_phase': {
        const result = await roadmapHandlers.updateRoadmapPhase(
          args.project_name as string,
          args.roadmap_phase_id as string,
          args.updates as any
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

async function main(): Promise<void> {
  try {
    // Initialize database first
    console.error('Initializing database...');
    db = await getDatabase();
    handlers = new PDLFunctionHandlers(db.getUnderlyingDatabase() as any);
    roadmapHandlers = new RoadmapFunctionHandlers(db.getUnderlyingDatabase() as any);
    console.error('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP PDL Server running on stdio');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Server failed:', error);
    process.exit(1);
  });
}

export { server };