# MCP PDL Server

Product Development Lifecycle server with 7-phase project management and role-based collaboration.

## Functions (use `mcp__pdl__` prefix)

### `initialize_project`
Create new project with PDL phases.
- `project_name` (required)
- `description`, `team_composition`, `start_phase` (optional)

### `get_phase`
Get current phase status and details.
- `project_name` (required)
- `include_sprints` (optional)

### `update_phase`
Update phase status, progress, notes.
- `project_name` (required)
- `phase_number`, `status`, `completion_percentage`, `notes`, `transition_to_next` (optional)
- Status: "not_started" | "in_progress" | "completed" | "blocked"

### `track_progress`
Manage sprints and progress tracking.
- `project_name` (required)
- `action`: "create_sprint" | "update_sprint" | "get_sprints" | "get_timeline"
- `sprint_data` (conditional)

## 7 PDL Phases & Leaders
1. Discovery & Ideation → Product Manager
2. Definition & Scoping → Product Manager  
3. Design & Prototyping → Product Designer
4. Development & Implementation → Engineering Manager
5. Testing & Quality Assurance → QA Engineers
6. Launch & Deployment → Engineering Manager
7. Post-Launch: Growth & Iteration → Product Manager

## Key Rules
- Phases progress 1→7 sequentially but can overlap
- Update completion % incrementally (0-100)
- Document blockers with specific impact
- Coordinate with role-specific responsibilities
- Never report false completion status