import sqlite3 from 'sqlite3';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * PDL Database v3 - Clean terminology
 * - repositories: Metadata storage for Claude projects
 * - projects: What agents work on (formerly roadmap_phases)
 * - phases: Iterations within projects (formerly sprints)
 * - steps: The 7 PDL steps within each phase (formerly sprint_pdl_phases)
 * - tasks: Individual work items within steps
 * - documentation: Docs created during work
 */
export class PDLDatabase {
  private db: sqlite3.Database;
  private dbPath: string;
  private currentRepositoryId: string | null = null;

  constructor() {
    const claudeDataDir = path.join(os.homedir(), '.claude', 'data');
    this.dbPath = path.join(claudeDataDir, 'pdl.db');
    
    this.ensureDataDirectory(claudeDataDir);
    this.db = new sqlite3.Database(this.dbPath);
    this.initializeTables().then(() => {
      return this.migrateSchema();
    }).then(() => {
      this.detectCurrentRepository();
    }).catch(err => {
      console.error('Database initialization failed:', err);
    });
  }

  private async detectCurrentRepository(): Promise<void> {
    const cwd = process.cwd();
    const mcpConfigPath = path.join(cwd, '.claude', '.mcp.config');
    
    try {
      const configData = await fs.readFile(mcpConfigPath, 'utf8');
      const config = JSON.parse(configData);
      this.currentRepositoryId = config.project?.id || cwd.replace(/[/_]/g, '-');
      console.error(`Detected repository ID from .mcp.config: ${this.currentRepositoryId}`);
    } catch (error) {
      // Fallback to path-based ID
      this.currentRepositoryId = cwd.replace(/[/_]/g, '-');
      console.error(`Using fallback repository ID: ${this.currentRepositoryId}`);
    }
  }

