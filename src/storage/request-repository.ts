/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request } from '../types';
import { getDatabase, serializeRequest, deserializeRequest } from './database';
import { logger } from '../utils/logger';

/**
 * Request Repository
 * Handles CRUD operations for API requests using SQLite
 */
export class RequestRepository {
  /**
   * Create a new request
   */
  async create(request: Request): Promise<Request> {
    try {
      const db = getDatabase().getRawDB();
      const serialized = serializeRequest(request);

      const stmt = db.prepare(`
        INSERT INTO requests
        (id, name, description, method, url, headers, body, auth, tests,
         collectionId, folderId, tags, createdAt, updatedAt, lastSentAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        serialized.id, serialized.name, serialized.description, serialized.method,
        serialized.url, serialized.headers, serialized.body, serialized.auth,
        serialized.tests, serialized.collectionId, serialized.folderId, serialized.tags,
        serialized.createdAt, serialized.updatedAt, serialized.lastSentAt
      );

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

      await this.create(updated); // UPSERT
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
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('DELETE FROM requests WHERE id = ?');
      stmt.run(id);
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
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM requests WHERE id = ?');
      const row = stmt.get(id) as any;

      return row ? deserializeRequest(row) : null;
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
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM requests');
      const rows = stmt.all() as any[];

      return rows.map(deserializeRequest);
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
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM requests WHERE collectionId = ?');
      const rows = stmt.all(collectionId) as any[];

      return rows.map(deserializeRequest);
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
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM requests WHERE folderId = ?');
      const rows = stmt.all(folderId) as any[];

      return rows.map(deserializeRequest);
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
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM requests WHERE name LIKE ?');
      const rows = stmt.all(`%${query}%`) as any[];

      return rows.map(deserializeRequest);
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
      const db = getDatabase().getRawDB();
      const stmt = db.prepare(`
        SELECT * FROM requests
        WHERE lastSentAt IS NOT NULL
        ORDER BY lastSentAt DESC
        LIMIT ?
      `);
      const rows = stmt.all(limit) as any[];

      return rows.map(deserializeRequest);
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
      const db = getDatabase().getRawDB();
      const insertStmt = db.prepare(`
        INSERT INTO requests
        (id, name, description, method, url, headers, body, auth, tests,
         collectionId, folderId, tags, createdAt, updatedAt, lastSentAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction(() => {
        for (const req of requests) {
          const serialized = serializeRequest(req);
          insertStmt.run(
            serialized.id, serialized.name, serialized.description, serialized.method,
            serialized.url, serialized.headers, serialized.body, serialized.auth,
            serialized.tests, serialized.collectionId, serialized.folderId, serialized.tags,
            serialized.createdAt, serialized.updatedAt, serialized.lastSentAt
          );
        }
      });

      transaction();
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
      const db = getDatabase().getRawDB();
      const updateStmt = db.prepare(`
        UPDATE requests SET
          name = ?, description = ?, method = ?, url = ?, headers = ?, body = ?, auth = ?,
          tests = ?, collectionId = ?, folderId = ?, tags = ?, updatedAt = ?
        WHERE id = ?
      `);

      const transaction = db.transaction(async () => {
        for (const { id, changes } of updates) {
          const existing = await this.getById(id);
          if (!existing) continue;

          const updated: Request = {
            ...existing,
            ...changes,
            id,
            updatedAt: new Date(),
          };
          const serialized = serializeRequest(updated);

          updateStmt.run(
            serialized.name, serialized.description, serialized.method, serialized.url,
            serialized.headers, serialized.body, serialized.auth, serialized.tests,
            serialized.collectionId, serialized.folderId, serialized.tags,
            serialized.updatedAt, serialized.id
          );
        }
      });

      transaction();
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
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('DELETE FROM requests WHERE id = ?');

      const transaction = db.transaction(() => {
        for (const id of ids) {
          stmt.run(id);
        }
      });

      transaction();
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
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT COUNT(*) as count FROM requests');
      const result = stmt.get() as { count: number };
      return result.count;
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
