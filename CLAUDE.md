# MCP PDL Server

Product Development Lifecycle server with 7-phase sprint management, roadmap planning, and role-based collaboration.

## CRITICAL ARCHITECTURE CHANGE (v2.0)

**Project = Repository (Claude Project ID)**
- Each repository IS the project (uses Claude's project ID from ~/.claude/projects/)
- No more "project names" - the repo's Claude project ID is the identifier
- All MCP servers (PDL, Nabu, Telos) use the same Claude project ID

**Structure Hierarchy:**
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

## Quick Start Workflows

### Repository Initialization
```
1. Auto-detect Claude project ID from path
2. Initialize repository PDL tracking
3. Create roadmap with phases
4. Create sprints (each sprint = full 7-PDL cycle)
```

### Sprint Management (Each Sprint is a 7-Phase PDL Cycle)
```
1. create_sprint → Creates new sprint with 7 PDL phases
2. update_sprint_pdl → Update current PDL phase (1-7) within sprint
3. advance_pdl_phase → Move to next PDL phase in sprint
4. complete_sprint → Finish sprint and start next
```

### Dynamic Manipulation (Critical for Agents)
```
# Roadmap Phase Operations
- insert_roadmap_phase → Insert new phase at specific position
- delete_roadmap_phase → Remove phase, optionally reassign sprints
- reorder_roadmap_phases → Reorganize phase order

# Sprint Operations  
- insert_sprint → Insert sprint at specific position in phase
- delete_sprint → Remove sprint, optionally reassign tasks
- move_sprint → Move sprint between phases

# Task Operations
- insert_task_at_position → Insert task at specific position
- delete_task_by_id → Remove task
- move_task → Move task between sprints/PDL phases
- bulk_update_task_statuses → Update multiple task statuses
```

## Core Functions (use `mcp__pdl__` prefix)

### Repository Setup (Auto-detected from Claude Project)

#### `initialize_repository`
Initializes PDL tracking for the current repository.
- Auto-detects Claude project ID from path
- `description` (optional): Repository description
- `team_composition` (optional): Assign team members to roles
- No project_name needed - uses Claude project ID

#### `create_roadmap`
Build comprehensive product roadmap for the repository.
- `vision` (required): Overall product vision
- `phases` (required): Array of roadmap phases with:
  - `name`, `description`, `objective` (required)
  - `duration_weeks` (required): Phase duration
  - `deliverables`, `success_metrics` (optional)
- `milestones` (optional): Key milestone markers
- No project_name needed - uses current repository

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

## DOCUMENTATION

- **Static Dashboard**: Alpine.js HTML dashboard at `file://~/.claude/data/pdl.html`
