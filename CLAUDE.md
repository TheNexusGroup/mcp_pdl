# MCP PDL Server

Product Development Lifecycle server with 7-phase project management, roadmap planning, and role-based collaboration.

## Quick Start Workflows

### Simple Project (Basic Phase Tracking)
```
1. initialize_project → Create project with team
2. update_phase → Track phase progress (0-100%)
3. track_progress → Manage sprints and tasks
```

### Advanced Project (Full Roadmap with Sprints)
```
1. initialize_project → Create project foundation
2. create_roadmap → Define vision, phases, milestones
3. create_sprint → Create sprints within roadmap phases
4. update_sprint_pdl → Update PDL phases within sprints
5. advance_pdl_cycle → Progress through 7-phase cycles
```

## Core Functions (use `mcp__pdl__` prefix)

### Project Setup

#### `initialize_project`
Creates new project with PDL phase structure.
- `project_name` (required): Unique identifier
- `description` (optional): Project description
- `team_composition` (optional): Assign team members to roles
- `start_phase` (optional, 1-7): Initial phase

#### `create_roadmap`
Build comprehensive product roadmap.
- `project_name` (required)
- `vision` (required): Overall product vision
- `phases` (required): Array of roadmap phases with:
  - `name`, `description`, `objective` (required)
  - `duration_weeks` (required): Phase duration
  - `deliverables`, `success_metrics` (optional)
- `milestones` (optional): Key milestone markers

### Phase Management

#### `get_phase`
Retrieve current phase status.
- `project_name` (required)
- `include_sprints` (optional): Include sprint details

#### `update_phase`
Update phase progress and status.
- `project_name` (required)
- `phase_number` (optional, 1-7): Target phase
- `status` (optional): "not_started" | "in_progress" | "completed" | "blocked"
- `completion_percentage` (optional, 0-100)
- `notes` (optional): Update notes/blockers
- `transition_to_next` (optional): Auto-advance when complete

### Sprint Management

#### `track_progress`
Sprint and progress operations.
- `project_name` (required)
- `action` (required): "create_sprint" | "update_sprint" | "get_sprints" | "get_timeline"
- `sprint_data` (conditional): Required for create/update actions
  - Tasks with assignees, status, story points
  - Velocity, burn-down data
  - Sprint dates and retrospective

#### `create_sprint`
Create sprint within roadmap phase.
- `project_name` (required)
- `roadmap_phase_id` (required): Parent phase
- `sprint_name` (required)
- `sprint_number` (required): Sequence number
- `duration_days` (optional, default: 14)

### PDL Cycle Management (Within Sprints)

#### `update_sprint_pdl`
Update specific PDL phase in sprint.
- `project_name` (required)
- `sprint_id` (required)
- `pdl_phase_number` (required, 1-7)
- `updates`: Status, completion %, tasks, blockers

#### `advance_pdl_cycle`
Progress to next PDL phase or new cycle.
- `project_name` (required)
- `sprint_id` (required)
- `completion_notes` (optional)

### Roadmap Operations

#### `get_roadmap`
Retrieve complete roadmap with status.
- `project_name` (required)
- `include_details` (optional): Include current state

#### `update_roadmap_phase`
Update roadmap phase metrics.
- `project_name` (required)
- `roadmap_phase_id` (required)
- `updates`: Status, completion %, deliverables, metrics

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

## When to Use Each Function

### Starting a Project
- **Simple tracking**: `initialize_project` → `update_phase`
- **Full planning**: `initialize_project` → `create_roadmap` → `create_sprint`

### Daily Updates
- **Phase progress**: `update_phase` with completion %
- **Sprint tasks**: `track_progress` with action="update_sprint"
- **PDL phase in sprint**: `update_sprint_pdl`

### Phase Transitions
- **Simple project**: `update_phase` with transition_to_next=true
- **Sprint PDL cycle**: `advance_pdl_cycle` to move through phases

### Status Checks
- **Current phase**: `get_phase` with include_sprints=true
- **Full roadmap**: `get_roadmap` with include_details=true
- **Sprint list**: `track_progress` with action="get_sprints"

## Project Structure Hierarchy

```
Project
├── Simple Mode
│   └── 7 PDL Phases (sequential)
│       └── Optional Sprints
│
└── Roadmap Mode
    ├── Vision & Strategy
    ├── Roadmap Phases (weeks/months)
    │   ├── Milestones
    │   └── Sprints (1-4 weeks)
    │       └── PDL Cycles (7 phases each)
    │           └── Tasks & Assignments
    └── Progress Metrics
```

## Key Principles

1. **Sequential Progress**: Phases 1-7 must progress in order
2. **Incremental Updates**: Use 0-100% completion, update frequently
3. **Role Ownership**: Each phase has a primary driver
4. **Sprint Cycles**: Sprints can contain multiple PDL cycles
5. **Blocker Documentation**: Always document specific blockers
6. **Honest Reporting**: Never mark false completion

## Team Roles & Responsibilities

- **Product Manager**: Phases 1, 2, 7 - Vision, requirements, growth
- **Product Designer**: Phase 3 - Design and user experience
- **Engineering Manager**: Phases 4, 6 - Development and deployment
- **QA Engineers**: Phase 5 - Quality and testing
- **Software Engineers**: Support phases 4-6
- **Marketing Manager**: Support phases 6-7
- **Sales & Support**: Feedback throughout all phases

## Agent Usage Guidelines

When agents are working on projects:
1. Check if project exists: `get_phase` or `get_roadmap`
2. Create if needed: `initialize_project` + optionally `create_roadmap`
3. Update regularly: Use appropriate update functions
4. Track detailed work: Use sprints and PDL cycles for granular tracking
5. Report accurately: Always use real completion percentages
- IMPORTANT - DO NOT FUCKING MIGRATE MANUALLY. THE PDL SYSTEM MUST BE ABLE TO AUTO-MIGRATE . WE WILL HAVE TO RESTART OUR CLAUDE SESSION TO BE ABLE TO TEST.