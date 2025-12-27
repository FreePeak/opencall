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
 * VSCode-based Storage Manager
 * Uses GlobalState for data persistence instead of SQLite
 */
export class StorageManager {
  private context: vscode.ExtensionContext;
  private readonly REQUESTS_KEY = 'opencall.requests';
  private readonly COLLECTIONS_KEY = 'opencall.collections';
  private readonly ENVIRONMENTS_KEY = 'opencall.environments';
  private readonly HISTORY_KEY = 'opencall.history';

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Initialize storage with default data if empty
   */
  async initialize(): Promise<void> {
    try {
      const requests = await this.getRequests();
      const collections = await this.getCollections();
      const environments = await this.getEnvironments();

      // Create default collection if none exists
      if (collections.length === 0) {
        const defaultCollection: Collection = {
          id: 'default',
          name: 'Default Collection',
          description: 'Default collection for requests',
          parentId: undefined,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await this.saveCollection(defaultCollection);
      }

      // Create default environment if none exists
      if (environments.length === 0) {
        const defaultEnvironment: Environment = {
          id: 'default',
          name: 'Default Environment',
          variables: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await this.saveEnvironment(defaultEnvironment);
      }

      logger.info('[Storage] Storage initialized successfully');
    } catch (error) {
      logger.error('[Storage] Failed to initialize storage', error);
      throw error;
    }
  }

  // Requests
  async getRequests(): Promise<Request[]> {
    try {
      const data = this.context.globalState.get<Request[]>(this.REQUESTS_KEY, []);
      return data.map(req => ({
        ...req,
        createdAt: new Date(req.createdAt),
        updatedAt: new Date(req.updatedAt),
        lastSentAt: req.lastSentAt ? new Date(req.lastSentAt) : undefined,
      }));
    } catch (error) {
      logger.error('[Storage] Failed to get requests', error);
      return [];
    }
  }

  async saveRequest(request: Request): Promise<void> {
    try {
      const requests = await this.getRequests();
      const index = requests.findIndex(req => req.id === request.id);
      
      if (index >= 0) {
        requests[index] = request;
      } else {
        requests.push(request);
      }

      await this.context.globalState.update(this.REQUESTS_KEY, requests);
      logger.info(`[Storage] Saved request: ${request.id}`);
    } catch (error) {
      logger.error(`[Storage] Failed to save request: ${request.id}`, error);
      throw error;
    }
  }

  async deleteRequest(requestId: string): Promise<void> {
    try {
      const requests = await this.getRequests();
      const filteredRequests = requests.filter(req => req.id !== requestId);
      await this.context.globalState.update(this.REQUESTS_KEY, filteredRequests);
      logger.info(`[Storage] Deleted request: ${requestId}`);
    } catch (error) {
      logger.error(`[Storage] Failed to delete request: ${requestId}`, error);
      throw error;
    }
  }

  // Collections
  async getCollections(): Promise<Collection[]> {
    try {
      const data = this.context.globalState.get<Collection[]>(this.COLLECTIONS_KEY, []);
      return data.map(col => ({
        ...col,
        createdAt: new Date(col.createdAt),
        updatedAt: new Date(col.updatedAt),
      }));
    } catch (error) {
      logger.error('[Storage] Failed to get collections', error);
      return [];
    }
  }

  async saveCollection(collection: Collection): Promise<void> {
    try {
      const collections = await this.getCollections();
      const index = collections.findIndex(col => col.id === collection.id);
      
      if (index >= 0) {
        collections[index] = collection;
      } else {
        collections.push(collection);
      }

      await this.context.globalState.update(this.COLLECTIONS_KEY, collections);
      logger.info(`[Storage] Saved collection: ${collection.id}`);
    } catch (error) {
      logger.error(`[Storage] Failed to save collection: ${collection.id}`, error);
      throw error;
    }
  }

  async deleteCollection(collectionId: string): Promise<void> {
    try {
      const collections = await this.getCollections();
      const filteredCollections = collections.filter(col => col.id !== collectionId);
      await this.context.globalState.update(this.COLLECTIONS_KEY, filteredCollections);

      // Also remove requests in this collection
      const requests = await this.getRequests();
      const filteredRequests = requests.filter(req => req.collectionId !== collectionId);
      await this.context.globalState.update(this.REQUESTS_KEY, filteredRequests);

      logger.info(`[Storage] Deleted collection: ${collectionId}`);
    } catch (error) {
      logger.error(`[Storage] Failed to delete collection: ${collectionId}`, error);
      throw error;
    }
  }

  // Environments
  async getEnvironments(): Promise<Environment[]> {
    try {
      const data = this.context.globalState.get<Environment[]>(this.ENVIRONMENTS_KEY, []);
      return data.map(env => ({
        ...env,
        createdAt: new Date(env.createdAt),
        updatedAt: new Date(env.updatedAt),
      }));
    } catch (error) {
      logger.error('[Storage] Failed to get environments', error);
      return [];
    }
  }

  async saveEnvironment(environment: Environment): Promise<void> {
    try {
      const environments = await this.getEnvironments();
      const index = environments.findIndex(env => env.id === environment.id);
      
      if (index >= 0) {
        environments[index] = environment;
      } else {
        environments.push(environment);
      }

      // Ensure only one environment is active
      if (environment.isActive) {
        environments.forEach(env => {
          if (env.id !== environment.id) {
            env.isActive = false;
          }
        });
      }

      await this.context.globalState.update(this.ENVIRONMENTS_KEY, environments);
      logger.info(`[Storage] Saved environment: ${environment.id}`);
    } catch (error) {
      logger.error(`[Storage] Failed to save environment: ${environment.id}`, error);
      throw error;
    }
  }

  async deleteEnvironment(environmentId: string): Promise<void> {
    try {
      const environments = await this.getEnvironments();
      const filteredEnvironments = environments.filter(env => env.id !== environmentId);
      await this.context.globalState.update(this.ENVIRONMENTS_KEY, filteredEnvironments);
      logger.info(`[Storage] Deleted environment: ${environmentId}`);
    } catch (error) {
      logger.error(`[Storage] Failed to delete environment: ${environmentId}`, error);
      throw error;
    }
  }

  async getActiveEnvironment(): Promise<Environment | null> {
    try {
      const environments = await this.getEnvironments();
      return environments.find(env => env.isActive) || null;
    } catch (error) {
      logger.error('[Storage] Failed to get active environment', error);
      return null;
    }
  }

  // History
  async getHistory(): Promise<RequestExecutionRecord[]> {
    try {
      const data = this.context.globalState.get<RequestExecutionRecord[]>(this.HISTORY_KEY, []);
      return data.map(record => ({
        ...record,
        startTime: new Date(record.startTime),
        endTime: record.endTime ? new Date(record.endTime) : undefined,
      }));
    } catch (error) {
      logger.error('[Storage] Failed to get history', error);
      return [];
    }
  }

  async addHistoryRecord(record: RequestExecutionRecord): Promise<void> {
    try {
      const history = await this.getHistory();
      const newRecord = {
        ...record,
        id: Date.now(), // Simple ID generation
      };
      history.push(newRecord);

      // Keep only last 1000 records
      if (history.length > 1000) {
        history.splice(0, history.length - 1000);
      }

      await this.context.globalState.update(this.HISTORY_KEY, history);
      logger.info(`[Storage] Added history record: ${newRecord.id}`);
    } catch (error) {
      logger.error('[Storage] Failed to add history record', error);
      throw error;
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await this.context.globalState.update(this.HISTORY_KEY, []);
      logger.info('[Storage] Cleared all history');
    } catch (error) {
      logger.error('[Storage] Failed to clear history', error);
      throw error;
    }
  }

  async deleteHistoryRecord(recordId: number): Promise<void> {
    try {
      const history = await this.getHistory();
      const filteredHistory = history.filter(record => record.id !== recordId);
      await this.context.globalState.update(this.HISTORY_KEY, filteredHistory);
      logger.info(`[Storage] Deleted history record: ${recordId}`);
    } catch (error) {
      logger.error(`[Storage] Failed to delete history record: ${recordId}`, error);
      throw error;
    }
  }

  // Export/Import
  async exportData(): Promise<{
    requests: Request[];
    collections: Collection[];
    environments: Environment[];
    history: RequestExecutionRecord[];
  }> {
    try {
      const requests = await this.getRequests();
      const collections = await this.getCollections();
      const environments = await this.getEnvironments();
      const history = await this.getHistory();

      return {
        requests,
        collections,
        environments,
        history,
      };
    } catch (error) {
      logger.error('[Storage] Failed to export data', error);
      throw error;
    }
  }

  async importData(data: {
    requests?: Request[];
    collections?: Collection[];
    environments?: Environment[];
    history?: RequestExecutionRecord[];
  }): Promise<void> {
    try {
      if (data.requests) {
        await this.context.globalState.update(this.REQUESTS_KEY, data.requests);
      }

      if (data.collections) {
        await this.context.globalState.update(this.COLLECTIONS_KEY, data.collections);
      }

      if (data.environments) {
        await this.context.globalState.update(this.ENVIRONMENTS_KEY, data.environments);
      }

      if (data.history) {
        await this.context.globalState.update(this.HISTORY_KEY, data.history);
      }

      logger.info('[Storage] Data imported successfully');
    } catch (error) {
      logger.error('[Storage] Failed to import data', error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    try {
      await this.context.globalState.update(this.REQUESTS_KEY, []);
      await this.context.globalState.update(this.COLLECTIONS_KEY, []);
      await this.context.globalState.update(this.ENVIRONMENTS_KEY, []);
      await this.context.globalState.update(this.HISTORY_KEY, []);
      logger.info('[Storage] All data cleared');
    } catch (error) {
      logger.error('[Storage] Failed to clear all data', error);
      throw error;
    }
  }
}

// Global storage instance
let storageInstance: StorageManager | null = null;

/**
 * Get the global storage instance
 */
export function getStorageManager(): StorageManager {
  if (!storageInstance) {
    throw new Error('Storage manager not initialized. Call initStorageManager first.');
  }
  return storageInstance;
}

/**
 * Initialize the storage manager
 */
export async function initStorageManager(context: vscode.ExtensionContext): Promise<void> {
  try {
    storageInstance = new StorageManager(context);
    await storageInstance.initialize();
    logger.info('[Storage] Storage manager initialized successfully');
  } catch (error) {
    logger.error('[Storage] Failed to initialize storage manager', error);
    throw error;
  }
}

/**
 * Close the storage manager
 */
export function closeStorageManager(): void {
  storageInstance = null;
  logger.info('[Storage] Storage manager closed');
}
