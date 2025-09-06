import sqlite3 from 'sqlite3';
import { Project, PDLPhase, Sprint, ActivityLogEntry, PhaseStatus } from '../models/types.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';

interface MigrationSource {
  dbPath: string;
  dataDir: string;
  projectPath: string;
}

export class CentralizedDatabase {
  private db: sqlite3.Database;
  private projectsCache: Map<string, Project> = new Map();
  private centralDbPath: string;
  private migrationLockFile: string;

  constructor() {
    const claudeDataDir = path.join(os.homedir(), '.claude', 'data');
    this.centralDbPath = path.join(claudeDataDir, 'pdl.db');
    this.migrationLockFile = path.join(claudeDataDir, 'pdl-migration.lock');
    
    this.ensureDataDirectory(claudeDataDir);
    this.db = new sqlite3.Database(this.centralDbPath);
    this.initializeTables();
  }

  /**
   * Gets the Claude project identifier (matches Claude's project directory naming)
   */
  private async getProjectIdentifier(projectPath: string): Promise<string> {
    // Use Claude's project directory naming convention
    // /home/persist/repos/lib/mcp_pdl -> -home-persist-repos-lib-mcp-pdl
    // Note: underscores are also converted to hyphens
    return projectPath.replace(/[/_]/g, '-');
  }

  /**
   * Gets the current Claude session ID from the active project file
   */
  private async getClaudeSessionId(projectPath: string): Promise<string> {
    try {
      // Get the Claude project directory name (with underscores converted to hyphens)
      const projectDirName = projectPath.replace(/[/_]/g, '-');
      const claudeProjectDir = path.join(os.homedir(), '.claude', 'projects', projectDirName);
      
      // Find the most recently modified .jsonl file (current session)
      const files = await fs.readdir(claudeProjectDir);
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
      
      if (jsonlFiles.length > 0) {
        // Get file stats and sort by modification time
        const fileStats = await Promise.all(
          jsonlFiles.map(async (file) => {
            const filePath = path.join(claudeProjectDir, file);
            const stats = await fs.stat(filePath);
            return { file, mtime: stats.mtimeMs };
          })
        );
        
        // Sort by modification time (most recent first)
        fileStats.sort((a, b) => b.mtime - a.mtime);
        
        // The filename (without .jsonl) is the session ID
        const currentSession = fileStats[0].file.replace('.jsonl', '');
        console.log(`Using Claude session: ${currentSession}`);
        return currentSession;
      }
    } catch (error: any) {
      console.error('Failed to get Claude session ID:', error?.message || error);
    }

    // Fallback to timestamp-based session ID
    return `session_${Date.now()}`;
  }

