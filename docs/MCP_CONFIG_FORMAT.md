# MCP Config File Format (.mcp.config)

## Overview

The `.mcp.config` file is a JSON configuration file stored in the `.claude/` directory of each project that uses the MCP PDL (Product Development Lifecycle) system. This file serves as the single source of truth for project metadata, team composition, and PDL state management.

## File Location

The config file is always located at:
```
<project-root>/.claude/.mcp.config
```

## File Format Specification

### Root Structure

```json
{
  "version": "string",
  "project": { /* Project Information */ },
  "pdl": { /* PDL State Management */ },
  "team": { /* Team Composition */ },
  "mcp_server": { /* Server Configuration */ },
  "settings": { /* Project Settings */ }
}
```

### Field Definitions

#### version (required)
- **Type**: `string`
- **Description**: Version of the config file format
- **Current Version**: `"1.0.0"`
- **Example**: `"1.0.0"`

#### project (required)
Project identification and metadata.

```json
{
  "name": "string",           // Project name (required)
  "id": "string",             // Unique project UUID (required)
  "full_path": "string",      // Absolute path to project root (required)
  "description": "string",    // Project description (optional)
  "created_at": "string",     // ISO 8601 creation timestamp (required)
  "updated_at": "string"      // ISO 8601 last update timestamp (required)
}
```

#### pdl (required)
Product Development Lifecycle state tracking.

```json
{
  "current_phase": "number",        // Current active phase (1-7) (required)
  "start_phase": "number",          // Phase where project started (1-7) (required)
  "phases_completed": "number[]",   // Array of completed phase numbers (required)
  "total_sprints": "number",        // Total number of sprints created (required)
  "active_sprints": "string[]"      // Array of active sprint names (required)
}
```

**Phase Numbers:**
1. Discovery & Ideation
2. Definition & Scoping
3. Design & Prototyping
4. Development & Implementation
5. Testing & Quality Assurance
6. Launch & Deployment
7. Post-Launch: Growth & Iteration

#### team (optional)
Team member assignments by role.

```json
{
  "product_manager": "string | string[]",     // PM name(s)
  "product_designer": "string | string[]",   // Designer name(s)
  "engineering_manager": "string",           // EM name
  "engineers": "string[]",                   // Engineer names
  "qa_engineers": "string[]",                // QA engineer names
  "marketing_manager": "string",             // Marketing manager name
  "sales_support": "string[]"                // Sales & support team names
}
```

#### mcp_server (optional)
MCP server connection configuration.

```json
{
  "host": "string",                // Server host (optional, default: localhost)
  "port": "number",                // Server port (optional, default: 3001)
  "database_path": "string",       // SQLite database path (optional)
  "connection_string": "string"    // Full connection string (optional)
}
```

#### settings (optional)
Project-specific settings and preferences.

```json
{
  "auto_transition": "boolean",               // Auto-advance phases (default: false)
  "notification_channels": "string[]",       // Notification channels (default: [])
  "default_sprint_duration_days": "number",  // Sprint duration (default: 14)
  "quality_gates_enabled": "boolean"         // Enable quality gates (default: true)
}
```

## Example Configuration

```json
{
  "version": "1.0.0",
  "project": {
    "name": "mobile-app-redesign",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "full_path": "/home/user/projects/mobile-app-redesign",
    "description": "Complete redesign of our mobile application with improved UX and performance",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-02-01T14:22:00.000Z"
  },
  "pdl": {
    "current_phase": 3,
    "start_phase": 1,
    "phases_completed": [1, 2],
    "total_sprints": 4,
    "active_sprints": ["design-sprint-2", "prototype-validation"]
  },
  "team": {
    "product_manager": "Alice Johnson",
    "product_designer": "Bob Smith",
    "engineering_manager": "Carol Davis",
    "engineers": ["Dave Wilson", "Eve Brown", "Frank Miller"],
    "qa_engineers": ["Grace Lee"],
    "marketing_manager": "Henry Chen",
    "sales_support": ["Ivy Taylor", "Jack Wilson"]
  },
  "mcp_server": {
    "host": "localhost",
    "port": 3001,
    "database_path": "data/pdl.sqlite"
  },
  "settings": {
    "auto_transition": false,
    "notification_channels": ["slack", "email"],
    "default_sprint_duration_days": 14,
    "quality_gates_enabled": true
  }
}
```

## CLI Usage

### Initialize New Project
```bash
mcp-pdl init --name "my-project" --description "My awesome project"
```

### Check Project Status
```bash
mcp-pdl status
```

### View Configuration
```bash
mcp-pdl config --show
```

### Validate Configuration
```bash
mcp-pdl validate
```

### Sync with Server
```bash
mcp-pdl sync
```

## Project Discovery

The MCP PDL system uses a hierarchical search to find the nearest `.mcp.config` file:

1. Start from current working directory
2. Look for `.claude/.mcp.config` in current directory
3. If not found, move up one directory level
4. Repeat until file is found or filesystem root is reached

This allows you to run MCP commands from anywhere within a project tree.

## Integration with MCP Functions

When using MCP PDL functions, the system automatically:

1. **Discovers** the project config from current directory
2. **Validates** the configuration format and required fields
3. **Uses** the project name and settings from the config
4. **Syncs** changes back to the local config file

### Example MCP Function Calls

Instead of manually specifying project names:

```javascript
// Old way - manual project specification
await mcp__pdl__get_phase({ 
  project_name: "mobile-app-redesign" 
});

// New way - automatic discovery from config
await mcp__pdl__get_phase_from_current_directory();
```

## Validation Rules

The system validates configs against these rules:

- ✅ **version** must be present and valid
- ✅ **project.name** must be a non-empty string
- ✅ **project.id** must be a valid UUID
- ✅ **project.full_path** must be an absolute path
- ✅ **pdl.current_phase** must be 1-7
- ✅ **pdl.start_phase** must be 1-7
- ✅ **phases_completed** must be an array of valid phase numbers
- ✅ Team roles must match expected role names
- ✅ All timestamps must be valid ISO 8601 format

## Synchronization

The config file stays synchronized with the MCP PDL server through:

1. **Automatic Updates**: Local config updates when MCP functions modify server state
2. **Manual Sync**: `mcp-pdl sync` command pulls latest state from server
3. **Conflict Resolution**: Server state takes precedence during sync operations

## Best Practices

1. **Version Control**: Commit `.mcp.config` files to version control
2. **Team Sharing**: All team members should have access to the config
3. **Regular Sync**: Run `mcp-pdl sync` when switching between branches
4. **Validation**: Use `mcp-pdl validate` before important operations
5. **Backup**: Keep backups of config files for critical projects

## Migration

When upgrading config file versions:

1. The system will automatically migrate older formats
2. Backup original config files before migration
3. Validate migrated configs with `mcp-pdl validate`
4. Update all team members' local configs

## Security Considerations

- Config files may contain sensitive team information
- Use `.gitignore` entries if configs contain secrets
- Consider environment-specific config overlays for sensitive data
- Validate config integrity in CI/CD pipelines