import { Response } from '../types';
import { getDatabase, serializeHistory, deserializeHistory } from './database';
import { logger } from '../utils/logger';

/**
 * Request execution with response data (exported type)
 */
export interface RequestExecution {
  id?: number;
  requestId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  response?: Response;
  error?: string;
}

/**
 * History Repository
 * Handles CRUD operations for request execution history using SQLite
 */
export class HistoryRepository {
  /**
   * Add a new execution record
   */
  async add(execution: RequestExecution): Promise<number> {
    try {
      const db = getDatabase().getRawDB();
      const serialized = serializeHistory(execution);

      const stmt = db.prepare(`
        INSERT INTO history (requestId, status, startTime, endTime, response, error)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        serialized.requestId, serialized.status, serialized.startTime,
        serialized.endTime, serialized.response, serialized.error
      );

      const id = typeof result.lastInsertRowid === 'bigint'
        ? Number(result.lastInsertRowid)
        : result.lastInsertRowid;
      logger.info(`[HistoryRepo] Added history record: ${id}`);
      return id;
    } catch (error) {
      logger.error('[HistoryRepo] Failed to add history record', error);
      throw error;
    }
  }

  /**
   * Get executions by request ID
   */
  async getByRequest(requestId: string): Promise<RequestExecution[]> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare(`
        SELECT * FROM history
        WHERE requestId = ?
        ORDER BY startTime DESC
      `);
      const rows = stmt.all(requestId) as any[];

      return rows.map(deserializeHistory);
    } catch (error) {
      logger.error(`[HistoryRepo] Failed to get history for request: ${requestId}`, error);
      throw error;
    }
  }

  /**
   * Get recent executions
   */
  async getRecent(limit: number = 50): Promise<RequestExecution[]> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare(`
        SELECT * FROM history
        ORDER BY startTime DESC
        LIMIT ?
      `);
      const rows = stmt.all(limit) as any[];

      return rows.map(deserializeHistory);
    } catch (error) {
      logger.error('[HistoryRepo] Failed to get recent history', error);
      throw error;
    }
  }

  /**
   * Get executions by status
   */
  async getByStatus(status: 'pending' | 'running' | 'completed' | 'failed'): Promise<RequestExecution[]> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM history WHERE status = ? ORDER BY startTime DESC');
      const rows = stmt.all(status) as any[];

      return rows.map(deserializeHistory);
    } catch (error) {
      logger.error(`[HistoryRepo] Failed to get history by status: ${status}`, error);
      throw error;
    }
  }

  /**
   * Get executions by date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<RequestExecution[]> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare(`
        SELECT * FROM history
        WHERE startTime >= ? AND startTime <= ?
        ORDER BY startTime DESC
      `);
      const rows = stmt.all(startDate.toISOString(), endDate.toISOString()) as any[];

      return rows.map(deserializeHistory);
    } catch (error) {
      logger.error('[HistoryRepo] Failed to get history by date range', error);
      throw error;
    }
  }

  /**
   * Get a specific execution by ID
   */
  async getById(id: number): Promise<RequestExecution | null> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM history WHERE id = ?');
      const row = stmt.get(id) as any;

      return row ? deserializeHistory(row) : null;
    } catch (error) {
      logger.error(`[HistoryRepo] Failed to get history record: ${id}`, error);
      throw error;
    }
  }

  /**
   * Clear all history
   */
  async clear(): Promise<void> {
    try {
      const db = getDatabase().getRawDB();
      db.exec('DELETE FROM history');
      logger.info('[HistoryRepo] Cleared all history');
    } catch (error) {
      logger.error('[HistoryRepo] Failed to clear history', error);
      throw error;
    }
  }

  /**
   * Delete a specific history record
   */
  async delete(id: number): Promise<void> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('DELETE FROM history WHERE id = ?');
      stmt.run(id);
      logger.info(`[HistoryRepo] Deleted history record: ${id}`);
    } catch (error) {
      logger.error(`[HistoryRepo] Failed to delete history record: ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete history for a specific request
   */
  async deleteByRequest(requestId: string): Promise<void> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('DELETE FROM history WHERE requestId = ?');
      stmt.run(requestId);
      logger.info(`[HistoryRepo] Deleted history for request: ${requestId}`);
    } catch (error) {
      logger.error(`[HistoryRepo] Failed to delete history for request: ${requestId}`, error);
      throw error;
    }
  }

  /**
   * Delete history older than a specific date
   */
  async deleteOlderThan(date: Date): Promise<void> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('DELETE FROM history WHERE startTime < ?');
      stmt.run(date.toISOString());
      logger.info(`[HistoryRepo] Deleted history older than ${date.toISOString()}`);
    } catch (error) {
      logger.error('[HistoryRepo] Failed to delete old history', error);
      throw error;
    }
  }

  /**
   * Get failed executions
   */
  async getFailed(limit: number = 50): Promise<RequestExecution[]> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare(`
        SELECT * FROM history
        WHERE status = 'failed'
        ORDER BY startTime DESC
        LIMIT ?
      `);
      const rows = stmt.all(limit) as any[];

      return rows.map(deserializeHistory);
    } catch (error) {
      logger.error('[HistoryRepo] Failed to get failed history', error);
      throw error;
    }
  }

  /**
   * Get statistics about history
   */
  async getStatistics(): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    running: number;
  }> {
    try {
      const db = getDatabase().getRawDB();

      const totalStmt = db.prepare('SELECT COUNT(*) as count FROM history');
      const total = (totalStmt.get() as { count: number }).count;

      const completedStmt = db.prepare("SELECT COUNT(*) as count FROM history WHERE status = 'completed'");
      const completed = (completedStmt.get() as { count: number }).count;

      const failedStmt = db.prepare("SELECT COUNT(*) as count FROM history WHERE status = 'failed'");
      const failed = (failedStmt.get() as { count: number }).count;

      const pendingStmt = db.prepare("SELECT COUNT(*) as count FROM history WHERE status = 'pending'");
      const pending = (pendingStmt.get() as { count: number }).count;

      const runningStmt = db.prepare("SELECT COUNT(*) as count FROM history WHERE status = 'running'");
      const running = (runningStmt.get() as { count: number }).count;

      return { total, completed, failed, pending, running };
    } catch (error) {
      logger.error('[HistoryRepo] Failed to get history statistics', error);
      throw error;
    }
  }

  /**
   * Count total history records
   */
  async count(): Promise<number> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT COUNT(*) as count FROM history');
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error) {
      logger.error('[HistoryRepo] Failed to count history', error);
      throw error;
    }
  }
}

// Global history repository instance
let historyRepositoryInstance: HistoryRepository | null = null;

/**
 * Get the global history repository instance
 */
export function getHistoryRepository(): HistoryRepository {
  if (!historyRepositoryInstance) {
    historyRepositoryInstance = new HistoryRepository();
  }
  return historyRepositoryInstance;
}
