import { Request } from '../types';
import { getDatabase } from './database';
import { logger } from '../utils/logger';

/**
 * Request Repository
 * Handles CRUD operations for API requests
 */
export class RequestRepository {
  private db = getDatabase();

  /**
   * Create a new request
   */
  async create(request: Request): Promise<Request> {
    try {
      await this.db.requests.add(request);
      logger.info(`[RequestRepo] Created request: ${request.id}`);
      return request;
    } catch (error) {
      logger.error(`[RequestRepo] Failed to create request: ${request.id}`, error);
      throw error;
    }
  }

  /**
   * Update an existing request
   */
  async update(id: string, updates: Partial<Request>): Promise<Request> {
    try {
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`Request not found: ${id}`);
      }

      const updated: Request = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date(),
      };

      await this.db.requests.put(updated);
      logger.info(`[RequestRepo] Updated request: ${id}`);
      return updated;
    } catch (error) {
      logger.error(`[RequestRepo] Failed to update request: ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete a request
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db.requests.delete(id);
      logger.info(`[RequestRepo] Deleted request: ${id}`);
    } catch (error) {
      logger.error(`[RequestRepo] Failed to delete request: ${id}`, error);
      throw error;
    }
  }

  /**
   * Get a request by ID
   */
  async getById(id: string): Promise<Request | null> {
    try {
      const request = await this.db.requests.get(id);
      return request || null;
    } catch (error) {
      logger.error(`[RequestRepo] Failed to get request: ${id}`, error);
      throw error;
    }
  }

  /**
   * Get all requests
   */
  async getAll(): Promise<Request[]> {
    try {
      const requests = await this.db.requests.toArray();
      return requests;
    } catch (error) {
      logger.error('[RequestRepo] Failed to get all requests', error);
      throw error;
    }
  }

  /**
   * Get requests by collection ID
   */
  async getByCollection(collectionId: string): Promise<Request[]> {
    try {
      const requests = await this.db.requests
        .where('collectionId')
        .equals(collectionId)
        .toArray();
      return requests;
    } catch (error) {
      logger.error(`[RequestRepo] Failed to get requests for collection: ${collectionId}`, error);
      throw error;
    }
  }

  /**
   * Get requests by folder ID
   */
  async getByFolder(folderId: string): Promise<Request[]> {
    try {
      const requests = await this.db.requests
        .where('folderId')
        .equals(folderId)
        .toArray();
      return requests;
    } catch (error) {
      logger.error(`[RequestRepo] Failed to get requests for folder: ${folderId}`, error);
      throw error;
    }
  }

  /**
   * Search requests by name
   */
  async searchByName(query: string): Promise<Request[]> {
    try {
      const allRequests = await this.getAll();
      const lowerQuery = query.toLowerCase();
      return allRequests.filter((req) =>
        req.name.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      logger.error(`[RequestRepo] Failed to search requests: ${query}`, error);
      throw error;
    }
  }

  /**
   * Get recently used requests
   */
  async getRecent(limit: number = 10): Promise<Request[]> {
    try {
      const requests = await this.db.requests
        .orderBy('lastSentAt')
        .reverse()
        .filter((req) => req.lastSentAt !== undefined)
        .limit(limit)
        .toArray();
      return requests;
    } catch (error) {
      logger.error('[RequestRepo] Failed to get recent requests', error);
      throw error;
    }
  }

  /**
   * Bulk create requests
   */
  async bulkCreate(requests: Request[]): Promise<Request[]> {
    try {
      await this.db.requests.bulkAdd(requests);
      logger.info(`[RequestRepo] Bulk created ${requests.length} requests`);
      return requests;
    } catch (error) {
      logger.error('[RequestRepo] Failed to bulk create requests', error);
      throw error;
    }
  }

  /**
   * Bulk update requests
   */
  async bulkUpdate(updates: Array<{ id: string; changes: Partial<Request> }>): Promise<void> {
    try {
      const transactions = updates.map(async ({ id, changes }) => {
        const existing = await this.getById(id);
        if (existing) {
          const updated: Request = {
            ...existing,
            ...changes,
            id,
            updatedAt: new Date(),
          };
          await this.db.requests.put(updated);
        }
      });

      await Promise.all(transactions);
      logger.info(`[RequestRepo] Bulk updated ${updates.length} requests`);
    } catch (error) {
      logger.error('[RequestRepo] Failed to bulk update requests', error);
      throw error;
    }
  }

  /**
   * Bulk delete requests
   */
  async bulkDelete(ids: string[]): Promise<void> {
    try {
      await this.db.requests.bulkDelete(ids);
      logger.info(`[RequestRepo] Bulk deleted ${ids.length} requests`);
    } catch (error) {
      logger.error('[RequestRepo] Failed to bulk delete requests', error);
      throw error;
    }
  }

  /**
   * Count total requests
   */
  async count(): Promise<number> {
    try {
      return await this.db.requests.count();
    } catch (error) {
      logger.error('[RequestRepo] Failed to count requests', error);
      throw error;
    }
  }
}

// Global request repository instance
let requestRepositoryInstance: RequestRepository | null = null;

/**
 * Get the global request repository instance
 */
export function getRequestRepository(): RequestRepository {
  if (!requestRepositoryInstance) {
    requestRepositoryInstance = new RequestRepository();
  }
  return requestRepositoryInstance;
}
