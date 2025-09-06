import sqlite3 from 'sqlite3';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * PDL Database - Repository-centric design
 * Each repository is identified by its Claude project ID
 */
export class PDLDatabase {
  private db: sqlite3.Database;
  private dbPath: string;
  private currentRepositoryId: string | null = null;

  constructor() {
    // Always use global database
    const claudeDataDir = path.join(os.homedir(), '.claude', 'data');
    this.dbPath = path.join(claudeDataDir, 'pdl.db');
    
    this.ensureDataDirectory(claudeDataDir);
    this.db = new sqlite3.Database(this.dbPath);
    this.initializeTables();
    this.detectCurrentRepository();
  }

  /**
   * Detect current repository from working directory
   */
  private async detectCurrentRepository(): Promise<void> {
    const cwd = process.cwd();
    // Convert path to Claude project ID format
    // /home/persist/repos/lib/mcp_pdl → -home-persist-repos-lib-mcp-pdl
    this.currentRepositoryId = cwd.replace(/[/_]/g, '-');
    console.error(`Detected repository ID: ${this.currentRepositoryId}`);
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
        // Repositories table (the main project)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS repositories (
            claude_project_id TEXT PRIMARY KEY,
            repository_path TEXT NOT NULL,
            description TEXT,
            vision TEXT,
            created_at TEXT,
            updated_at TEXT,
            team_composition TEXT,
            metadata TEXT
          )
        `);

        // Roadmap phases (high-level product phases)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS roadmap_phases (
            phase_id TEXT PRIMARY KEY,
            repository_id TEXT NOT NULL,
            phase_name TEXT,
            description TEXT,
            objective TEXT,
            start_date TEXT,
            end_date TEXT,
            status TEXT DEFAULT 'not_started',
            completion_percentage INTEGER DEFAULT 0,
            deliverables TEXT,
            success_metrics TEXT,
            phase_order INTEGER,
            FOREIGN KEY (repository_id) REFERENCES repositories (claude_project_id)
          )
        `);

        // Sprints (each contains a full 7-phase PDL cycle)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sprints (
            sprint_id TEXT PRIMARY KEY,
            repository_id TEXT NOT NULL,
            roadmap_phase_id TEXT,
            sprint_name TEXT,
            sprint_number INTEGER,
            start_date TEXT,
            end_date TEXT,
            status TEXT DEFAULT 'planning',
            current_pdl_phase INTEGER DEFAULT 1,
            velocity INTEGER DEFAULT 0,
            burn_down TEXT,
            retrospective TEXT,
            FOREIGN KEY (repository_id) REFERENCES repositories (claude_project_id),
            FOREIGN KEY (roadmap_phase_id) REFERENCES roadmap_phases (phase_id)
          )
        `);

        // PDL phases within sprints (7 per sprint)
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sprint_pdl_phases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sprint_id TEXT NOT NULL,
            pdl_phase_number INTEGER CHECK(pdl_phase_number >= 1 AND pdl_phase_number <= 7),
            pdl_phase_name TEXT,
            status TEXT DEFAULT 'not_started',
            completion_percentage INTEGER DEFAULT 0,
            start_date TEXT,
            end_date TEXT,
            primary_driver TEXT,
            deliverables TEXT,
            blockers TEXT,
            notes TEXT,
            FOREIGN KEY (sprint_id) REFERENCES sprints (sprint_id),
            UNIQUE(sprint_id, pdl_phase_number)
          )
        `);

        // Tasks within PDL phases
        this.db.run(`
          CREATE TABLE IF NOT EXISTS tasks (
            task_id TEXT PRIMARY KEY,
            sprint_id TEXT NOT NULL,
            pdl_phase_number INTEGER,
            task_description TEXT,
            assignee TEXT,
            status TEXT DEFAULT 'todo',
            story_points INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT,
            metadata TEXT,
            FOREIGN KEY (sprint_id) REFERENCES sprints (sprint_id)
          )
        `);

        // Sub-projects (what agents call "projects")
        this.db.run(`
          CREATE TABLE IF NOT EXISTS subprojects (
            subproject_id TEXT PRIMARY KEY,
            repository_id TEXT NOT NULL,
            subproject_name TEXT,
            description TEXT,
            related_sprint_id TEXT,
            created_by TEXT,
            created_at TEXT,
            metadata TEXT,
            FOREIGN KEY (repository_id) REFERENCES repositories (claude_project_id),
            FOREIGN KEY (related_sprint_id) REFERENCES sprints (sprint_id)
          )
        `);

        // Activity log
        this.db.run(`
          CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repository_id TEXT NOT NULL,
            timestamp TEXT,
            actor TEXT,
            action TEXT,
            entity_type TEXT,
            entity_id TEXT,
            details TEXT,
            FOREIGN KEY (repository_id) REFERENCES repositories (claude_project_id)
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  // ==================== REPOSITORY OPERATIONS ====================

  async initializeRepository(
    description?: string,
    teamComposition?: any
  ): Promise<any> {
    if (!this.currentRepositoryId) {
      throw new Error('Could not detect repository ID');
    }

    const now = new Date().toISOString();
    const repoPath = process.cwd();

    return new Promise((resolve, reject) => {
      // Check if repository already exists
      this.db.get(
        "SELECT * FROM repositories WHERE claude_project_id = ?",
        [this.currentRepositoryId],
        (err, existing) => {
          if (existing) {
            resolve({
              success: true,
              repository_id: this.currentRepositoryId,
              message: 'Repository already initialized',
              existing: true
            });
            return;
          }

          // Create new repository entry
          this.db.run(
            `INSERT INTO repositories (
              claude_project_id, repository_path, description, 
              created_at, updated_at, team_composition
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              this.currentRepositoryId,
              repoPath,
              description || '',
              now,
              now,
              JSON.stringify(teamComposition || {})
            ],
            (err) => {
              if (err) reject(err);
              else {
                // Initialize 7 PDL phases structure info
                this.logActivity('repository_initialized', 'repository', this.currentRepositoryId!, {
                  description,
                  team_composition: teamComposition
                });

                resolve({
                  success: true,
                  repository_id: this.currentRepositoryId,
                  repository_path: repoPath,
                  message: 'Repository initialized successfully'
                });
              }
            }
          );
        }
      );
    });
  }

  async getCurrentRepository(): Promise<any> {
    if (!this.currentRepositoryId) {
      return null;
    }

    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM repositories WHERE claude_project_id = ?`,
        [this.currentRepositoryId],
        (err, row: any) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else {
            resolve({
              ...row,
              team_composition: row.team_composition ? JSON.parse(row.team_composition) : {},
              metadata: row.metadata ? JSON.parse(row.metadata) : {}
            });
          }
        }
      );
    });
  }

  async listRepositories(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM repositories ORDER BY updated_at DESC",
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // ==================== ROADMAP OPERATIONS ====================

  async createRoadmap(
    vision: string,
    phases: Array<{
      name: string;
      description: string;
      objective: string;
      deliverables?: string[];
      success_metrics?: string[];
    }>
  ): Promise<any> {
    if (!this.currentRepositoryId) {
      throw new Error('Repository not initialized');
    }

    const roadmapPhases: any[] = [];

    // Create roadmap phases
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const phaseId = `phase_${Date.now()}_${i}`;
      
      await new Promise((resolve, reject) => {
        this.db.run(
          `INSERT INTO roadmap_phases (
            phase_id, repository_id, phase_name, description, 
            objective, deliverables, success_metrics, phase_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            phaseId,
            this.currentRepositoryId,
            phase.name,
            phase.description,
            phase.objective,
            JSON.stringify(phase.deliverables || []),
            JSON.stringify(phase.success_metrics || []),
            i + 1
          ],
          (err) => {
            if (err) reject(err);
            else {
              roadmapPhases.push({ phase_id: phaseId, ...phase });
              resolve(true);
            }
          }
        );
      });
    }

    // Update repository with vision
    await new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE repositories SET vision = ?, updated_at = ? WHERE claude_project_id = ?",
        [vision, new Date().toISOString(), this.currentRepositoryId],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });

    this.logActivity('roadmap_created', 'roadmap', this.currentRepositoryId, {
      vision,
      phase_count: phases.length
    });

    return {
      success: true,
      repository_id: this.currentRepositoryId,
      vision,
      phases: roadmapPhases,
      message: `Roadmap created with ${phases.length} phases`
    };
  }

  // ==================== SPRINT OPERATIONS ====================

  async createSprint(
    roadmapPhaseId: string,
    sprintName: string,
    duration: number = 14
  ): Promise<any> {
    if (!this.currentRepositoryId) {
      throw new Error('Repository not initialized');
    }

    const sprintId = `sprint_${Date.now()}`;
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration);

    // Get sprint number for this phase
    const sprintNumber = await this.getNextSprintNumber(roadmapPhaseId);

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO sprints (
          sprint_id, repository_id, roadmap_phase_id, sprint_name,
          sprint_number, start_date, end_date, status, current_pdl_phase
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sprintId,
          this.currentRepositoryId,
          roadmapPhaseId,
          sprintName,
          sprintNumber,
          startDate.toISOString(),
          endDate.toISOString(),
          'planning',
          1
        ],
        async (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Create 7 PDL phases for this sprint
          await this.initializeSprintPDLPhases(sprintId);

          this.logActivity('sprint_created', 'sprint', sprintId, {
            sprint_name: sprintName,
            duration,
            roadmap_phase_id: roadmapPhaseId
          });

          resolve({
            success: true,
            sprint_id: sprintId,
            sprint_name: sprintName,
            sprint_number: sprintNumber,
            message: `Sprint "${sprintName}" created with 7 PDL phases`
          });
        }
      );
    });
  }

  private async initializeSprintPDLPhases(sprintId: string): Promise<void> {
    const pdlPhases = [
      { num: 1, name: 'Discovery & Ideation', driver: 'Product Manager' },
      { num: 2, name: 'Definition & Scoping', driver: 'Product Manager' },
      { num: 3, name: 'Design & Prototyping', driver: 'Product Designer' },
      { num: 4, name: 'Development & Implementation', driver: 'Engineering Manager' },
      { num: 5, name: 'Testing & Quality Assurance', driver: 'QA Engineer' },
      { num: 6, name: 'Launch & Deployment', driver: 'Engineering Manager' },
      { num: 7, name: 'Post-Launch: Growth & Iteration', driver: 'Product Manager' }
    ];

    for (const phase of pdlPhases) {
      await new Promise((resolve, reject) => {
        this.db.run(
          `INSERT INTO sprint_pdl_phases (
            sprint_id, pdl_phase_number, pdl_phase_name, 
            status, primary_driver
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            sprintId,
            phase.num,
            phase.name,
            phase.num === 1 ? 'in_progress' : 'not_started',
            phase.driver
          ],
          (err) => {
            if (err) reject(err);
            else resolve(true);
          }
        );
      });
    }
  }

  async updateSprintPDL(
    sprintId: string,
    pdlPhaseNumber: number,
    updates: {
      status?: string;
      completion_percentage?: number;
      deliverables?: string[];
      blockers?: string[];
      notes?: string;
    }
  ): Promise<any> {
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

    values.push(sprintId, pdlPhaseNumber);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE sprint_pdl_phases SET ${setClause.join(', ')} 
         WHERE sprint_id = ? AND pdl_phase_number = ?`,
        values,
        (err) => {
          if (err) reject(err);
          else {
            // Update current PDL phase in sprint if completed
            if (updates.status === 'completed' && pdlPhaseNumber < 7) {
              this.db.run(
                "UPDATE sprints SET current_pdl_phase = ? WHERE sprint_id = ?",
                [pdlPhaseNumber + 1, sprintId]
              );
            }

            this.logActivity('pdl_phase_updated', 'pdl_phase', `${sprintId}_${pdlPhaseNumber}`, updates);

            resolve({
              success: true,
              sprint_id: sprintId,
              pdl_phase: pdlPhaseNumber,
              updates,
              message: `PDL Phase ${pdlPhaseNumber} updated`
            });
          }
        }
      );
    });
  }

  // ==================== TASK OPERATIONS ====================

  async createTask(
    sprintId: string,
    pdlPhaseNumber: number,
    taskDescription: string,
    assignee?: string,
    storyPoints?: number
  ): Promise<any> {
    const taskId = `TASK_${Date.now()}`;
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO tasks (
          task_id, sprint_id, pdl_phase_number, task_description,
          assignee, story_points, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          sprintId,
          pdlPhaseNumber,
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
            this.logActivity('task_created', 'task', taskId, {
              sprint_id: sprintId,
              pdl_phase: pdlPhaseNumber,
              description: taskDescription,
              assignee
            });

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

  async updateTaskStatus(
    taskId: string,
    status: 'todo' | 'in_progress' | 'done' | 'blocked'
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE tasks SET status = ?, updated_at = ? WHERE task_id = ?",
        [status, new Date().toISOString(), taskId],
        (err) => {
          if (err) reject(err);
          else {
            this.logActivity('task_updated', 'task', taskId, { status });
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

  // ==================== SUB-PROJECT OPERATIONS ====================

  async createSubproject(
    name: string,
    description: string,
    relatedSprintId?: string,
    createdBy?: string
  ): Promise<any> {
    if (!this.currentRepositoryId) {
      throw new Error('Repository not initialized');
    }

    const subprojectId = `subproj_${Date.now()}`;
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO subprojects (
          subproject_id, repository_id, subproject_name, description,
          related_sprint_id, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          subprojectId,
          this.currentRepositoryId,
          name,
          description,
          relatedSprintId || null,
          createdBy || 'unknown',
          now
        ],
        (err) => {
          if (err) reject(err);
          else {
            this.logActivity('subproject_created', 'subproject', subprojectId, {
              name,
              description,
              created_by: createdBy
            });

            resolve({
              success: true,
              subproject_id: subprojectId,
              subproject_name: name,
              message: `Sub-project "${name}" created`
            });
          }
        }
      );
    });
  }

  // ==================== QUERY OPERATIONS ====================

  async getCurrentStatus(): Promise<any> {
    if (!this.currentRepositoryId) {
      throw new Error('Repository not initialized');
    }

    const repo = await this.getCurrentRepository();
    const phases = await this.getRoadmapPhases();
    const activeSprint = await this.getActiveSprint();

    return {
      repository: repo,
      roadmap_phases: phases,
      active_sprint: activeSprint,
      current_pdl_phase: activeSprint?.current_pdl_phase || null
    };
  }

  private async getRoadmapPhases(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM roadmap_phases 
         WHERE repository_id = ? 
         ORDER BY phase_order`,
        [this.currentRepositoryId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  private async getActiveSprint(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM sprints 
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

  private async getNextSprintNumber(roadmapPhaseId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT MAX(sprint_number) as max_num FROM sprints 
         WHERE roadmap_phase_id = ?`,
        [roadmapPhaseId],
        (err, row: any) => {
          if (err) reject(err);
          else resolve((row?.max_num || 0) + 1);
        }
      );
    });
  }

  // ==================== UTILITY OPERATIONS ====================

  private async logActivity(
    action: string,
    entityType: string,
    entityId: string,
    details: any
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    
    this.db.run(
      `INSERT INTO activity_log (
        repository_id, timestamp, actor, action, 
        entity_type, entity_id, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        this.currentRepositoryId,
        timestamp,
        'system',
        action,
        entityType,
        entityId,
        JSON.stringify(details)
      ]
    );
  }

  getCurrentRepositoryId(): string | null {
    return this.currentRepositoryId;
  }

  close(): void {
    this.db.close();
  }
}