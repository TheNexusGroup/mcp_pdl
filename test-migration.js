#!/usr/bin/env node

/**
 * Migration Test Script
 * 
 * This script tests the database migration functionality to ensure:
 * 1. Existing data is properly migrated from local to centralized database
 * 2. Data integrity is maintained during migration
 * 3. Local databases are safely cleaned up after migration
 * 4. Backward compatibility is preserved
 */

import { DatabaseFactory } from './dist/storage/database-factory.js';
import { CentralizedDatabase } from './dist/storage/centralized-database.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import sqlite3 from 'sqlite3';

const TEST_RESULTS = [];

function logTest(testName, status, details = '') {
  const result = { testName, status, details, timestamp: new Date().toISOString() };
  TEST_RESULTS.push(result);
  console.log(`[${status}] ${testName}${details ? ': ' + details : ''}`);
}

async function setupTestEnvironment() {
  console.log('\n=== Setting up test environment ===');
  
  // Create test data directory with sample data
  const testDataDir = path.join(process.cwd(), 'test-migration-data');
  const testDbPath = path.join(testDataDir, 'pdl.sqlite');
  
  try {
    await fs.mkdir(testDataDir, { recursive: true });
    
    // Create a test database with sample data
    const testDb = new sqlite3.Database(testDbPath);
    
    await new Promise((resolve, reject) => {
      testDb.serialize(() => {
        testDb.run(`
          CREATE TABLE IF NOT EXISTS projects (
            project_name TEXT PRIMARY KEY,
            description TEXT,
            created_at TEXT,
            updated_at TEXT,
            team_composition TEXT,
            roadmap TEXT
          )
        `);
        
        testDb.run(`
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
        
        // Insert test project
        testDb.run(`
          INSERT INTO projects 
          (project_name, description, created_at, updated_at, team_composition, roadmap)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          'test-migration-project',
          'A test project for migration validation',
          '2025-01-01T00:00:00.000Z',
          '2025-01-02T00:00:00.000Z',
          JSON.stringify({ product_manager: 'Test PM', engineers: ['Test Engineer'] }),
          JSON.stringify({ vision: 'Test roadmap' })
        ]);
        
        // Insert test phases
        for (let i = 1; i <= 3; i++) {
          testDb.run(`
            INSERT INTO phases 
            (project_name, phase_number, phase_name, status, completion_percentage, notes)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            'test-migration-project',
            i,
            `Phase ${i}`,
            i === 1 ? 'completed' : 'not_started',
            i === 1 ? 100 : 0,
            `Test phase ${i} notes`
          ]);
        }
        
        testDb.close(() => {
          logTest('Setup test database', 'PASS', `Created ${testDbPath}`);
          resolve();
        });
      });
    });
    
    // Change working directory to test location
    process.chdir(testDataDir);
    logTest('Setup test environment', 'PASS', `Changed to ${testDataDir}`);
    
  } catch (error) {
    logTest('Setup test environment', 'FAIL', error.message);
    throw error;
  }
}

async function testMigrationDetection() {
  console.log('\n=== Testing migration detection ===');
  
  try {
    // Test database type detection
    const dbType = await DatabaseFactory.getDatabaseType();
    logTest('Database type detection', 'PASS', `Detected: ${dbType}`);
    
    // Force migration mode for testing
    process.env.PDL_USE_CENTRALIZED = 'true';
    
    const forcedType = await DatabaseFactory.getDatabaseType();
    logTest('Forced centralized mode', 'PASS', `Forced: ${forcedType}`);
    
  } catch (error) {
    logTest('Migration detection', 'FAIL', error.message);
    throw error;
  }
}

async function testDataMigration() {
  console.log('\n=== Testing data migration ===');
  
  try {
    // Reset database factory to force re-initialization
    DatabaseFactory.reset();
    
    // Create centralized database (should trigger migration)
    const centralizedDb = new CentralizedDatabase();
    await centralizedDb.performAutoMigration();
    
    logTest('Migration execution', 'PASS', 'Migration completed without errors');
    
    // Verify migrated data
    const migratedProject = await centralizedDb.getProject('test-migration-project');
    
    if (!migratedProject) {
      throw new Error('Project not found after migration');
    }
    
    if (migratedProject.description !== 'A test project for migration validation') {
      throw new Error('Project description mismatch after migration');
    }
    
    if (!migratedProject.phases || migratedProject.phases.length !== 3) {
      throw new Error('Phases not properly migrated');
    }
    
    logTest('Data integrity validation', 'PASS', 'All data migrated correctly');
    
    centralizedDb.close();
    
  } catch (error) {
    logTest('Data migration', 'FAIL', error.message);
    throw error;
  }
}

async function testCleanup() {
  console.log('\n=== Testing cleanup process ===');
  
  try {
    const localDbPath = path.join(process.cwd(), 'pdl.sqlite');
    const migrationMarkerPath = path.join(process.cwd(), '.pdl-migrated');
    
    // Check if local database was removed
    try {
      await fs.access(localDbPath);
      logTest('Local database cleanup', 'FAIL', 'Local database still exists');
    } catch {
      logTest('Local database cleanup', 'PASS', 'Local database properly removed');
    }
    
    // Check if migration marker was created
    try {
      const markerContent = await fs.readFile(migrationMarkerPath, 'utf8');
      const marker = JSON.parse(markerContent);
      if (marker.migrated_at && marker.migrated_to) {
        logTest('Migration marker', 'PASS', 'Migration marker created correctly');
      } else {
        logTest('Migration marker', 'FAIL', 'Migration marker incomplete');
      }
    } catch (error) {
      logTest('Migration marker', 'FAIL', 'Migration marker not found');
    }
    
  } catch (error) {
    logTest('Cleanup validation', 'FAIL', error.message);
    throw error;
  }
}

async function testBackwardCompatibility() {
  console.log('\n=== Testing backward compatibility ===');
  
  try {
    // Reset environment to test fallback behavior
    delete process.env.PDL_USE_CENTRALIZED;
    DatabaseFactory.reset();
    
    // Should now use centralized database due to migration marker
    const db = await DatabaseFactory.createDatabase();
    const dbType = await DatabaseFactory.getDatabaseType();
    
    if (dbType !== 'centralized') {
      throw new Error('Should use centralized database after migration');
    }
    
    // Verify data is still accessible
    const project = await db.getProject('test-migration-project');
    if (!project) {
      throw new Error('Data not accessible after migration');
    }
    
    logTest('Backward compatibility', 'PASS', 'Data accessible in centralized mode');
    
    db.close();
    
  } catch (error) {
    logTest('Backward compatibility', 'FAIL', error.message);
    throw error;
  }
}

async function testCentralizedDatabaseLocation() {
  console.log('\n=== Testing centralized database location ===');
  
  try {
    const claudeDataDir = path.join(os.homedir(), '.claude', 'data');
    const centralDbPath = path.join(claudeDataDir, 'pdl.sqlite');
    
    // Check if centralized database was created
    const stats = await fs.stat(centralDbPath);
    if (stats.size > 0) {
      logTest('Centralized database location', 'PASS', `Created at ${centralDbPath}`);
    } else {
      logTest('Centralized database location', 'FAIL', 'Database file is empty');
    }
    
  } catch (error) {
    logTest('Centralized database location', 'FAIL', error.message);
  }
}

async function cleanupTestEnvironment() {
  console.log('\n=== Cleaning up test environment ===');
  
  try {
    // Go back to original directory
    process.chdir(path.join(process.cwd(), '..', '..'));
    
    // Remove test directory
    const testDataDir = path.join(process.cwd(), 'test-migration-data');
    await fs.rm(testDataDir, { recursive: true, force: true });
    
    logTest('Test cleanup', 'PASS', 'Test environment cleaned up');
    
  } catch (error) {
    logTest('Test cleanup', 'FAIL', error.message);
  }
}

async function printTestSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('MIGRATION TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = TEST_RESULTS.filter(r => r.status === 'PASS').length;
  const failed = TEST_RESULTS.filter(r => r.status === 'FAIL').length;
  const total = TEST_RESULTS.length;
  
  console.log(`Total tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\nFAILED TESTS:');
    TEST_RESULTS.filter(r => r.status === 'FAIL').forEach(test => {
      console.log(`  - ${test.testName}: ${test.details}`);
    });
  }
  
  return failed === 0;
}

async function main() {
  console.log('Starting MCP PDL Database Migration Tests');
  console.log('========================================');
  
  try {
    await setupTestEnvironment();
    await testMigrationDetection();
    await testDataMigration();
    await testCleanup();
    await testBackwardCompatibility();
    await testCentralizedDatabaseLocation();
    
  } catch (error) {
    console.error('\nTest execution failed:', error.message);
  } finally {
    await cleanupTestEnvironment();
  }
  
  const success = await printTestSummary();
  process.exit(success ? 0 : 1);
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}