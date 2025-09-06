# PDL Architecture v2.0 - Repository-Centric Design

## Core Concept Change

### Before (v1.x)
- Projects were arbitrary names chosen by users/agents
- Local databases per project directory
- Migration complexity between local and global
- Confusion between "project" naming across different contexts

### After (v2.0)
- **Repository = Project** (using Claude's project ID)
- Single global database at `~/.claude/data/pdl.db`
- No migrations needed - single source of truth
- Consistent project identification across all MCP servers

## Database Schema v2

```sql
-- Repositories table (formerly projects)
CREATE TABLE repositories (
  claude_project_id TEXT PRIMARY KEY,  -- e.g., "-home-persist-repos-lib-mcp-pdl"
  repository_path TEXT NOT NULL,        -- /home/persist/repos/lib/mcp_pdl
  description TEXT,
  vision TEXT,
  created_at TEXT,
  updated_at TEXT,
  team_composition TEXT,  -- JSON
  metadata TEXT           -- JSON with git info, etc.
);

-- Roadmap phases (high-level product phases)
CREATE TABLE roadmap_phases (
  phase_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  phase_name TEXT,
  description TEXT,
  objective TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT,
  completion_percentage INTEGER,
  deliverables TEXT,  -- JSON array
  success_metrics TEXT,  -- JSON array
  phase_order INTEGER,
  FOREIGN KEY (repository_id) REFERENCES repositories (claude_project_id)
);

-- Sprints (each sprint contains a full 7-phase PDL cycle)
CREATE TABLE sprints (
  sprint_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  roadmap_phase_id TEXT,
  sprint_name TEXT,
  sprint_number INTEGER,
  start_date TEXT,
  end_date TEXT,
  status TEXT,
  current_pdl_phase INTEGER (1-7),
  velocity INTEGER,
  burn_down TEXT,  -- JSON array
  retrospective TEXT,
  FOREIGN KEY (repository_id) REFERENCES repositories (claude_project_id),
  FOREIGN KEY (roadmap_phase_id) REFERENCES roadmap_phases (phase_id)
);

-- PDL phases within sprints (7 phases per sprint)
CREATE TABLE sprint_pdl_phases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sprint_id TEXT NOT NULL,
  pdl_phase_number INTEGER (1-7),
  pdl_phase_name TEXT,
  status TEXT,
  completion_percentage INTEGER,
  start_date TEXT,
  end_date TEXT,
  primary_driver TEXT,  -- Role responsible
  deliverables TEXT,    -- JSON
  blockers TEXT,        -- JSON
  notes TEXT,
  FOREIGN KEY (sprint_id) REFERENCES sprints (sprint_id)
);

-- Tasks within PDL phases
CREATE TABLE tasks (
  task_id TEXT PRIMARY KEY,
  sprint_id TEXT NOT NULL,
  pdl_phase_number INTEGER,
  task_description TEXT,
  assignee TEXT,
  status TEXT,
  story_points INTEGER,
  created_at TEXT,
  updated_at TEXT,
  metadata TEXT,  -- JSON
  FOREIGN KEY (sprint_id) REFERENCES sprints (sprint_id)
);

-- Sub-projects (what agents call "projects")
CREATE TABLE subprojects (
  subproject_id TEXT PRIMARY KEY,
  repository_id TEXT NOT NULL,
  subproject_name TEXT,  -- Agent-chosen name
  description TEXT,
  related_sprint_id TEXT,
  created_by TEXT,  -- Which agent/role
  created_at TEXT,
  metadata TEXT,  -- JSON
  FOREIGN KEY (repository_id) REFERENCES repositories (claude_project_id),
  FOREIGN KEY (related_sprint_id) REFERENCES sprints (sprint_id)
);

-- Activity log
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repository_id TEXT NOT NULL,
  timestamp TEXT,
  actor TEXT,
  action TEXT,
  entity_type TEXT,  -- 'sprint', 'task', 'pdl_phase', etc.
  entity_id TEXT,
  details TEXT,  -- JSON
  FOREIGN KEY (repository_id) REFERENCES repositories (claude_project_id)
);
```

## Claude Project ID Detection

```javascript
// Derive Claude project ID from repository path
function getClaudeProjectId(repoPath) {
  // /home/persist/repos/lib/mcp_pdl → -home-persist-repos-lib-mcp-pdl
  return repoPath.replace(/[/_]/g, '-');
}

// Find active session from ~/.claude/projects/{project-id}/*.jsonl
function getCurrentSession(projectId) {
  const projectDir = `~/.claude/projects/${projectId}`;
  // Return most recent .jsonl file
}
```

## Key Changes for Functions

### Old Way
```javascript
mcp__pdl__initialize_project({
  project_name: "my-project",  // Arbitrary name
  description: "..."
})
```

### New Way
```javascript
mcp__pdl__initialize_repository({
  // No project_name - auto-detected from current path
  description: "..."
})
```

## Sprint as PDL Cycle Container

Each sprint now contains a complete 7-phase PDL cycle:

```
Sprint 1 (2 weeks)
├── Phase 1: Discovery & Ideation (Days 1-2)
├── Phase 2: Definition & Scoping (Day 3)
├── Phase 3: Design & Prototyping (Days 4-5)
├── Phase 4: Development (Days 6-9)
├── Phase 5: Testing & QA (Day 10)
├── Phase 6: Launch & Deployment (Day 11)
└── Phase 7: Post-Launch Iteration (Days 12-14)
```

## Benefits

1. **Consistency**: Same project ID across PDL, Nabu, Telos
2. **Simplicity**: No migration logic, single database
3. **Clarity**: Repository = Project, no confusion
4. **Scalability**: Works across multiple repositories
5. **Integration**: Natural fit with Claude's project structure

## Migration Path

Since this is a breaking change:
1. Clear existing database: `rm ~/.claude/data/pdl.db`
2. Each repository re-initializes with new structure
3. No data migration - start fresh with v2.0

## .mpc.config Standard

All MCP servers should generate `.claude/.mpc.config` with:
```json
{
  "project_id": "-home-persist-repos-lib-mcp-pdl",
  "repository_path": "/home/persist/repos/lib/mcp_pdl",
  "mcp_servers": {
    "pdl": "active",
    "nabu": "active",
    "telos": "active"
  }
}
```