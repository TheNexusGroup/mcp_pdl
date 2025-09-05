# MCP Configuration Format (.mcp.config)

The `.mcp.config` file provides a standardized way for multiple projects to reference their project name and Claude project ID. This enables cross-referencing in logs, databases, and other MCP protocols.

## Location

The configuration file should be placed in the `.claude/` directory at the root of your project:

```
your-project/
├── .claude/
│   └── .mcp.config
└── ... (other project files)
```

## Schema

```json
{
  "version": "string",
  "project": {
    "name": "string",
    "id": "string",
    "full_path": "string",
    "description": "string (optional)",
    "created_at": "ISO 8601 timestamp",
    "updated_at": "ISO 8601 timestamp"
  }
}
```

## Field Descriptions

- **version**: Configuration schema version (currently "1.0.0")
- **project.name**: Human-readable project name
- **project.id**: Unique Claude project ID for cross-referencing in logs and databases
- **project.full_path**: Absolute path to the project directory
- **project.description**: Optional project description
- **project.created_at**: ISO 8601 timestamp of when the project was created
- **project.updated_at**: ISO 8601 timestamp of the last update

## Example

```json
{
  "version": "1.0.0",
  "project": {
    "name": "my-awesome-project",
    "id": "proj-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "full_path": "/home/user/projects/my-awesome-project",
    "description": "A revolutionary product built with MCP PDL",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-20T14:45:30.000Z"
  }
}
```

## Usage

The `.mcp.config` file is used by:

1. **MCP Servers**: To identify the project and link data across services
2. **Claude Logs**: To reference the project using the unique ID
3. **Cross-database References**: To maintain consistency across different storage systems
4. **Project Discovery**: MCP tools can traverse up from any subdirectory to find the project root

## Server Configuration

Server-specific settings (host, port, database paths) should be configured in:
- `~/.claude.json` - User-level Claude configuration
- `~/.claude/settings.json` - Global MCP server settings

The `.mcp.config` file focuses solely on project identification to maintain portability across different environments.