import Dexie, { Table } from 'dexie';
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
 * Uses Dexie (IndexedDB wrapper) for local data storage
 */
export class OpenCallDatabase extends Dexie {
  // Tables
  requests!: Table<Request>;
  collections!: Table<Collection>;
  environments!: Table<Environment>;
  history!: Table<RequestExecutionRecord>;

  constructor() {
    super('OpenCallDB');

    // Define database schema
    this.version(1).stores({
      requests: 'id, collectionId, folderId, name, createdAt, updatedAt, lastSentAt',
      collections: 'id, parentId, name, createdAt, updatedAt',
      environments: 'id, &name, isActive, createdAt, updatedAt',
      history: '++id, requestId, status, startTime, endTime',
    });

    this.hooks();
  }

  /**
   * Database hooks for logging and error handling
   */
  private hooks(): void {
    // Log created records
    this.requests.hook('creating', (primKey, obj) => {
      logger.debug(`[DB] Creating request: ${obj.id}`);
    });

    this.collections.hook('creating', (primKey, obj) => {
      logger.debug(`[DB] Creating collection: ${obj.id}`);
    });

    this.environments.hook('creating', (primKey, obj) => {
      logger.debug(`[DB] Creating environment: ${obj.id}`);
    });

    this.history.hook('creating', (primKey, obj) => {
      logger.debug(`[DB] Creating history record: ${obj.requestId}`);
    });
  }

  /**
   * Clear all data from all tables
   */
  async clearAll(): Promise<void> {
    try {
      await this.transaction('rw', [this.requests, this.collections, this.environments, this.history], async () => {
        await this.requests.clear();
        await this.collections.clear();
        await this.environments.clear();
        await this.history.clear();
      });
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
      const [requests, collections, environments, history] = await Promise.all([
        this.requests.toArray(),
        this.collections.toArray(),
        this.environments.toArray(),
        this.history.toArray(),
      ]);

      return { requests, collections, environments, history };
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
      await this.transaction('rw', [this.requests, this.collections, this.environments, this.history], async () => {
        if (data.requests) {
          await this.requests.bulkPut(data.requests);
        }
        if (data.collections) {
          await this.collections.bulkPut(data.collections);
        }
        if (data.environments) {
          await this.environments.bulkPut(data.environments);
        }
        if (data.history) {
          await this.history.bulkPut(data.history);
        }
      });

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
      // IndexedDB doesn't provide direct size access
      // This is a rough estimate based on record counts
      const [requestCount, collectionCount, environmentCount, historyCount] = await Promise.all([
        this.requests.count(),
        this.collections.count(),
        this.environments.count(),
        this.history.count(),
      ]);

      // Rough estimate: ~1KB per record average
      return (requestCount + collectionCount + environmentCount + historyCount) * 1024;
    } catch (error) {
      logger.error('[DB] Failed to estimate size', error);
      return 0;
    }
  }
}

// Global database instance
let dbInstance: OpenCallDatabase | null = null;

/**
 * Get the global database instance
 */
export function getDatabase(): OpenCallDatabase {
  if (!dbInstance) {
    dbInstance = new OpenCallDatabase();
    logger.info('[DB] Database instance created');
  }
  return dbInstance;
}

/**
 * Initialize the database
 */
export async function initDatabase(): Promise<void> {
  try {
    const db = getDatabase();
    await db.open();
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
    await dbInstance.close();
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
      await dbInstance.close();
      dbInstance = null;
    }
    await Dexie.delete('OpenCallDB');
    logger.info('[DB] Database deleted');
  } catch (error) {
    logger.error('[DB] Failed to delete database', error);
    throw error;
  }
}
