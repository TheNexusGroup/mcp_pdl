# MCP PDL Database Migration Strategy

## Problem Statement

We have a complex multi-layered project identification problem that needs to be solved before migration can work properly:

1. **Project Identity Crisis**: Agents use descriptive project names like "mcp_pdl database migration" but we need repo-level identity "mcp_pdl" as the key
2. **Session Isolation**: Need to track Claude session IDs to filter entries per session
3. **Schema Mismatch**: Global database missing `source_path` column causing migration failures
4. **Migration Lock Cleanup**: Lock files not being cleaned up properly after migration
5. **Subdirectory/Worktree Context**: Need consistent project identity regardless of current working directory

## Current State Analysis

### Local Database Status
- **Location**: `/home/persist/repos/lib/mcp_pdl/data/pdl.sqlite`
- **Projects**: 24 projects with descriptive names
- **Schema**: Old schema without `source_path`, `migration_timestamp`, `data_hash`

### Global Database Status
- **Location**: `~/.claude/data/pdl.sqlite`
- **Projects**: 0 projects (migration failed)
- **Schema**: New schema WITH `source_path` but missing from table creation

### Migration Issues
- Schema mismatch preventing data insertion
- No Claude session tracking
- No repo-level project identity
- Lock files not cleaned up

## Migration Strategy - Sequential Steps

### Phase 1: Schema Standardization
**Status**: ❌ Not Started

1. **Check Global Database Schema**
   - Verify if `source_path` column exists in global database
   - If missing, document the schema inconsistency

2. **Fix Global Database Schema**
   - If `source_path` is missing from actual table, drop and recreate global database
   - Ensure schema matches the initialization code

3. **Verify Schema Consistency**
   - Local DB: `project_name, description, created_at, updated_at, team_composition, roadmap`
   - Global DB: `project_name, description, created_at, updated_at, team_composition, roadmap, source_path, migration_timestamp, data_hash`

### Phase 2: Project Identity Resolution
**Status**: ❌ Not Started

1. **Implement Repo Name Detection**
   - Create function to detect repo name from `.git` directory or MCP config
   - Fallback to directory name if no git repo found
   - Function: `getRepoIdentifier(): string`

2. **Add Session ID Tracking**
   - Detect Claude session ID from `~/.claude/statsig/` or `claude status`
   - Add `session_id` column to projects table schema
   - Function: `getClaudeSessionId(): string`

3. **Update Database Schema**
   - Add `repo_name` field to store the repository identifier
   - Add `session_id` field to track Claude sessions
   - Add `agent_project_name` field to store agent-chosen descriptive names
   - Migration path: `repo_name` becomes the primary key, `agent_project_name` is descriptive

### Phase 3: Migration Logic Updates
**Status**: ❌ Not Started

1. **Update Data Extraction**
   - Modify `extractLocalData()` to only select existing columns from local DB
   - Add repo name detection during extraction
   - Add session ID detection during extraction

2. **Update Data Insertion**
   - Map local `project_name` to `agent_project_name` 
   - Use detected repo name as `repo_name` (new primary identifier)
   - Add current session ID to all migrated records
   - Update all references to use `repo_name` instead of `project_name` for project identity

3. **Update Project Lookup Logic**
   - Modify all handlers to use `repo_name` + `session_id` for project identification
   - Keep `agent_project_name` for display/descriptive purposes
   - Ensure subdirectory/worktree operations still find correct project

### Phase 4: Migration Cleanup & Safety
**Status**: ❌ Not Started

1. **Implement Proper Lock Cleanup**
   - Ensure migration lock is removed in all exit scenarios
   - Add timeout mechanism for stale locks
   - Add process validation for lock ownership

2. **Add Migration Validation**
   - Verify data integrity after migration
   - Ensure all local projects were migrated with correct repo identity
   - Validate session ID assignment

3. **Implement Rollback Mechanism**
   - Create backup of local database before migration
   - Implement rollback function if migration fails
   - Test recovery scenarios

### Phase 5: Testing & Validation
**Status**: ❌ Not Started

1. **Clean Environment Test**
   - Remove global database: `rm ~/.claude/data/pdl.sqlite`
   - Remove migration lock: `rm ~/.claude/data/pdl-migration.lock`
   - Restart Claude session to test fresh migration

2. **Multi-Session Test**
   - Test migration from different directories
   - Test migration with different Claude sessions
   - Verify session isolation works correctly

3. **Integration Test**
   - Verify all MCP PDL commands work after migration
   - Test project operations from different directories
   - Verify no data mixing between sessions

## Implementation Order

### Immediate Actions (This Session)
1. ✅ Document current state and strategy (this document)
2. ❌ Verify global database schema for `source_path` column
3. ❌ If schema mismatch found, remove global database for clean start
4. ❌ Clean up migration lock files

### Next Session Actions
1. Implement repo name detection function
2. Implement Claude session ID detection function
3. Update database schemas to include new fields
4. Update migration logic with new field mappings
5. Test migration with clean environment

## Key Functions to Implement

```typescript
// New functions needed:
getRepoIdentifier(): string // Returns "mcp_pdl" from git/config
getClaudeSessionId(): string // Returns current Claude session ID
updateDatabaseSchema(): void // Adds new columns for repo/session tracking
migrateWithProperIdentity(): void // Migration with correct identity mapping
```

## Risk Mitigation

1. **Data Loss Prevention**: Always backup local database before migration
2. **Session Contamination**: Strict session ID validation and filtering
3. **Schema Evolution**: Version-aware schema updates
4. **Lock Deadlocks**: Timeout and process validation for locks
5. **Identity Conflicts**: Proper validation of repo names and session IDs

## Success Criteria

- ✅ All 24 local projects migrated to global database
- ✅ Each project has correct repo identifier ("mcp_pdl") 
- ✅ Each project has current Claude session ID
- ✅ Original agent project names preserved in separate field
- ✅ Migration works from any subdirectory/worktree
- ✅ No data mixing between different Claude sessions
- ✅ Clean migration lock cleanup
- ✅ All MCP PDL commands work after migration

## Command to Resume Work

When restarting session, use:
```
Review MIGRATION_STRATEGY.md document and continue implementation from where we left off. Check current state and proceed with next pending phase.
```