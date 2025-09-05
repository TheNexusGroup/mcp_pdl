import { Database } from './database.js';
import { CentralizedDatabase } from './centralized-database.js';
import { DatabaseAdapter } from './database-adapter.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export { DatabaseAdapter };

/**
 * Database factory that provides backward compatibility
 * Automatically detects and migrates from local to centralized storage
 */
export class DatabaseFactory {
  private static instance: DatabaseAdapter | null = null;
  
  /**
   * Creates or returns the database instance
   * Handles automatic migration from local to centralized storage
   */
  static async createDatabase(): Promise<DatabaseAdapter> {
    if (DatabaseFactory.instance) {
      return DatabaseFactory.instance;
    }

    try {
      // Check if centralized database should be used
      const shouldUseCentralized = await DatabaseFactory.shouldUseCentralizedDatabase();
      
      if (shouldUseCentralized) {
        console.log('Using centralized database at ~/.claude/data/pdl.sqlite');
        const centralizedDb = new CentralizedDatabase();
        
        // Perform automatic migration
        await centralizedDb.performAutoMigration();
        
        DatabaseFactory.instance = new DatabaseAdapter(centralizedDb);
        return DatabaseFactory.instance;
      } else {
        // Use legacy local database for backward compatibility
        console.log('Using legacy local database (backward compatibility mode)');
        const localDb = new Database();
        DatabaseFactory.instance = new DatabaseAdapter(localDb);
        return DatabaseFactory.instance;
      }
    } catch (error) {
      console.error('Database creation failed, falling back to local database:', error);
      
      // Fallback to local database if centralized fails
      const localDb = new Database();
      DatabaseFactory.instance = new DatabaseAdapter(localDb);
      return DatabaseFactory.instance;
    }
  }

  /**
   * Determines if centralized database should be used
   * Uses heuristics to ensure gradual migration
   */
  private static async shouldUseCentralizedDatabase(): Promise<boolean> {
    try {
      const claudeDataDir = path.join(os.homedir(), '.claude', 'data');
      const centralDbPath = path.join(claudeDataDir, 'pdl.sqlite');
      
      // Strategy 1: If centralized database already exists and has data, use it
      try {
        await fs.access(centralDbPath);
        const stats = await fs.stat(centralDbPath);
        if (stats.size > 8192) { // Reasonable size threshold for non-empty database
          console.log('Centralized database exists with data, using centralized mode');
          return true;
        }
      } catch {
        // Centralized database doesn't exist yet
      }

      // Strategy 2: Check if local database has migration marker
      const localDataDir = path.join(process.cwd(), 'data');
      const migrationMarkerPath = path.join(localDataDir, '.pdl-migrated');
      
      try {
        await fs.access(migrationMarkerPath);
        console.log('Local database was already migrated, using centralized mode');
        return true;
      } catch {
        // No migration marker found
      }

      // Strategy 3: Check if multiple local databases exist (multi-instance scenario)
      const hasMultipleInstances = await DatabaseFactory.detectMultipleInstances();
      if (hasMultipleInstances) {
        console.log('Multiple instances detected, enabling centralized mode');
        return true;
      }

      // Strategy 4: Check for environment variable override
      if (process.env.PDL_USE_CENTRALIZED === 'true') {
        console.log('Centralized mode enabled via PDL_USE_CENTRALIZED environment variable');
        return true;
      }

      // Strategy 5: Gradual rollout - use centralized for new projects
      const localDbPath = path.join(process.cwd(), 'data', 'pdl.sqlite');
      try {
        await fs.access(localDbPath);
        // Local database exists, continue using it for backward compatibility
        console.log('Local database exists, using legacy mode for backward compatibility');
        return false;
      } catch {
        // No local database, safe to use centralized for new projects
        console.log('No local database found, using centralized mode for new project');
        return true;
      }

    } catch (error) {
      console.error('Error determining database mode:', error);
      return false; // Default to local for safety
    }
  }

  /**
   * Detects if multiple PDL instances are running
   */
  private static async detectMultipleInstances(): Promise<boolean> {
    try {
      // Check for multiple running Node processes with PDL
      const { spawn } = await import('child_process');
      const proc = spawn('pgrep', ['-f', 'mcp_pdl.*server.js'], { stdio: 'pipe' });
      
      return new Promise((resolve) => {
        let processCount = 0;
        let output = '';
        
        proc.stdout.on('data', (data) => {
          output += data.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            const processes = output.trim().split('\n').filter(line => line.trim());
            processCount = processes.length;
          }
          
          resolve(processCount > 1);
        });

        // Timeout after 1 second
        setTimeout(() => {
          proc.kill();
          resolve(false);
        }, 1000);
      });
    } catch (error) {
      console.error('Failed to detect multiple instances:', error);
      return false;
    }
  }

  /**
   * Forces migration to centralized database (for testing/manual migration)
   */
  static async forceMigrationToCentralized(): Promise<void> {
    process.env.PDL_USE_CENTRALIZED = 'true';
    
    if (DatabaseFactory.instance) {
      DatabaseFactory.instance.close();
      DatabaseFactory.instance = null;
    }

    const db = await DatabaseFactory.createDatabase();
    console.log('Forced migration to centralized database completed');
  }

  /**
   * Resets the database instance (for testing)
   */
  static reset(): void {
    if (DatabaseFactory.instance) {
      DatabaseFactory.instance.close();
      DatabaseFactory.instance = null;
    }
  }

  /**
   * Gets the current database type for diagnostics
   */
  static async getDatabaseType(): Promise<'local' | 'centralized'> {
    const shouldUseCentralized = await DatabaseFactory.shouldUseCentralizedDatabase();
    return shouldUseCentralized ? 'centralized' : 'local';
  }
}

/**
 * Convenience function to get database instance
 * This is the main entry point for the application
 */
export async function getDatabase(): Promise<DatabaseAdapter> {
  return DatabaseFactory.createDatabase();
}