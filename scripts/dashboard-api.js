#!/usr/bin/env node

/**
 * Simple API server for PDL Dashboard
 * Serves PDL data from the centralized SQLite database
 */

import http from 'http';
import sqlite3 from 'sqlite3';
import path from 'path';
import os from 'os';

const PORT = process.env.PDL_API_PORT || 3001;
const DB_PATH = path.join(os.homedir(), '.claude', 'data', 'pdl.db');

class PDLDashboardAPI {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH);
    }

    async getAllProjects() {
        return new Promise((resolve, reject) => {
            const projects = new Map();
            
            // Get all projects with their basic info
            this.db.all(`
                SELECT DISTINCT 
                    p.project_name,
                    p.project_id,
                    p.description,
                    p.created_at,
                    p.updated_at
                FROM projects p
                ORDER BY p.updated_at DESC
            `, [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Initialize projects
                rows.forEach(row => {
                    projects.set(row.project_name, {
                        ...row,
                        current_phase: 1,
                        phases: [],
                        sprints: []
                    });
                });
                
                // Get phases for each project
                this.db.all(`
                    SELECT 
                        ph.project_name,
                        ph.phase_number,
                        ph.phase_name,
                        ph.status,
                        ph.completion_percentage,
                        ph.start_date,
                        ph.end_date,
                        ph.notes
                    FROM phases ph
                    WHERE ph.project_name IN (${rows.map(() => '?').join(',')})
                    ORDER BY ph.project_name, ph.phase_number
                `, rows.map(r => r.project_name), (err, phaseRows) => {
                    if (err) {
                        console.warn('Failed to load phases:', err.message);
                    } else {
                        phaseRows.forEach(phase => {
                            const project = projects.get(phase.project_name);
                            if (project) {
                                project.phases.push({
                                    number: phase.phase_number,
                                    name: phase.phase_name || `Phase ${phase.phase_number}`,
                                    status: phase.status || 'not_started',
                                    completion_percentage: phase.completion_percentage || 0,
                                    start_date: phase.start_date,
                                    end_date: phase.end_date,
                                    notes: phase.notes
                                });
                                
                                if (phase.status === 'in_progress') {
                                    project.current_phase = phase.phase_number;
                                }
                            }
                        });
                    }
                    
                    // Get sprints for each project
                    this.db.all(`
                        SELECT 
                            s.project_name,
                            s.sprint_id,
                            s.sprint_name,
                            s.phase_number,
                            s.status,
                            s.start_date,
                            s.end_date,
                            s.velocity,
                            s.retrospective
                        FROM sprints s
                        WHERE s.project_name IN (${rows.map(() => '?').join(',')})
                        ORDER BY s.project_name, s.start_date DESC
                    `, rows.map(r => r.project_name), (err, sprintRows) => {
                        if (err) {
                            console.warn('Failed to load sprints:', err.message);
                        } else {
                            const sprintTasksMap = new Map();
                            
                            // Get tasks for sprints
                            this.db.all(`
                                SELECT 
                                    t.sprint_id,
                                    t.task_id,
                                    t.description,
                                    t.assignee,
                                    t.status,
                                    t.story_points
                                FROM sprint_tasks t
                                WHERE t.sprint_id IN (${sprintRows.map(() => '?').join(',')})
                                ORDER BY t.created_at
                            `, sprintRows.map(s => s.sprint_id), (err, taskRows) => {
                                if (err) {
                                    console.warn('Failed to load tasks:', err.message);
                                } else {
                                    // Group tasks by sprint
                                    taskRows.forEach(task => {
                                        if (!sprintTasksMap.has(task.sprint_id)) {
                                            sprintTasksMap.set(task.sprint_id, []);
                                        }
                                        sprintTasksMap.get(task.sprint_id).push({
                                            task_id: task.task_id,
                                            description: task.description,
                                            assignee: task.assignee,
                                            status: task.status || 'todo',
                                            story_points: task.story_points
                                        });
                                    });
                                }
                                
                                // Add sprints to projects
                                sprintRows.forEach(sprint => {
                                    const project = projects.get(sprint.project_name);
                                    if (project) {
                                        project.sprints.push({
                                            sprint_id: sprint.sprint_id,
                                            sprint_name: sprint.sprint_name,
                                            phase_number: sprint.phase_number,
                                            status: sprint.status || 'planning',
                                            start_date: sprint.start_date,
                                            end_date: sprint.end_date,
                                            velocity: sprint.velocity,
                                            retrospective: sprint.retrospective,
                                            tasks: sprintTasksMap.get(sprint.sprint_id) || [],
                                            tasksCollapsed: false
                                        });
                                    }
                                });
                                
                                // Ensure all projects have 7 phases
                                projects.forEach(project => {
                                    if (project.phases.length === 0) {
                                        const phaseNames = [
                                            "Discovery & Ideation",
                                            "Definition & Scoping", 
                                            "Design & Prototyping",
                                            "Development & Implementation",
                                            "Testing & QA",
                                            "Launch & Deployment",
                                            "Post-Launch & Growth"
                                        ];
                                        
                                        project.phases = phaseNames.map((name, i) => ({
                                            number: i + 1,
                                            name: name,
                                            status: 'not_started',
                                            completion_percentage: 0
                                        }));
                                    }
                                });
                                
                                resolve(Array.from(projects.values()));
                            });
                        }
                    });
                });
            });
        });
    }

    createServer() {
        const server = http.createServer(async (req, res) => {
            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            const url = new URL(req.url, `http://localhost:${PORT}`);

            try {
                if (url.pathname === '/api/pdl/projects' || url.pathname === '/pdl' || url.pathname === '/') {
                    const projects = await this.getAllProjects();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(projects, null, 2));
                } else if (url.pathname === '/health') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Not Found');
                }
            } catch (error) {
                console.error('API Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });

        return server;
    }

    start() {
        const server = this.createServer();
        
        server.listen(PORT, 'localhost', () => {
            console.log(`PDL Dashboard API server started on http://localhost:${PORT}`);
            console.log(`Serving data from: ${DB_PATH}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });
        
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.log(`Port ${PORT} is already in use`);
            } else {
                console.error('Server error:', error);
            }
        });

        return server;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const api = new PDLDashboardAPI();
    api.start();
}

export default PDLDashboardAPI;