  private async ensureDataDirectory(dataDir: string): Promise<void> {
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create central data directory:', error);
    }
  }

  private async initializeTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Enhanced projects table with project and session tracking
        this.db.run(`
          CREATE TABLE IF NOT EXISTS projects (
            project_name TEXT,
            project_id TEXT NOT NULL,
            session_id TEXT,
            description TEXT,
            created_at TEXT,
            updated_at TEXT,
            team_composition TEXT,
            roadmap TEXT,
            source_path TEXT,
            migration_timestamp TEXT,
            data_hash TEXT,
            PRIMARY KEY (project_id, project_name)
          )
        `);

        // Create index for efficient project+session queries
        this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_project_session 
          ON projects (project_id, session_id)
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS phases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name TEXT,
            phase_number INTEGER,
            phase_name TEXT,
            status TEXT,
            start_date TEXT,
            end_date TEXT,
            primary_driver TEXT,
            completion_percentage INTEGER DEFAULT 0,
            key_activities TEXT,
            deliverables TEXT,
            blockers TEXT,
            notes TEXT,
            FOREIGN KEY (project_name) REFERENCES projects (project_name)
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS sprints (
            sprint_id TEXT PRIMARY KEY,
            sprint_name TEXT,
            project_name TEXT,
            phase_number INTEGER,
            start_date TEXT,
            end_date TEXT,
            status TEXT,
            tasks TEXT,
            velocity INTEGER,
            burn_down TEXT,
            retrospective TEXT,
            FOREIGN KEY (project_name) REFERENCES projects (project_name)
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name TEXT,
            timestamp TEXT,
            actor TEXT,
            action TEXT,
            details TEXT,
            phase_number INTEGER,
            sprint_id TEXT,
            FOREIGN KEY (project_name) REFERENCES projects (project_name)
          )
        `);

        // Migration tracking table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT,
            project_name TEXT,
            migration_timestamp TEXT,
            data_hash TEXT,
            status TEXT,
            validation_result TEXT
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  /**
   * Detects and migrates local databases to centralized storage
   * This is called automatically during database initialization
   */
  async performAutoMigration(): Promise<void> {
    // Prevent concurrent migrations
    if (await this.isMigrationInProgress()) {
      console.log('Migration already in progress, skipping...');
      return;
    }

    try {
      await this.createMigrationLock();
      
      const migrationSources = await this.detectLocalDatabases();
      console.log(`Found ${migrationSources.length} local databases to potentially migrate`);

      for (const source of migrationSources) {
        await this.migrateFromSource(source);
      }

    } finally {
      await this.removeMigrationLock();
    }
  }

  private async isMigrationInProgress(): Promise<boolean> {
    try {
      await fs.access(this.migrationLockFile);
      return true;
    } catch {
      return false;
    }
  }

  private async createMigrationLock(): Promise<void> {
    await fs.writeFile(this.migrationLockFile, JSON.stringify({
      pid: process.pid,
      timestamp: new Date().toISOString()
    }));
  }

  private async removeMigrationLock(): Promise<void> {
    try {
      await fs.unlink(this.migrationLockFile);
    } catch (error) {
      console.error('Failed to remove migration lock:', error);
    }
  }

  /**
   * Detects local database files in the filesystem
   */
  private async detectLocalDatabases(): Promise<MigrationSource[]> {
    const sources: MigrationSource[] = [];
    const searchPaths = [
      process.cwd(), // Current working directory
      path.join(process.cwd(), '..'), // Parent directories
      path.join(process.cwd(), '..', '..'),
    ];

    for (const searchPath of searchPaths) {
      const localDbPath = path.join(searchPath, 'data', 'pdl.sqlite');
      const localDataDir = path.join(searchPath, 'data');
      
      // Check if SQLite exists
      let hasDatabase = false;
      try {
        await fs.access(localDbPath);
        hasDatabase = true;
      } catch {
        // No SQLite database
      }
      
      // Check if data directory with JSON files exists
      let hasJsonFiles = false;
      try {
        const files = await fs.readdir(localDataDir);
        hasJsonFiles = files.some(f => f.endsWith('.json') && !f.includes('test'));
      } catch {
        // No data directory or files
      }
      
      // Add source if either database or JSON files exist
      if (hasDatabase || hasJsonFiles) {
        sources.push({
          dbPath: localDbPath,
          dataDir: localDataDir,
          projectPath: searchPath
        });
      }
    }

    return sources;
  }

  /**
   * Migrates data from a local database source
   */
  private async migrateFromSource(source: MigrationSource): Promise<void> {
    // Check if SQLite database exists
    let dbExists = false;
    try {
      await fs.access(source.dbPath);
      dbExists = true;
      console.log(`Starting migration from SQLite: ${source.dbPath}`);
    } catch {
      console.log(`SQLite database not found, checking for JSON fallback: ${source.dbPath}`);
    }
    
    // If no SQLite, try to recover from JSON files
    if (!dbExists) {
      const recovered = await this.recoverFromJSON(source);
      if (!recovered) {
        console.log(`No data to migrate from ${source.projectPath}`);
        return;
      }
      // Now the SQLite should exist from recovery
    }
    
    const localDb = new sqlite3.Database(source.dbPath, sqlite3.OPEN_READONLY);
    
    try {
      // Get all data from local database
      const localData = await this.extractLocalData(localDb);
      
      console.log(`Extracted ${localData.projects.length} projects from local database`);
      
      if (localData.projects.length === 0) {
        console.log(`No projects found in ${source.dbPath}, skipping migration`);
        return;
      }

      // Calculate data hash for validation
      const dataHash = this.calculateDataHash(localData);
      
      // Check if this data has already been migrated
      try {
        const existingMigration = await this.findExistingMigration(source.projectPath, dataHash);
        if (existingMigration) {
          console.log(`Data from ${source.dbPath} already migrated, skipping`);
          return;
        }
      } catch (error) {
        console.log(`Error checking existing migration: ${error}, proceeding with migration`);
      }

      // Perform the migration
      console.log('Inserting data into centralized database...');
      await this.insertMigratedData(localData, source);
      
      console.log('Validating migration...');
      // Validate the migration
      const isValid = await this.validateMigration(localData, source);
      
      if (isValid) {
        // Record successful migration
        await this.recordMigration(source, dataHash, 'completed', 'validation_passed');
        
        // DO NOT DELETE SOURCE DATABASE - ONLY MARK AS MIGRATED
        // Create migration marker instead of deleting
        const markerPath = path.join(source.dataDir, '.pdl-migrated');
        const projectId = await this.getProjectIdentifier(source.projectPath);
        const sessionId = await this.getClaudeSessionId(source.projectPath);
        await fs.writeFile(markerPath, JSON.stringify({
          migratedAt: new Date().toISOString(),
          projectId: projectId,
          sessionId: sessionId,
          projectCount: localData.projects.length
        }));
        console.log('Migration validated - source database preserved as backup');
        
        console.log(`Successfully migrated from: ${source.dbPath}`);
      } else {
        await this.recordMigration(source, dataHash, 'failed', 'validation_failed');
        console.error(`Migration validation failed for: ${source.dbPath}`);
      }

    } catch (error) {
      console.error(`Migration failed for ${source.dbPath}:`, error);
      await this.recordMigration(source, '', 'failed', `error: ${error}`);
    } finally {
      localDb.close();
    }
  }

  private async extractLocalData(localDb: sqlite3.Database): Promise<{
    projects: any[],
    phases: any[],
    sprints: any[],
    activityLog: any[]
  }> {
    return new Promise((resolve, reject) => {
      const data = {
        projects: [] as any[],
        phases: [] as any[],
        sprints: [] as any[],
        activityLog: [] as any[]
      };

      localDb.serialize(() => {
        let completed = 0;
        const checkComplete = () => {
          completed++;
          if (completed === 4) {
            resolve(data);
          }
        };

        localDb.all("SELECT * FROM projects", (err: any, rows: any) => {
          if (err) return reject(err);
          data.projects = rows || [];
          checkComplete();
        });

        localDb.all("SELECT * FROM phases", (err: any, rows: any) => {
          if (err) return reject(err);
          data.phases = rows || [];
          checkComplete();
        });

        localDb.all("SELECT * FROM sprints", (err: any, rows: any) => {
          if (err) return reject(err);
          data.sprints = rows || [];
          checkComplete();
        });

        localDb.all("SELECT * FROM activity_log", (err: any, rows: any) => {
          if (err) return reject(err);
          data.activityLog = rows || [];
          checkComplete();
        });
      });
    });
  }

  private calculateDataHash(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Recovers database from JSON files if SQLite is missing
   */
  private async recoverFromJSON(source: MigrationSource): Promise<boolean> {
    try {
      const jsonFiles = await fs.readdir(source.dataDir);
      const projectFiles = jsonFiles.filter(f => f.endsWith('.json') && !f.includes('test'));
      
      if (projectFiles.length === 0) {
        return false;
      }
      
      console.log(`Found ${projectFiles.length} JSON files, recovering database...`);
      
      // Create a new SQLite database
      const db = new sqlite3.Database(source.dbPath);
      
      await new Promise<void>((resolve, reject) => {
        db.serialize(() => {
          // Create tables
          db.run(`CREATE TABLE IF NOT EXISTS projects (
            project_name TEXT PRIMARY KEY,
            description TEXT,
            created_at TEXT,
            updated_at TEXT,
            team_composition TEXT,
            roadmap TEXT
          )`);
          
          db.run(`CREATE TABLE IF NOT EXISTS phases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name TEXT,
            phase_number INTEGER,
            phase_name TEXT,
            status TEXT,
            start_date TEXT,
            end_date TEXT,
            primary_driver TEXT,
            completion_percentage INTEGER DEFAULT 0,
            key_activities TEXT,
            deliverables TEXT,
            blockers TEXT,
            notes TEXT
          )`);
          
          db.run(`CREATE TABLE IF NOT EXISTS sprints (
            sprint_id TEXT PRIMARY KEY,
            sprint_name TEXT,
            project_name TEXT,
            phase_number INTEGER,
            start_date TEXT,
            end_date TEXT,
            status TEXT,
            tasks TEXT,
            velocity INTEGER,
            burn_down TEXT,
            retrospective TEXT
          )`);
          
          db.run(`CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name TEXT,
            timestamp TEXT,
            actor TEXT,
            action TEXT,
            details TEXT,
            phase_number INTEGER,
            sprint_id TEXT
          )`, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });
      
      // Insert data from JSON files
      for (const file of projectFiles) {
        try {
          const jsonPath = path.join(source.dataDir, file);
          const jsonData = await fs.readFile(jsonPath, 'utf8');
          const projectData = JSON.parse(jsonData);
          
          // Insert project
          await new Promise<void>((resolve, reject) => {
            db.run(
              `INSERT OR REPLACE INTO projects (project_name, description, created_at, updated_at, team_composition, roadmap)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                projectData.project_name || path.basename(file, '.json'),
                projectData.description || '',
                projectData.created_at || new Date().toISOString(),
                projectData.updated_at || new Date().toISOString(),
                JSON.stringify(projectData.team_composition || {}),
                JSON.stringify(projectData.roadmap || null)
              ],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          
          // Insert phases if they exist
          if (projectData.phases) {
            for (const phase of Object.values(projectData.phases) as any[]) {
              await new Promise<void>((resolve, reject) => {
                db.run(
                  `INSERT OR REPLACE INTO phases 
                   (project_name, phase_number, phase_name, status, completion_percentage, notes)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                  [
                    projectData.project_name || path.basename(file, '.json'),
                    phase.phase_number,
                    phase.phase_name,
                    phase.status,
                    phase.completion_percentage || 0,
                    phase.notes || ''
                  ],
                  (err) => {
                    if (err) console.error(`Failed to insert phase: ${err}`);
                    resolve(); // Continue even if phase fails
                  }
                );
              });
            }
          }
        } catch (error) {
          console.error(`Failed to process ${file}:`, error);
        }
      }
      
      db.close();
      console.log(`Recovered database from ${projectFiles.length} JSON files`);
      return true;
      
    } catch (error) {
      console.error('Failed to recover from JSON:', error);
      return false;
    }
  }

  private async findExistingMigration(sourcePath: string, dataHash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT id FROM migrations WHERE source_path = ? AND data_hash = ? AND status = 'completed'",
        [sourcePath, dataHash],
        (err, row) => {
          if (err) return reject(err);
          resolve(!!row);
        }
      );
    });
  }

  private async insertMigratedData(data: any, source: MigrationSource): Promise<void> {
    const migrationTimestamp = new Date().toISOString();
    // Get these before entering the Promise to avoid async issues
    const projectId = await this.getProjectIdentifier(source.projectPath);
    const sessionId = await this.getClaudeSessionId(source.projectPath);
    
    console.log(`Migrating to project: ${projectId}, session: ${sessionId}`);

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION");

        // Insert projects with migration metadata
        const projectStmt = this.db.prepare(`
          INSERT OR REPLACE INTO projects 
          (project_name, project_id, session_id, description, created_at, updated_at, 
           team_composition, roadmap, source_path, migration_timestamp, data_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const project of data.projects) {
          projectStmt.run(
            project.project_name,  // Keep original agent project name
            projectId,  // Claude project identifier (e.g., "-home-persist-repos-lib-mcp-pdl")
            sessionId,  // Claude session ID for filtering
            project.description || '',
            project.created_at || new Date().toISOString(),
            project.updated_at || new Date().toISOString(),
            project.team_composition || '',
            project.roadmap || '',
            source.projectPath,
            migrationTimestamp,
            this.calculateDataHash(project)
          );
        }
        projectStmt.finalize();

        // Insert phases
        const phaseStmt = this.db.prepare(`
          INSERT OR REPLACE INTO phases 
          (project_name, phase_number, phase_name, status, start_date, end_date, primary_driver, 
           completion_percentage, key_activities, deliverables, blockers, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const phase of data.phases) {
          phaseStmt.run(
            phase.project_name, phase.phase_number, phase.phase_name, phase.status,
            phase.start_date, phase.end_date, phase.primary_driver,
            phase.completion_percentage, phase.key_activities, phase.deliverables,
            phase.blockers, phase.notes
          );
        }
        phaseStmt.finalize();

        // Insert sprints
        const sprintStmt = this.db.prepare(`
          INSERT OR REPLACE INTO sprints 
          (sprint_id, sprint_name, project_name, phase_number, start_date, end_date, 
           status, tasks, velocity, burn_down, retrospective)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const sprint of data.sprints) {
          sprintStmt.run(
            sprint.sprint_id, sprint.sprint_name, sprint.project_name, sprint.phase_number,
            sprint.start_date, sprint.end_date, sprint.status, sprint.tasks,
            sprint.velocity, sprint.burn_down, sprint.retrospective
          );
        }
        sprintStmt.finalize();

        // Insert activity log
        const activityStmt = this.db.prepare(`
          INSERT OR REPLACE INTO activity_log 
          (project_name, timestamp, actor, action, details, phase_number, sprint_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const activity of data.activityLog) {
          activityStmt.run(
            activity.project_name, activity.timestamp, activity.actor, activity.action,
            activity.details, activity.phase_number, activity.sprint_id
          );
        }
        activityStmt.finalize();

        this.db.run("COMMIT", (err) => {
          if (err) {
            this.db.run("ROLLBACK");
            return reject(err);
          }
          resolve();
        });
      });
    });
  }

  private async validateMigration(originalData: any, source: MigrationSource): Promise<boolean> {
    try {
      // Extract data from centralized database for comparison
      const centralizedData = await this.extractCentralizedData(originalData.projects.map((p: any) => p.project_name));
      
      // Compare project counts
      if (originalData.projects.length !== centralizedData.projects.length) {
        console.error('Project count mismatch during validation');
        return false;
      }

      // Compare phase counts
      if (originalData.phases.length !== centralizedData.phases.length) {
        console.error('Phase count mismatch during validation');
        return false;
      }

      // Compare sprint counts
      if (originalData.sprints.length !== centralizedData.sprints.length) {
        console.error('Sprint count mismatch during validation');
        return false;
      }

      // Deep comparison of critical project data
      for (const originalProject of originalData.projects) {
        const centralizedProject = centralizedData.projects.find(p => p.project_name === originalProject.project_name);
        if (!centralizedProject) {
          console.error(`Project ${originalProject.project_name} not found in centralized database`);
          return false;
        }

        // Compare critical fields
        if (centralizedProject.description !== originalProject.description ||
            centralizedProject.team_composition !== originalProject.team_composition) {
          console.error(`Data mismatch for project ${originalProject.project_name}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  private async extractCentralizedData(projectNames: string[]): Promise<{
    projects: any[],
    phases: any[],
    sprints: any[]
  }> {
    return new Promise((resolve, reject) => {
      const data = {
        projects: [] as any[],
        phases: [] as any[],
        sprints: [] as any[]
      };

      const placeholders = projectNames.map(() => '?').join(',');

      this.db.serialize(() => {
        this.db.all(`SELECT * FROM projects WHERE project_name IN (${placeholders})`, projectNames, (err, rows) => {
          if (err) return reject(err);
          data.projects = rows || [];
        });

        this.db.all(`SELECT * FROM phases WHERE project_name IN (${placeholders})`, projectNames, (err, rows) => {
          if (err) return reject(err);
          data.phases = rows || [];
        });

        this.db.all(`SELECT * FROM sprints WHERE project_name IN (${placeholders})`, projectNames, (err, rows) => {
          if (err) return reject(err);
          data.sprints = rows || [];
          resolve(data);
        });
      });
    });
  }

  private async recordMigration(source: MigrationSource, dataHash: string, status: string, validationResult: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO migrations 
        (source_path, migration_timestamp, data_hash, status, validation_result)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        source.projectPath,
        new Date().toISOString(),
        dataHash,
        status,
        validationResult,
        (err: any) => {
          if (err) return reject(err);
          resolve();
        }
      );
      stmt.finalize();
    });
  }

  private async cleanupLocalDatabase(source: MigrationSource): Promise<void> {
    try {
      // Remove the SQLite database file
      await fs.unlink(source.dbPath);
      
      // Create a migration marker file to prevent re-processing
      const markerPath = path.join(source.dataDir, '.pdl-migrated');
      await fs.writeFile(markerPath, JSON.stringify({
        migrated_at: new Date().toISOString(),
        migrated_to: this.centralDbPath,
        original_db: source.dbPath
      }), 'utf8');
      
      console.log(`Cleaned up local database: ${source.dbPath}`);
    } catch (error) {
      console.error(`Failed to cleanup local database ${source.dbPath}:`, error);
      throw error;
    }
  }

  // All existing database methods should be preserved and delegated to the centralized database
  async createProject(projectName: string, description?: string, teamComposition?: any): Promise<Project> {
    // Implementation remains the same but operates on centralized database
    const now = new Date().toISOString();
    
    const project: Project = {
      project_name: projectName,
      description: description || '',
      created_at: now,
      updated_at: now,
      team_composition: teamComposition || {},
      roadmap: null as any,
      activity_log: []
    };

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO projects (project_name, description, created_at, updated_at, team_composition, source_path)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        project.project_name,
        project.description,
        project.created_at,
        project.updated_at,
        JSON.stringify(project.team_composition),
        process.cwd(),
        (err: any) => {
          if (err) return reject(err);
          this.projectsCache.set(projectName, project);
          resolve(project);
        }
      );
      stmt.finalize();
    });
  }

  async getAllProjects(): Promise<Project[]> {
    // First return cached projects
    const cachedProjects = Array.from(this.projectsCache.values());
    
    // Also load all from database
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM projects",
        async (err, rows: any[]) => {
          if (err) return reject(err);
          
          const projects: Project[] = [];
          for (const row of rows || []) {
            // Parse the stored JSON data
            const project: Project = {
              project_name: row.project_name,
              description: row.description,
              created_at: row.created_at,
              updated_at: row.updated_at,
              team_composition: row.team_composition ? JSON.parse(row.team_composition) : {},
              roadmap: row.roadmap ? JSON.parse(row.roadmap) : null,
              activity_log: []
            };
            
            // Add to cache if not already there
            if (!this.projectsCache.has(row.project_name)) {
              this.projectsCache.set(row.project_name, project);
            }
            
            projects.push(project);
          }
          
          resolve(projects);
        }
      );
    });
  }

  async getProject(projectName: string): Promise<Project | null> {
    // Check cache first
    if (this.projectsCache.has(projectName)) {
      return this.projectsCache.get(projectName)!;
    }

    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM projects WHERE project_name = ?",
        [projectName],
        async (err, row: any) => {
          if (err) return reject(err);
          if (!row) return resolve(null);

          try {
            const project: Project = {
              project_name: row.project_name,
              description: row.description,
              created_at: row.created_at,
              updated_at: row.updated_at,
              team_composition: row.team_composition ? JSON.parse(row.team_composition) : {},
              roadmap: row.roadmap ? JSON.parse(row.roadmap) : null,
              activity_log: []
            };

            // Load phases (phases are loaded separately to avoid circular references)

            // Cache and return
            this.projectsCache.set(projectName, project);
            resolve(project);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  async updateProject(projectName: string, updates: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.team_composition !== undefined) {
        fields.push('team_composition = ?');
        values.push(JSON.stringify(updates.team_composition));
      }
      if (updates.roadmap !== undefined) {
        fields.push('roadmap = ?');
        values.push(updates.roadmap ? JSON.stringify(updates.roadmap) : null);
      }
      
      if (fields.length === 0) {
        return resolve(true);
      }
      
      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(projectName);
      
      const stmt = this.db.prepare(`
        UPDATE projects SET ${fields.join(', ')} WHERE project_name = ?
      `);
      
      stmt.run(...values, (err: any) => {
        if (err) return reject(err);
        this.projectsCache.delete(projectName);
        resolve(true);
      });
      stmt.finalize();
    });
  }

  async getProjectPhases(projectName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM phases WHERE project_name = ? ORDER BY phase_number",
        [projectName],
        (err: any, rows: any[]) => {
          if (err) return reject(err);
          
          const phases = (rows || []).map((row: any) => ({
            phase_number: row.phase_number,
            phase_name: row.phase_name,
            status: row.status,
            start_date: row.start_date,
            end_date: row.end_date,
            primary_driver: row.primary_driver,
            completion_percentage: row.completion_percentage || 0,
            key_activities: row.key_activities ? JSON.parse(row.key_activities) : [],
            deliverables: row.deliverables ? JSON.parse(row.deliverables) : [],
            blockers: row.blockers ? JSON.parse(row.blockers) : [],
            notes: row.notes || ''
          }));
          
          resolve(phases);
        }
      );
    });
  }

  async updatePhase(projectName: string, phaseNumber: number, phaseData: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE phases 
        SET status = ?, completion_percentage = ?, key_activities = ?, 
            deliverables = ?, blockers = ?, notes = ?, updated_at = ?
        WHERE project_name = ? AND phase_number = ?
      `);
      
      stmt.run(
        phaseData.status,
        phaseData.completion_percentage,
        phaseData.key_activities ? JSON.stringify(phaseData.key_activities) : null,
        phaseData.deliverables ? JSON.stringify(phaseData.deliverables) : null,
        phaseData.blockers ? JSON.stringify(phaseData.blockers) : null,
        phaseData.notes,
        new Date().toISOString(),
        projectName,
        phaseNumber,
        (err: any) => {
          if (err) return reject(err);
          
          // Invalidate cache
          this.projectsCache.delete(projectName);
          resolve();
        }
      );
      stmt.finalize();
    });
  }

  async createSprint(sprint: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO sprints 
        (sprint_id, sprint_name, project_name, phase_number, start_date, end_date, 
         status, tasks, velocity, burn_down, retrospective)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        sprint.sprint_id,
        sprint.sprint_name,
        sprint.project_name || '',
        sprint.phase_number || 1,
        sprint.start_date,
        sprint.end_date,
        sprint.status,
        sprint.tasks ? JSON.stringify(sprint.tasks) : null,
        sprint.velocity,
        sprint.burn_down ? JSON.stringify(sprint.burn_down) : null,
        sprint.retrospective,
        (err: any) => {
          if (err) return reject(err);
          resolve();
        }
      );
      stmt.finalize();
    });
  }

  async updateSprint(sprintId: string, sprintData: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (sprintData.status !== undefined) {
        fields.push('status = ?');
        values.push(sprintData.status);
      }
      if (sprintData.tasks !== undefined) {
        fields.push('tasks = ?');
        values.push(JSON.stringify(sprintData.tasks));
      }
      if (sprintData.velocity !== undefined) {
        fields.push('velocity = ?');
        values.push(sprintData.velocity);
      }
      if (sprintData.burn_down !== undefined) {
        fields.push('burn_down = ?');
        values.push(JSON.stringify(sprintData.burn_down));
      }
      if (sprintData.retrospective !== undefined) {
        fields.push('retrospective = ?');
        values.push(sprintData.retrospective);
      }
      
      if (fields.length === 0) {
        return resolve();
      }
      
      values.push(sprintId);
      
      const stmt = this.db.prepare(`
        UPDATE sprints SET ${fields.join(', ')} WHERE sprint_id = ?
      `);
      
      stmt.run(...values, (err: any) => {
        if (err) return reject(err);
        resolve();
      });
      stmt.finalize();
    });
  }

  async getSprints(projectName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM sprints WHERE project_name = ? ORDER BY start_date DESC",
        [projectName],
        (err: any, rows: any[]) => {
          if (err) return reject(err);
          
          const sprints = (rows || []).map((row: any) => ({
            sprint_id: row.sprint_id,
            sprint_name: row.sprint_name,
            project_name: row.project_name,
            phase_number: row.phase_number,
            start_date: row.start_date,
            end_date: row.end_date,
            status: row.status,
            tasks: row.tasks ? JSON.parse(row.tasks) : [],
            velocity: row.velocity,
            burn_down: row.burn_down ? JSON.parse(row.burn_down) : [],
            retrospective: row.retrospective
          }));
          
          resolve(sprints);
        }
      );
    });
  }

  async logActivity(entry: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO activity_log 
        (project_name, timestamp, actor, action, details, phase_number, sprint_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        entry.project_name || '',
        entry.timestamp || new Date().toISOString(),
        entry.actor || 'system',
        entry.action || '',
        entry.details || '',
        entry.phase_number || null,
        entry.sprint_id || null,
        (err: any) => {
          if (err) return reject(err);
          resolve();
        }
      );
      stmt.finalize();
    });
  }

  
  close(): void {
    this.db.close();
  }
}