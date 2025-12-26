import { Response } from '../types';
import { getDatabase, RequestExecutionRecord } from './database';
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
 * Handles CRUD operations for request execution history
 */
export class HistoryRepository {
  private db = getDatabase();

  /**
   * Add a new execution record
   */
  async add(execution: RequestExecution): Promise<number> {
    try {
      const record: RequestExecutionRecord = {
        requestId: execution.requestId,
        status: execution.status,
        startTime: execution.startTime,
        endTime: execution.endTime,
        response: execution.response,
        error: execution.error,
      };

      const id = await this.db.history.add(record);
      const numId = typeof id === 'number' ? id : parseInt(id as string, 10);
      logger.info(`[HistoryRepo] Added history record: ${numId}`);
      return numId;
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
      const records = await this.db.history
        .where('requestId')
        .equals(requestId)
        .reverse()
        .toArray();
      return records;
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
      const records = await this.db.history
        .orderBy('startTime')
        .reverse()
        .limit(limit)
        .toArray();
      return records;
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
      const allRecords = await this.db.history.toArray();
      return allRecords.filter((record) => record.status === status);
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
      const records = await this.db.history
        .where('startTime')
        .between(startDate, endDate, true, true)
        .toArray();
      return records;
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
      const record = await this.db.history.get(id);
      return record || null;
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
      await this.db.history.clear();
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
      await this.db.history.delete(id);
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
      const records = await this.getByRequest(requestId);
      const ids = records.map((r) => r.id!).filter((id): id is number => id !== undefined);
      await this.db.history.bulkDelete(ids);
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
      const records = await this.db.history
        .where('startTime')
        .below(date)
        .toArray();
      const ids = records.map((r) => r.id!).filter((id): id is number => id !== undefined);
      await this.db.history.bulkDelete(ids);
      logger.info(`[HistoryRepo] Deleted ${ids.length} history records older than ${date.toISOString()}`);
    } catch (error) {
      logger.error(`[HistoryRepo] Failed to delete old history`, error);
      throw error;
    }
  }

  /**
   * Get failed executions
   */
  async getFailed(limit: number = 50): Promise<RequestExecution[]> {
    try {
      const records = await this.db.history
        .orderBy('startTime')
        .reverse()
        .filter((record) => record.status === 'failed')
        .limit(limit)
        .toArray();
      return records;
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
      const allRecords = await this.db.history.toArray();

      return {
        total: allRecords.length,
        completed: allRecords.filter((r) => r.status === 'completed').length,
        failed: allRecords.filter((r) => r.status === 'failed').length,
        pending: allRecords.filter((r) => r.status === 'pending').length,
        running: allRecords.filter((r) => r.status === 'running').length,
      };
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
      return await this.db.history.count();
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
