# MCP PDL Server

Product Development Lifecycle server with 7-phase project management, roadmap planning, and role-based collaboration.

## Quick Start

### Installation
```bash
# Install dependencies
npm install

# Build the server
npm run build
```

### Dashboard Access

#### Option 1: Manual Install
```bash
# Copy dashboard to global location
npm run dashboard:install

# Open dashboard in browser
npm run dashboard:open
```

#### Option 2: Auto-Install with Environment Variable
```bash
# Start MCP server with auto dashboard setup
DASHBOARD=1 /path/to/mcp-pdl/mcp-server.js
```

The dashboard will be available at: `file://~/.claude/data/pdl.html`

### MCP Configuration

Add to your MCP settings:
```json
{
  "mcpServers": {
    "pdl": {
      "command": "/path/to/mcp-pdl/mcp-server.js",
      "env": {
        "DASHBOARD": "1"
      }
    }
  }
}
```

## Dashboard Features

- **Live Project Overview**: View all PDL projects across repositories
- **7-Phase Progress Tracking**: Visual progress through Discovery → Growth
- **Sprint Management**: Track sprints within roadmap phases  
- **Task Visualization**: See task status and assignments
- **Real-time Stats**: Project counts, active sprints, completion metrics
- **Project Filtering**: Focus on specific projects
- **Offline Capable**: Works without server connection (shows cached data)

## Architecture

