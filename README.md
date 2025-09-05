# MCP Product Development Lifecycle (PDL) Server

## Overview

The MCP PDL Server is a Model Context Protocol server that enables AI agents to track, manage, and collaborate on product development projects through their complete lifecycle. It provides structured phase management, sprint tracking, and role-based agent profiles to facilitate intelligent project coordination.

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