  private async ensureDataDirectory(dataDir: string): Promise<void> {
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create data directory:', error);
    }
  }

  private async initializeTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Repository metadata storage
        this.db.run(`
          CREATE TABLE IF NOT EXISTS repositories (
            claude_project_id TEXT PRIMARY KEY,
            repository_path TEXT NOT NULL,
            repository_name TEXT,
            description TEXT,
            created_at TEXT,
            updated_at TEXT,
            team_composition TEXT,
            metadata TEXT
          )
        `);

        // Projects (what agents work on)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS projects (
            project_id TEXT PRIMARY KEY,
            repository_id TEXT NOT NULL,
            session_id TEXT,
            project_name TEXT,
            description TEXT,
            objective TEXT,
            start_date TEXT,
            end_date TEXT,
            status TEXT DEFAULT 'not_started',
            completion_percentage INTEGER DEFAULT 0,
            deliverables TEXT,
            success_metrics TEXT,
            project_order INTEGER,
            metadata TEXT,
            FOREIGN KEY (repository_id) REFERENCES repositories (claude_project_id)
          )
        `);

        // Phases (iterations within projects)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS phases (
            phase_id TEXT PRIMARY KEY,
            repository_id TEXT NOT NULL,
            project_id TEXT,
            phase_name TEXT,
            phase_number INTEGER,
            start_date TEXT,
            end_date TEXT,
            status TEXT DEFAULT 'planning',
            current_step INTEGER DEFAULT 1,
            velocity INTEGER DEFAULT 0,
            burn_down TEXT,
            retrospective TEXT,
            metadata TEXT,
            FOREIGN KEY (repository_id) REFERENCES repositories (claude_project_id),
            FOREIGN KEY (project_id) REFERENCES projects (project_id)
          )
        `);

        // Steps (7 PDL steps within each phase)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phase_id TEXT NOT NULL,
            step_number INTEGER CHECK(step_number >= 1 AND step_number <= 7),
            step_name TEXT,
            status TEXT DEFAULT 'not_started',
            completion_percentage INTEGER DEFAULT 0,
            start_date TEXT,
            end_date TEXT,
            primary_driver TEXT,
            deliverables TEXT,
            blockers TEXT,
            notes TEXT,
            FOREIGN KEY (phase_id) REFERENCES phases (phase_id),
            UNIQUE(phase_id, step_number)
          )
        `);

        // Tasks within steps
        this.db.run(`
          CREATE TABLE IF NOT EXISTS tasks (
            task_id TEXT PRIMARY KEY,
            phase_id TEXT NOT NULL,
            step_number INTEGER,
            task_description TEXT,
            assignee TEXT,
            status TEXT DEFAULT 'todo',
            story_points INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT,
            metadata TEXT,
            FOREIGN KEY (phase_id) REFERENCES phases (phase_id)
          )
        `);

        // Documentation table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS documentation (
            doc_id TEXT PRIMARY KEY,
            repository_id TEXT NOT NULL,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            summary_brief TEXT,
            creating_agent TEXT,
            project_id TEXT,
            phase_id TEXT,
            task_id TEXT,
            created_at TEXT,
            updated_at TEXT,
            metadata TEXT,
            FOREIGN KEY (repository_id) REFERENCES repositories (claude_project_id),
            FOREIGN KEY (project_id) REFERENCES projects (project_id),
            FOREIGN KEY (phase_id) REFERENCES phases (phase_id),
            FOREIGN KEY (task_id) REFERENCES tasks (task_id)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  private async migrateSchema(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create schema_version table if it doesn't exist
      this.db.run(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Get current schema version
        this.db.get("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1", (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          const currentVersion = row ? row.version : 0;
          console.error(`Current schema version: ${currentVersion}`);

          // Apply migrations
          this.applyMigrations(currentVersion).then(resolve).catch(reject);
        });
      });
    });
  }

  private async applyMigrations(fromVersion: number): Promise<void> {
    const migrations = [
      {
        version: 1,
        description: "Add repository_name column",
        sql: `ALTER TABLE repositories ADD COLUMN repository_name TEXT`
      },
      {
        version: 2,
        description: "Add session_id column to projects",
        sql: `ALTER TABLE projects ADD COLUMN session_id TEXT`
      },
      {
        version: 3,
        description: "Add step_name column to steps",
        sql: `ALTER TABLE steps ADD COLUMN step_name TEXT`
      }
    ];

    for (const migration of migrations) {
      if (migration.version > fromVersion) {
        console.error(`Applying migration ${migration.version}: ${migration.description}`);
        
        await new Promise<void>((resolve, reject) => {
          this.db.run(migration.sql, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              reject(err);
            } else {
              // Update schema version
              this.db.run("INSERT OR REPLACE INTO schema_version (version) VALUES (?)", [migration.version], (err) => {
                if (err) reject(err);
                else resolve();
              });
            }
          });
        });
      }
    }
  }

  // ==================== REPOSITORY OPERATIONS ====================

  async initializeRepository(description?: string, teamComposition?: any): Promise<any> {
    if (!this.currentRepositoryId) {
      throw new Error('Could not detect repository ID');
    }

    const now = new Date().toISOString();
    const repoPath = process.cwd();
    const repoName = path.basename(repoPath);
    const logPath = path.join(repoPath, '.claude', 'logs');
    
    // Metadata includes logpath for fast retrieval
    const metadata = {
      logpath: logPath,
      initialized_at: now
    };

    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM repositories WHERE claude_project_id = ?",
        [this.currentRepositoryId],
        (err, existing) => {
          if (existing) {
            // Update metadata with logpath
            this.db.run(
              "UPDATE repositories SET metadata = ?, updated_at = ? WHERE claude_project_id = ?",
              [JSON.stringify(metadata), now, this.currentRepositoryId],
              (err) => {
                resolve({
                  success: true,
                  repository_id: this.currentRepositoryId,
                  message: 'Repository already initialized, metadata updated',
                  logpath: logPath
                });
              }
            );
            return;
          }

          // Create new repository entry
          this.db.run(
            `INSERT INTO repositories (
              claude_project_id, repository_path, repository_name, description, 
              created_at, updated_at, team_composition, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              this.currentRepositoryId,
              repoPath,
              repoName,
              description || '',
              now,
              now,
              JSON.stringify(teamComposition || {}),
              JSON.stringify(metadata)
            ],
            (err) => {
              if (err) reject(err);
              else {
                resolve({
                  success: true,
                  repository_id: this.currentRepositoryId,
                  repository_path: repoPath,
                  repository_name: repoName,
                  logpath: logPath,
                  message: 'Repository initialized successfully'
                });
              }
            }
          );
        }
      );
    });
  }

  async listRepositories(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT claude_project_id, repository_path, repository_name, description FROM repositories ORDER BY updated_at DESC",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getMetadata(params?: { [key: string]: any }): Promise<any> {
    if (!this.currentRepositoryId) {
      throw new Error('Repository not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT metadata FROM repositories WHERE claude_project_id = ?",
        [this.currentRepositoryId],
        (err, row: any) => {
          if (err) reject(err);
          else if (!row) {
            resolve(null);
          } else {
            const metadata = JSON.parse(row.metadata || '{}');
            
            // If params provided, filter metadata
            if (params && Object.keys(params).length > 0) {
              const filtered: any = {};
              for (const key of Object.keys(params)) {
                if (metadata[key]) {
                  filtered[key] = metadata[key];
                }
              }
              resolve(filtered);
            } else {
              // Return all metadata
              resolve(metadata);
            }
          }
        }
      );
    });
  }

  // ==================== PROJECT OPERATIONS ====================

  async createProject(name: string, description: string, objective: string): Promise<any> {
    if (!this.currentRepositoryId) {
      throw new Error('Repository not initialized');
    }

    const projectId = `proj_${Date.now()}`;

    return new Promise((resolve, reject) => {
      // Get next project order
      this.db.get(
        "SELECT MAX(project_order) as max_order FROM projects WHERE repository_id = ?",
        [this.currentRepositoryId],
        (err, row: any) => {
          const order = (row?.max_order || 0) + 1;

          this.db.run(
            `INSERT INTO projects (
              project_id, repository_id, project_name, description,
              objective, project_order, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              projectId,
              this.currentRepositoryId,
              name,
              description,
              objective,
              order,
              '{}'
            ],
            (err) => {
              if (err) reject(err);
              else {
                resolve({
                  success: true,
                  project_id: projectId,
                  project_name: name,
                  message: `Project "${name}" created successfully`
                });
              }
            }
          );
        }
      );
    });
  }

  async listProjects(repositoryId?: string, searchTerm?: string): Promise<any> {
    const repoId = repositoryId || this.currentRepositoryId;
    
    let query = "SELECT * FROM projects WHERE repository_id = ?";
    const params: any[] = [repoId];
    
    if (searchTerm) {
      query += " AND (project_name LIKE ? OR description LIKE ? OR objective LIKE ?)";
      const search = `%${searchTerm}%`;
      params.push(search, search, search);
    }
    
    query += " ORDER BY project_order";
    
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // ==================== PHASE OPERATIONS ====================

  async createPhase(projectId: string, phaseName: string, duration: number = 14): Promise<any> {
    if (!this.currentRepositoryId) {
      throw new Error('Repository not initialized');
    }

    const phaseId = `phase_${Date.now()}`;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration);

    // Get phase number for this project
    const phaseNumber = await this.getNextPhaseNumber(projectId);

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO phases (
          phase_id, repository_id, project_id, phase_name,
          phase_number, start_date, end_date, status, current_step
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          phaseId,
          this.currentRepositoryId,
          projectId,
          phaseName,
          phaseNumber,
          startDate.toISOString(),
          endDate.toISOString(),
          'active',
          1
        ],
        async (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Create 7 PDL steps for this phase
          await this.initializePhaseSteps(phaseId);

          resolve({
            success: true,
            phase_id: phaseId,
            phase_name: phaseName,
            phase_number: phaseNumber,
            message: `Phase "${phaseName}" created with 7 PDL steps`
          });
        }
      );
    });
  }

  async listPhases(projectId?: string, searchTerm?: string): Promise<any> {
    let query = "SELECT * FROM phases WHERE repository_id = ?";
    const params: any[] = [this.currentRepositoryId];
    
    if (projectId) {
      query += " AND project_id = ?";
      params.push(projectId);
    }
    
    if (searchTerm) {
      query += " AND phase_name LIKE ?";
      params.push(`%${searchTerm}%`);
    }
    
    query += " ORDER BY phase_number";
    
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  private async initializePhaseSteps(phaseId: string): Promise<void> {
    const pdlSteps = [
      { num: 1, name: 'Discovery & Ideation', driver: 'Product Manager' },
      { num: 2, name: 'Definition & Scoping', driver: 'Product Manager' },
      { num: 3, name: 'Design & Prototyping', driver: 'Product Designer' },
      { num: 4, name: 'Development & Implementation', driver: 'Engineering Manager' },
      { num: 5, name: 'Testing & Quality Assurance', driver: 'QA Engineer' },
      { num: 6, name: 'Launch & Deployment', driver: 'Engineering Manager' },
      { num: 7, name: 'Post-Launch: Growth & Iteration', driver: 'Product Manager' }
    ];

    for (const step of pdlSteps) {
      await new Promise((resolve, reject) => {
        this.db.run(
          `INSERT INTO steps (
            phase_id, step_number, step_name, 
            status, primary_driver
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            phaseId,
            step.num,
            step.name,
            step.num === 1 ? 'in_progress' : 'not_started',
            step.driver
          ],
          (err) => {
            if (err) reject(err);
            else resolve(true);
          }
        );
      });
    }
  }

  // ==================== STEP OPERATIONS ====================

  async updateStep(phaseId: string, stepNumber: number, updates: any): Promise<any> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (updates.status) {
      setClause.push('status = ?');
      values.push(updates.status);
    }
    if (updates.completion_percentage !== undefined) {
      setClause.push('completion_percentage = ?');
      values.push(updates.completion_percentage);
    }
    if (updates.deliverables) {
      setClause.push('deliverables = ?');
      values.push(JSON.stringify(updates.deliverables));
    }
    if (updates.blockers) {
      setClause.push('blockers = ?');
      values.push(JSON.stringify(updates.blockers));
    }
    if (updates.notes) {
      setClause.push('notes = ?');
      values.push(updates.notes);
    }

    values.push(phaseId, stepNumber);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE steps SET ${setClause.join(', ')} 
         WHERE phase_id = ? AND step_number = ?`,
        values,
        (err) => {
          if (err) reject(err);
          else {
            // Update current step in phase if completed
            if (updates.status === 'completed' && stepNumber < 7) {
              this.db.run(
                "UPDATE phases SET current_step = ? WHERE phase_id = ?",
                [stepNumber + 1, phaseId]
              );
            }

            resolve({
              success: true,
              phase_id: phaseId,
              step: stepNumber,
              updates,
              message: `Step ${stepNumber} updated`
            });
          }
        }
      );
    });
  }

  async listSteps(phaseId?: string, searchTerm?: string): Promise<any> {
    let query = "SELECT s.*, p.phase_name FROM steps s JOIN phases p ON s.phase_id = p.phase_id WHERE 1=1";
    const params: any[] = [];
    
    if (phaseId) {
      query += " AND s.phase_id = ?";
      params.push(phaseId);
    }
    
    if (searchTerm) {
      query += " AND (s.step_name LIKE ? OR s.notes LIKE ?)";
      const search = `%${searchTerm}%`;
      params.push(search, search);
    }
    
    query += " ORDER BY s.phase_id, s.step_number";
    
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // ==================== TASK OPERATIONS ====================

  async createTask(phaseId: string, stepNumber: number, taskDescription: string, assignee?: string, storyPoints?: number): Promise<any> {
    const taskId = `TASK_${Date.now()}`;
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO tasks (
          task_id, phase_id, step_number, task_description,
          assignee, story_points, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          phaseId,
          stepNumber,
          taskDescription,
          assignee || '',
          storyPoints || 0,
          'todo',
          now,
          now
        ],
        (err) => {
          if (err) reject(err);
          else {
            resolve({
              success: true,
              task_id: taskId,
              message: 'Task created successfully'
            });
          }
        }
      );
    });
  }

  async updateTaskStatus(taskId: string, status: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE tasks SET status = ?, updated_at = ? WHERE task_id = ?",
        [status, new Date().toISOString(), taskId],
        (err) => {
          if (err) reject(err);
          else {
            resolve({
              success: true,
              task_id: taskId,
              status,
              message: `Task status updated to ${status}`
            });
          }
        }
      );
    });
  }

  async listTasks(phaseId?: string, stepNumber?: number, searchTerm?: string): Promise<any> {
    let query = "SELECT * FROM tasks WHERE 1=1";
    const params: any[] = [];
    
    if (phaseId) {
      query += " AND phase_id = ?";
      params.push(phaseId);
    }
    
    if (stepNumber) {
      query += " AND step_number = ?";
      params.push(stepNumber);
    }
    
    if (searchTerm) {
      query += " AND (task_description LIKE ? OR assignee LIKE ?)";
      const search = `%${searchTerm}%`;
      params.push(search, search);
    }
    
    query += " ORDER BY created_at DESC";
    
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // ==================== DOCUMENTATION OPERATIONS ====================

  async createDocumentation(args: {
    name: string;
    path: string;
    summary_brief?: string;
    creating_agent?: string;
    project_id?: string;
    phase_id?: string;
    task_id?: string;
  }): Promise<any> {
    if (!this.currentRepositoryId) {
      throw new Error('Repository not initialized');
    }

    const docId = `doc_${Date.now()}`;
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO documentation (
          doc_id, repository_id, name, path, summary_brief,
          creating_agent, project_id, phase_id, task_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          docId,
          this.currentRepositoryId,
          args.name,
          args.path,
          args.summary_brief || '',
          args.creating_agent || 'unknown',
          args.project_id || null,
          args.phase_id || null,
          args.task_id || null,
          now,
          now
        ],
        (err) => {
          if (err) reject(err);
          else {
            resolve({
              success: true,
              doc_id: docId,
              message: `Documentation "${args.name}" created`
            });
          }
        }
      );
    });
  }

  async listDocumentation(projectId?: string, phaseId?: string, searchTerm?: string): Promise<any> {
    let query = `SELECT d.*, 
                        p.project_name, 
                        ph.phase_name, 
                        t.task_description as task_name
                 FROM documentation d
                 LEFT JOIN projects p ON d.project_id = p.project_id
                 LEFT JOIN phases ph ON d.phase_id = ph.phase_id  
                 LEFT JOIN tasks t ON d.task_id = t.task_id
                 WHERE d.repository_id = ?`;
    const params: any[] = [this.currentRepositoryId];
    
    if (projectId) {
      query += " AND d.project_id = ?";
      params.push(projectId);
    }
    
    if (phaseId) {
      query += " AND d.phase_id = ?";
      params.push(phaseId);
    }
    
    if (searchTerm) {
      query += ` AND (d.name LIKE ? OR d.summary_brief LIKE ? OR d.path LIKE ? 
                     OR p.project_name LIKE ? OR ph.phase_name LIKE ? OR t.task_description LIKE ?)`;
      const search = `%${searchTerm}%`;
      params.push(search, search, search, search, search, search);
    }
    
    query += " ORDER BY d.created_at DESC";
    
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // ==================== QUERY OPERATIONS ====================

  async getCurrentStatus(): Promise<any> {
    if (!this.currentRepositoryId) {
      throw new Error('Repository not initialized');
    }

    const repo = await this.getCurrentRepository();
    const projects = await this.listProjects();
    const activePhase = await this.getActivePhase();

    return {
      repository_id: this.currentRepositoryId,
      repository: repo,
      projects,
      active_phase: activePhase,
      current_step: activePhase?.current_step || null
    };
  }

  private async getCurrentRepository(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM repositories WHERE claude_project_id = ?",
        [this.currentRepositoryId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  private async getActivePhase(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM phases 
         WHERE repository_id = ? AND status IN ('active', 'in_progress')
         ORDER BY start_date DESC LIMIT 1`,
        [this.currentRepositoryId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  private async getNextPhaseNumber(projectId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT MAX(phase_number) as max_num FROM phases WHERE project_id = ?",
        [projectId],
        (err, row: any) => {
          if (err) reject(err);
          else resolve((row?.max_num || 0) + 1);
        }
      );
    });
  }

  getCurrentRepositoryId(): string | null {
    return this.currentRepositoryId;
  }

  close(): void {
    this.db.close();
  }
}