### Repository-Centric Design (v2.0)
- **One repository = One project** (using Claude's project ID)
- **Centralized database**: `~/.claude/data/pdl.db` (SQLite)
- **Project identification**: Auto-detected from repository path
- **Cross-project dashboard**: Single view of all projects

### Structure Hierarchy
```
Repository (Claude Project ID)
├── Roadmap (overall vision & phases)
│   ├── Phase 1 (e.g., "MVP Development")
│   │   ├── Sprint 1 (Complete 7-PDL cycle)
│   │   │   ├── PDL Phase 1: Discovery & Ideation
│   │   │   ├── PDL Phase 2: Definition & Scoping
│   │   │   ├── ...
│   │   │   └── PDL Phase 7: Post-Launch Iteration
│   │   └── Sprint 2 (Complete 7-PDL cycle)
│   └── Phase 2 (e.g., "Growth Features")
└── Sub-Projects (what agents call "projects")
```

## Core Functions

### Repository Operations
- `initialize_repository` - Auto-detect and initialize current repo
- `get_status` - Get current repository PDL status  
- `list_repositories` - List all repositories with PDL tracking

### Roadmap Management
- `create_roadmap` - Define vision, phases, milestones
- `get_roadmap` - Retrieve complete roadmap with status

### Sprint Management
- `create_sprint` - Create sprint with 7-phase PDL cycle
- `update_sprint_pdl` - Update specific PDL phase within sprint
- `advance_pdl_cycle` - Progress through PDL phases

### Task Management  
- `create_task` - Create tasks within PDL phases
- `update_task` - Update task status
- `bulk_update_task_statuses` - Update multiple tasks

### Advanced Manipulation
- `insert_roadmap_phase` - Insert phases at specific positions
- `delete_roadmap_phase` - Remove phases with sprint reassignment
- `reorder_roadmap_phases` - Reorganize phase order
- `move_sprint` - Move sprints between phases
- `move_task` - Move tasks between sprints/phases

## The 7 PDL Phases & Role Leaders

1. **Discovery & Ideation** → Product Manager
   - User research, market analysis, ideation
   - Output: Problem validation, initial concepts

2. **Definition & Scoping** → Product Manager
   - Requirements, technical feasibility, resources
   - Output: PRD, scope document, success metrics

3. **Design & Prototyping** → Product Designer
   - UX/UI design, prototypes, user testing
   - Output: Design specs, interactive prototypes

4. **Development & Implementation** → Engineering Manager
   - Coding, integration, technical documentation
   - Output: Working code, technical docs

5. **Testing & Quality Assurance** → QA Engineers
   - Test planning, execution, performance testing
   - Output: Test results, bug reports, quality metrics

6. **Launch & Deployment** → Engineering Manager
   - Release prep, deployment, monitoring setup
   - Output: Deployed product, release notes

7. **Post-Launch: Growth & Iteration** → Product Manager
   - Metrics analysis, user feedback, optimization
   - Output: Growth metrics, iteration plans

## Usage Patterns

### Starting a Project
```bash
# Initialize repository PDL tracking
mcp__pdl__initialize_repository

# Create comprehensive roadmap
mcp__pdl__create_roadmap

# Create first sprint  
mcp__pdl__create_sprint
```

### Daily Updates
```bash
# Update sprint PDL phase progress
mcp__pdl__update_sprint_pdl

# Update task statuses
mcp__pdl__update_task

# Check overall status
mcp__pdl__get_status
```

### Dashboard Workflow
1. **Auto-install**: Set `DASHBOARD=1` in MCP config
2. **Access**: Open `file://~/.claude/data/pdl.html` 
3. **Monitor**: Real-time view of all projects
4. **Filter**: Focus on specific projects/phases
5. **Track**: Visual progress through 7-phase cycles

## Files

### Dashboard
- `dashboard/index.html` - Static HTML dashboard with Alpine.js
- `scripts/setup-dashboard.js` - Manual dashboard installation
- `scripts/auto-setup-dashboard.js` - Auto-install when DASHBOARD=1

### Core Server
- `src/server.ts` - Main MCP server with auto dashboard setup
- `src/storage/database.js` - Centralized SQLite database
- `src/handlers/repository-handlers.js` - Repository-centric operations

### Build Output
- `dist/server.js` - Compiled server
- `mcp-server.js` - Entry point wrapper

## Development

```bash
# Development mode
npm run dev

# Build for production  
npm run build

# Run tests
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Legacy Compatibility

The server maintains backward compatibility with v1.0 project-based functions:
- `initialize_project` → `initialize_repository` 
- `get_phase` → Current sprint's PDL phase
- `update_phase` → `update_sprint_pdl`
- `list_projects` → `list_repositories`

This allows existing agent workflows to continue working while migrating to the repository-centric v2.0 design.

## Overview (Legacy Documentation)

## Core Concepts

### Product Development Lifecycle (PDL) Phases

The server manages 7 distinct phases of product development:

1. **Discovery & Ideation** - Problem validation and idea generation
2. **Definition & Scoping** - Requirements and planning
3. **Design & Prototyping** - UX/UI design and testing
4. **Development & Implementation** - Code construction 
5. **Testing & Quality Assurance** - Quality verification
6. **Launch & Deployment** - Release management
7. **Post-Launch: Growth & Iteration** - Performance monitoring and improvement

### Multi-Project Support

- Projects are identified by unique project names (keys)
- Each project maintains independent phase states and sprint data
- Concurrent project tracking with isolated data contexts

### Role-Based Agent Profiles

Each role has specific responsibilities and phase involvement:

- **Product Manager** - Vision, strategy, and coordination
- **Product Designer** - User experience and interface design
- **Engineering Manager** - Technical leadership and resource management
- **Software Engineers** - Implementation and technical execution (must know to follow best coding practices)
- **QA Engineers** - Quality assurance and testing
- **Marketing Manager** - Go-to-market strategy and positioning
- **Sales & Support** - Customer feedback and frontline insights

### Agent Format
```
---
name: {name}
description: {when to use this agent}
tools: {tools}
model: model [sonnet | opus]
color: {color}
---

## Primary Responsibility
{description}

## Phase Leadership
{map of primary driver | key support | consultative}

## Key Responsibilitis by Phase

## Collaboration Matrix

## Success Metrics

## DOs
{important considerations to adhere to}

## DONTs
{anti-patterns we want to avoid}
```

## MCP Server Specification

### Server Name
`mcp_pdl`

### Core Functions

#### 1. `get_phase`
Retrieves the current phase information for a project.

**Parameters:**
- `project_name` (string, required): Unique project identifier
- `include_sprints` (boolean, optional): Include sprint details in response

**Returns:**
```json
{
  "project_name": "string",
  "current_phase": {
    "phase_number": "integer (1-7)",
    "phase_name": "string",
    "status": "not_started | in_progress | completed | blocked",
    "start_date": "ISO 8601 datetime",
    "end_date": "ISO 8601 datetime or null",
    "primary_driver": "role name",
    "completion_percentage": "integer (0-100)"
  },
  "sprints": [] // if include_sprints is true
}
```

#### 2. `update_phase`
Updates phase status and details for a project.

**Parameters:**
- `project_name` (string, required): Unique project identifier
- `phase_number` (integer, optional): Phase to update (1-7), defaults to current
- `status` (string, optional): "not_started" | "in_progress" | "completed" | "blocked"
- `completion_percentage` (integer, optional): 0-100
- `notes` (string, optional): Update notes or blockers
- `transition_to_next` (boolean, optional): Auto-transition to next phase if current is completed

**Returns:**
```json
{
  "success": "boolean",
  "project_name": "string",
  "updated_phase": {
    "phase_number": "integer",
    "phase_name": "string",
    "status": "string",
    "completion_percentage": "integer"
  },
  "message": "string"
}
```

#### 3. `track_progress`
Records and retrieves progress updates for sprints within phases.

**Parameters:**
- `project_name` (string, required): Unique project identifier
- `action` (string, required): "create_sprint" | "update_sprint" | "get_sprints" | "get_timeline"
- `sprint_data` (object, conditional): Required for create/update actions
  - `sprint_name` (string): Sprint identifier
  - `phase_number` (integer): Associated phase (1-7)
  - `tasks` (array): Task list with status
  - `velocity` (integer): Story points or task completion rate
  - `blockers` (array): Current impediments

**Returns:**
```json
{
  "success": "boolean",
  "project_name": "string",
  "action": "string",
  "data": {} // Varies by action type
}
```

#### 4. `initialize_project`
Creates a new project with PDL phase structure.

**Parameters:**
- `project_name` (string, required): Unique project identifier
- `description` (string, optional): Project description
- `team_composition` (object, optional): Role assignments
- `start_phase` (integer, optional): Starting phase (default: 1)

**Returns:**
```json
{
  "success": "boolean",
  "project_name": "string",
  "phases_initialized": "array of phase objects",
  "message": "string"
}
```

## Data Storage Structure

### Project Schema
```json
{
  "project_name": "string (unique key)",
  "description": "string",
  "created_at": "ISO 8601 datetime",
  "updated_at": "ISO 8601 datetime",
  "team_composition": {
    "product_manager": "string or array",
    "product_designer": "string or array",
    "engineering_manager": "string",
    "engineers": "array",
    "qa_engineers": "array",
    "marketing_manager": "string",
    "sales_support": "array"
  },
  "phases": {
    "1": { /* phase object */ },
    "2": { /* phase object */ },
    // ... through 7
  },
  "sprints": [
    { /* sprint objects */ }
  ],
  "activity_log": [
    { /* timestamped events */ }
  ]
}
```

### Phase Schema
```json
{
  "phase_number": "integer (1-7)",
  "phase_name": "string",
  "status": "not_started | in_progress | completed | blocked",
  "start_date": "ISO 8601 datetime or null",
  "end_date": "ISO 8601 datetime or null",
  "primary_driver": "role name",
  "completion_percentage": "integer (0-100)",
  "key_activities": "array",
  "deliverables": "array",
  "blockers": "array",
  "notes": "string"
}
```

### Sprint Schema
```json
{
  "sprint_id": "string (unique)",
  "sprint_name": "string",
  "project_name": "string",
  "phase_number": "integer",
  "start_date": "ISO 8601 datetime",
  "end_date": "ISO 8601 datetime",
  "status": "planning | active | completed | cancelled",
  "tasks": [
    {
      "task_id": "string",
      "description": "string",
      "assignee": "string",
      "status": "todo | in_progress | done | blocked",
      "story_points": "integer"
    }
  ],
  "velocity": "integer",
  "burn_down": "array of daily progress",
  "retrospective": "string"
}
```

## Web UI Specification

### Dashboard View
- **Project List**: Grid/table showing all active projects
  - Project name, current phase, progress bar, last updated
  - Quick status indicators (on-track, at-risk, blocked)
  - Click to drill into project details

### Project Detail View
- **Phase Timeline**: Visual representation of 7 phases
  - Current phase highlighted
  - Progress indicators for each phase
  - Phase transition history
- **Sprint Board**: Current and recent sprints
  - Sprint velocity charts
  - Task completion status
  - Blocker alerts
- **Activity Log**: Chronological updates
  - Phase transitions
  - Major milestones
  - Team updates

### Progress Tracking View
- **Burn-down Charts**: Sprint and phase level
- **Velocity Trends**: Historical sprint velocity
- **Phase Completion Matrix**: Cross-project phase status
- **Team Utilization**: Role involvement across projects

### Interaction Features
- **Quick Actions**:
  - Update phase status
  - Create new sprint
  - Log blocker
  - Transition to next phase
- **Filters**:
  - By project status
  - By phase
  - By role involvement
  - By date range
- **Export Options**:
  - Project reports (PDF/CSV)
  - Timeline visualizations
  - Progress metrics

## Implementation Requirements

### Technology Stack
- **Server**: Node.js/TypeScript MCP server
- **Storage**: SQLite for persistence (or JSON file storage for simplicity)
- **UI Framework**: React/Next.js for web interface
- **Visualization**: Chart.js or D3.js for progress charts
- **API**: RESTful endpoints for UI communication

### File Structure
```
mcp-pdl/
├── src/
│   ├── server.ts           # Main MCP server
│   ├── handlers/           # Function handlers
│   ├── models/            # Data models
│   ├── storage/           # Database/file operations
│   └── agent-profiles/    # Role profile definitions
├── ui/
│   ├── pages/             # Next.js pages
│   ├── components/        # React components
│   ├── api/              # API routes
│   └── styles/           # CSS/styling
├── CLAUDE.md             # Agent usage instructions
├── package.json
├── tsconfig.json
└── README.md
```

## Usage Instructions for Claude Code

1. **Initialize the MCP server structure** with TypeScript support
2. **Create agent profiles** in `.claude/agents/` directory for all 7 roles based on the provided templates
3. **Implement core functions** following the MCP protocol specification
4. **Set up data persistence** using SQLite or JSON file storage
5. **Build the web UI** with project dashboard and progress tracking
6. **Create the .claude/CLAUDE.md file** with detailed instructions for AI agents on how to:
   - Initialize projects
   - Track phase progression
   - Manage sprints
   - Collaborate based on role profiles
   - Interpret progress metrics
   - Handle phase transitions
   - Resolve blockers

## CLAUDE.md Specification

The `.claude/CLAUDE.md` file must serve as the primary instruction set that all agents inherit. It should include:

### MCP Protocol Interface Instructions
- How to call each mcp__pdl__ function with proper syntax
- When to use each function in the context of PDL phases
- Error handling and retry logic for failed calls
- Required parameters vs optional parameters for each function

### Documentation Standards
- Template for project documentation updates
- Required fields for activity logs
- Format for recording blockers and resolutions
- Sprint retrospective documentation format
- Phase transition documentation requirements

### Behavioral Guidelines
- **Conciseness**: Communicate efficiently without sacrificing clarity
- **Accuracy**: Never report false completions or fabricate data
- **Verification**: Always check actual status before reporting
- **Documentation**: Log all significant actions and decisions
- **Collaboration**: Reference other agents' profiles when coordinating

### Project CLAUDE.md Updates
Each project should maintain its own CLAUDE.md log containing:
- Important documents and their locations
- Key decisions and rationale
- Milestone achievements
- Blocker resolutions
- Team changes or role reassignments
- Lessons learned per phase

## Success Criteria

- [ ] Multi-project support with isolated contexts
- [ ] Full CRUD operations for phases and sprints
- [ ] Role-based agent profiles accessible via MCP
- [ ] Persistent storage of project state
- [ ] Web UI for visual progress tracking
- [ ] Comprehensive activity logging
- [ ] Phase transition automation
- [ ] Sprint velocity tracking
- [ ] Blocker management system
- [ ] Export capabilities for reporting

## Extension Possibilities

- Integration with external project management tools (Jira, Asana)
- Automated phase transition recommendations
- AI-powered blocker resolution suggestions
- Team performance analytics
- Resource allocation optimization
- Risk assessment based on phase progress
- Stakeholder notification system
- Template library for common project types
