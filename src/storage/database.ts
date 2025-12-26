import Database from 'better-sqlite3';
import path from 'path';
import * as vscode from 'vscode';
import { Request, Response, Collection, Environment } from '../types';
import { logger } from '../utils/logger';

/**
 * Request execution with response data
 */
export interface RequestExecutionRecord {
  id?: number;
  requestId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  response?: Response;
  error?: string;
}

/**
 * OpenCall Database Schema
 * Uses SQLite for local data storage
 * Database location: workspace storage or global storage
 */
export class OpenCallDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    // Use provided path or default to workspace storage
    this.dbPath = dbPath || path.join(process.cwd(), '.opencall', 'opencall.db');

    // Create database directory if it doesn't exist
    const fs = require('fs');
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Open database connection
    this.db = new Database(this.dbPath);

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Initialize schema
    this.initializeSchema();

    logger.info(`[DB] Database opened at: ${this.dbPath}`);
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    // Create requests table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        headers TEXT,
        body TEXT,
        auth TEXT,
        tests TEXT,
        collectionId TEXT,
        folderId TEXT,
        tags TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        lastSentAt TEXT
      )
    `);

    // Create collections table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        parentId TEXT,
        items TEXT,
        auth TEXT,
        variables TEXT,
        scripts TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (parentId) REFERENCES collections(id) ON DELETE CASCADE
      )
    `);

    // Create environments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS environments (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        variables TEXT NOT NULL,
        isActive INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requestId TEXT NOT NULL,
        status TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT,
        response TEXT,
        error TEXT,
        FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_requests_collectionId ON requests(collectionId);
      CREATE INDEX IF NOT EXISTS idx_requests_folderId ON requests(folderId);
      CREATE INDEX IF NOT EXISTS idx_requests_name ON requests(name);
      CREATE INDEX IF NOT EXISTS idx_collections_parentId ON collections(parentId);
      CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name);
      CREATE INDEX IF NOT EXISTS idx_environments_name ON environments(name);
      CREATE INDEX IF NOT EXISTS idx_environments_isActive ON environments(isActive);
      CREATE INDEX IF NOT EXISTS idx_history_requestId ON history(requestId);
      CREATE INDEX IF NOT EXISTS idx_history_status ON history(status);
      CREATE INDEX IF NOT EXISTS idx_history_startTime ON history(startTime);
    `);

    logger.info('[DB] Database schema initialized');
  }

  /**
   * Get the raw SQLite database instance
   * Use this for direct SQL queries
   */
  getRawDB(): Database.Database {
    return this.db;
  }

  /**
   * Get database path
   */
  getDbPath(): string {
    return this.dbPath;
  }

  /**
   * Clear all data from all tables
   */
  async clearAll(): Promise<void> {
    try {
      this.db.exec('DELETE FROM requests');
      this.db.exec('DELETE FROM collections');
      this.db.exec('DELETE FROM environments');
      this.db.exec('DELETE FROM history');
      logger.info('[DB] All data cleared');
    } catch (error) {
      logger.error('[DB] Failed to clear all data', error);
      throw error;
    }
  }

  /**
   * Export all data from the database
   */
  async exportData(): Promise<{
    requests: Request[];
    collections: Collection[];
    environments: Environment[];
    history: RequestExecutionRecord[];
  }> {
    try {
      const requests = this.db.prepare('SELECT * FROM requests').all() as any[];
      const collections = this.db.prepare('SELECT * FROM collections').all() as any[];
      const environments = this.db.prepare('SELECT * FROM environments').all() as any[];
      const history = this.db.prepare('SELECT * FROM history').all() as any[];

      return {
        requests: requests.map(deserializeRequest),
        collections: collections.map(deserializeCollection),
        environments: environments.map(deserializeEnvironment),
        history: history.map(deserializeHistory),
      };
    } catch (error) {
      logger.error('[DB] Failed to export data', error);
      throw error;
    }
  }

  /**
   * Import data into the database
   */
  async importData(data: {
    requests?: Request[];
    collections?: Collection[];
    environments?: Environment[];
    history?: RequestExecutionRecord[];
  }): Promise<void> {
    try {
      // Use transaction for atomic import
      const importStmt = this.db.transaction(() => {
        if (data.requests) {
          const insertRequest = this.db.prepare(`
            INSERT OR REPLACE INTO requests
            (id, name, description, method, url, headers, body, auth, tests,
             collectionId, folderId, tags, createdAt, updatedAt, lastSentAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const req of data.requests) {
            const serialized = serializeRequest(req);
            insertRequest.run(
              serialized.id, serialized.name, serialized.description, serialized.method,
              serialized.url, serialized.headers, serialized.body, serialized.auth,
              serialized.tests, serialized.collectionId, serialized.folderId, serialized.tags,
              serialized.createdAt, serialized.updatedAt, serialized.lastSentAt
            );
          }
        }

        if (data.collections) {
          const insertCollection = this.db.prepare(`
            INSERT OR REPLACE INTO collections
            (id, name, description, parentId, items, auth, variables, scripts, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const col of data.collections) {
            const serialized = serializeCollection(col);
            insertCollection.run(
              serialized.id, serialized.name, serialized.description, serialized.parentId,
              serialized.items, serialized.auth, serialized.variables, serialized.scripts,
              serialized.createdAt, serialized.updatedAt
            );
          }
        }

        if (data.environments) {
          const insertEnvironment = this.db.prepare(`
            INSERT OR REPLACE INTO environments
            (id, name, variables, isActive, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          for (const env of data.environments) {
            const serialized = serializeEnvironment(env);
            insertEnvironment.run(
              serialized.id, serialized.name, serialized.variables, serialized.isActive,
              serialized.createdAt, serialized.updatedAt
            );
          }
        }

        if (data.history) {
          const insertHistory = this.db.prepare(`
            INSERT OR REPLACE INTO history
            (id, requestId, status, startTime, endTime, response, error)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          for (const hist of data.history) {
            const serialized = serializeHistory(hist);
            insertHistory.run(
              serialized.id, serialized.requestId, serialized.status,
              serialized.startTime, serialized.endTime, serialized.response, serialized.error
            );
          }
        }
      });

      importStmt();
      logger.info('[DB] Data imported successfully');
    } catch (error) {
      logger.error('[DB] Failed to import data', error);
      throw error;
    }
  }

  /**
   * Get database size estimate
   */
  async getSize(): Promise<number> {
    try {
      const result = this.db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get() as { size: number };
      return result.size || 0;
    } catch (error) {
      logger.error('[DB] Failed to get database size', error);
      return 0;
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      logger.info('[DB] Database closed');
    }
  }

  /**
   * Vacuum the database to reclaim space
   */
  vacuum(): void {
    this.db.exec('VACUUM');
    logger.info('[DB] Database vacuumed');
  }

  /**
   * Backup the database to a file
   */
  backup(backupPath: string): void {
    this.db.exec(`VACUUM INTO '${backupPath}'`);
    logger.info(`[DB] Database backed up to: ${backupPath}`);
  }
}

// Global database instance
let dbInstance: OpenCallDatabase | null = null;

/**
 * Get the global database instance
 * @param dbPath Optional custom database path
 */
export function getDatabase(dbPath?: string): OpenCallDatabase {
  if (!dbInstance) {
    dbInstance = new OpenCallDatabase(dbPath);
  }
  return dbInstance;
}

/**
 * Initialize the database
 * @param dbPath Optional custom database path
 */
export async function initDatabase(dbPath?: string): Promise<void> {
  try {
    const db = getDatabase(dbPath);
    // Database is initialized in constructor
    logger.info('[DB] Database initialized successfully');
  } catch (error) {
    logger.error('[DB] Failed to initialize database', error);
    throw error;
  }
}

/**
 * Close the database
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('[DB] Database closed');
  }
}

/**
 * Delete the database (for testing/reset purposes)
 */
export async function deleteDatabase(): Promise<void> {
  try {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }

    const fs = require('fs');
    const dbPath = path.join(process.cwd(), '.opencall', 'opencall.db');

    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    logger.info('[DB] Database deleted');
  } catch (error) {
    logger.error('[DB] Failed to delete database', error);
    throw error;
  }
}

// =============================================================================
// Serialization Helpers
// Convert between complex objects and JSON strings for SQLite storage
// =============================================================================

export function serializeRequest(req: Request): any {
  return {
    ...req,
    headers: req.headers ? JSON.stringify(req.headers) : null,
    body: req.body ? JSON.stringify(req.body) : null,
    auth: req.auth ? JSON.stringify(req.auth) : null,
    tests: req.tests ? JSON.stringify(req.tests) : null,
    tags: req.tags ? JSON.stringify(req.tags) : null,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
    lastSentAt: req.lastSentAt ? req.lastSentAt.toISOString() : null,
  };
}

export function deserializeRequest(row: any): Request {
  return {
    ...row,
    headers: row.headers ? JSON.parse(row.headers) : undefined,
    body: row.body ? JSON.parse(row.body) : undefined,
    auth: row.auth ? JSON.parse(row.auth) : undefined,
    tests: row.tests ? JSON.parse(row.tests) : undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    lastSentAt: row.lastSentAt ? new Date(row.lastSentAt) : undefined,
  };
}

export function serializeCollection(col: Collection): any {
  return {
    ...col,
    items: JSON.stringify(col.items),
    auth: col.auth ? JSON.stringify(col.auth) : null,
    variables: col.variables ? JSON.stringify(col.variables) : null,
    scripts: col.scripts ? JSON.stringify(col.scripts) : null,
    createdAt: col.createdAt.toISOString(),
    updatedAt: col.updatedAt.toISOString(),
  };
}

export function deserializeCollection(row: any): Collection {
  return {
    ...row,
    items: JSON.parse(row.items),
    auth: row.auth ? JSON.parse(row.auth) : undefined,
    variables: row.variables ? JSON.parse(row.variables) : undefined,
    scripts: row.scripts ? JSON.parse(row.scripts) : undefined,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export function serializeEnvironment(env: Environment): any {
  return {
    ...env,
    variables: JSON.stringify(env.variables),
    isActive: env.isActive ? 1 : 0,
    createdAt: env.createdAt.toISOString(),
    updatedAt: env.updatedAt.toISOString(),
  };
}

export function deserializeEnvironment(row: any): Environment {
  return {
    ...row,
    variables: JSON.parse(row.variables),
    isActive: row.isActive === 1,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export function serializeHistory(hist: RequestExecutionRecord): any {
  return {
    ...hist,
    startTime: hist.startTime.toISOString(),
    endTime: hist.endTime ? hist.endTime.toISOString() : null,
    response: hist.response ? JSON.stringify(hist.response) : null,
  };
}

export function deserializeHistory(row: any): RequestExecutionRecord {
  return {
    ...row,
    startTime: new Date(row.startTime),
    endTime: row.endTime ? new Date(row.endTime) : undefined,
    response: row.response ? JSON.parse(row.response) : undefined,
  };
}
