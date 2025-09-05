import sqlite3 from 'sqlite3';
import { Project, PDLPhase, Sprint, ActivityLogEntry, PDL_PHASE_NAMES, PDL_PHASE_PRIMARY_DRIVERS, PhaseStatus, Roadmap } from '../models/types.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export class Database {
  private db: sqlite3.Database;
  private projectsCache: Map<string, Project> = new Map();
  private dataDir: string;

  constructor(dbPath: string = 'data/pdl.sqlite', dataDir: string = 'data') {
    this.db = new sqlite3.Database(dbPath);
    this.dataDir = dataDir;
    this.initializeTables();
    this.loadProjectsFromDisk();
  }

  private async initializeTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS projects (
            project_name TEXT PRIMARY KEY,
            description TEXT,
            created_at TEXT,
            updated_at TEXT,
            team_composition TEXT,
            roadmap TEXT
          )
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
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async createProject(projectName: string, description?: string, teamComposition?: any): Promise<Project> {
    const now = new Date().toISOString();
    
    const project: Project = {
      project_name: projectName,
      description: description || '',
      created_at: now,
      updated_at: now,
      team_composition: teamComposition || {},
      roadmap: null as any, // Will be set by roadmap creation
      activity_log: []
    };
    
    // Save to cache and disk
    this.projectsCache.set(projectName, project);
    await this.saveProjectToDisk(project);
    
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(
          'INSERT INTO projects (project_name, description, created_at, updated_at, team_composition, roadmap) VALUES (?, ?, ?, ?, ?, ?)',
          [projectName, description || '', now, now, JSON.stringify(teamComposition || {}), null],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
          }
        );
        
        resolve(project);
      });
    });
  }

  async getProject(projectName: string): Promise<Project | null> {
    // Check cache first
    if (this.projectsCache.has(projectName)) {
      return this.projectsCache.get(projectName) || null;
    }
    
    // Load from disk if available
    try {
      const project = await this.loadProjectFromDisk(projectName);
      if (project) {
        this.projectsCache.set(projectName, project);
        return project;
      }
    } catch (error) {
      // Project not found on disk
    }
    
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM projects WHERE project_name = ?',
        [projectName],
        (err, projectRow: any) => {
          if (err) {
            reject(err);
            return;
          }
          if (!projectRow) {
            resolve(null);
            return;
          }

          // Get phases
          this.db.all(
            'SELECT * FROM phases WHERE project_name = ? ORDER BY phase_number',
            [projectName],
            (phaseErr, phaseRows: any[]) => {
              if (phaseErr) {
                reject(phaseErr);
                return;
              }

              // Get sprints
              this.db.all(
                'SELECT * FROM sprints WHERE project_name = ? ORDER BY start_date',
                [projectName],
                (sprintErr, sprintRows: any[]) => {
                  if (sprintErr) {
                    reject(sprintErr);
                    return;
                  }

                  // Get activity log
                  this.db.all(
                    'SELECT * FROM activity_log WHERE project_name = ? ORDER BY timestamp DESC',
                    [projectName],
                    (logErr, logRows: any[]) => {
                      if (logErr) {
                        reject(logErr);
                        return;
                      }

                      const project: Project = {
                        project_name: projectRow.project_name,
                        description: projectRow.description,
                        created_at: projectRow.created_at,
                        updated_at: projectRow.updated_at,
                        team_composition: JSON.parse(projectRow.team_composition || '{}'),
                        roadmap: projectRow.roadmap ? JSON.parse(projectRow.roadmap) : null,
                        activity_log: logRows.map(row => ({
                          timestamp: row.timestamp,
                          actor: row.actor,
                          action: row.action,
                          details: row.details,
                          phase_number: row.phase_number,
                          sprint_id: row.sprint_id
                        }))
                      };

                      resolve(project);
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  }

  async updateProject(projectName: string, updates: Partial<Project>): Promise<boolean> {
    const project = await this.getProject(projectName);
    if (!project) {
      return false;
    }
    
    // Update project in cache
    Object.assign(project, updates);
    project.updated_at = new Date().toISOString();
    
    // Save to disk
    await this.saveProjectToDisk(project);
    
    // Update database with roadmap if present
    if (updates.roadmap) {
      return new Promise((resolve, reject) => {
        this.db.run(
          'UPDATE projects SET roadmap = ?, updated_at = ? WHERE project_name = ?',
          [JSON.stringify(updates.roadmap), project.updated_at, projectName],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            resolve(this.changes > 0);
          }
        );
      });
    }
    
    return true;
  }
  
  async updatePhase(
    projectName: string, 
    phaseNumber: number, 
    updates: Partial<PDLPhase>
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const updateFields = [];
      const values = [];

      if (updates.status !== undefined) {
        updateFields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.completion_percentage !== undefined) {
        updateFields.push('completion_percentage = ?');
        values.push(updates.completion_percentage);
      }
      if (updates.notes !== undefined) {
        updateFields.push('notes = ?');
        values.push(updates.notes);
      }
      if (updates.start_date !== undefined) {
        updateFields.push('start_date = ?');
        values.push(updates.start_date);
      }
      if (updates.end_date !== undefined) {
        updateFields.push('end_date = ?');
        values.push(updates.end_date);
      }
      if (updates.blockers !== undefined) {
        updateFields.push('blockers = ?');
        values.push(JSON.stringify(updates.blockers));
      }

      values.push(projectName, phaseNumber);

      this.db.run(
        `UPDATE phases SET ${updateFields.join(', ')} WHERE project_name = ? AND phase_number = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes > 0);
        }
      );
    });
  }

  async createSprint(sprint: any): Promise<boolean> {
    // Legacy function - sprints are now managed within roadmap phases
    console.warn('createSprint is deprecated. Use roadmap sprint functions instead.');
    return true;
  }

  async updateSprint(sprintId: string, updates: any): Promise<boolean> {
    // Legacy function - sprints are now managed within roadmap phases
    console.warn('updateSprint is deprecated. Use roadmap sprint functions instead.');
    return true;
  }

  async logActivity(entry: ActivityLogEntry & { project_name: string }): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO activity_log (
          project_name, timestamp, actor, action, details, phase_number, sprint_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.project_name,
          entry.timestamp,
          entry.actor,
          entry.action,
          entry.details,
          entry.phase_number || null,
          entry.sprint_id || null
        ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes > 0);
        }
      );
    });
  }

  async close(): Promise<void> {
    // Save all cached projects to disk before closing
    for (const project of this.projectsCache.values()) {
      await this.saveProjectToDisk(project);
    }
    
    return new Promise((resolve) => {
      this.db.close(() => {
        resolve();
      });
    });
  }
  
  private async saveProjectToDisk(project: Project): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      const filePath = path.join(this.dataDir, `${project.project_name}.json`);
      await fs.writeFile(filePath, JSON.stringify(project, null, 2));
    } catch (error) {
      console.error(`Failed to save project ${project.project_name} to disk:`, error);
    }
  }
  
  private async loadProjectFromDisk(projectName: string): Promise<Project | null> {
    try {
      const filePath = path.join(this.dataDir, `${projectName}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }
  
  private async loadProjectsFromDisk(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      const files = await fs.readdir(this.dataDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of jsonFiles) {
        const projectName = file.replace('.json', '');
        const project = await this.loadProjectFromDisk(projectName);
        if (project) {
          this.projectsCache.set(projectName, project);
        }
      }
    } catch (error) {
      console.error('Failed to load projects from disk:', error);
    }
  }
}