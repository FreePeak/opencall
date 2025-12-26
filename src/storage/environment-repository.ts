import { Environment } from '../types';
import { getDatabase, serializeEnvironment, deserializeEnvironment } from './database';
import { logger } from '../utils/logger';

/**
 * Environment Repository
 * Handles CRUD operations for environments using SQLite
 */
export class EnvironmentRepository {
  /**
   * Create a new environment
   */
  async create(environment: Environment): Promise<Environment> {
    try {
      const db = getDatabase().getRawDB();

      // If this is set as active, deactivate all others
      if (environment.isActive) {
        await this.deactivateAll();
      }

      const serialized = serializeEnvironment(environment);
      const stmt = db.prepare(`
        INSERT INTO environments (id, name, variables, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        serialized.id, serialized.name, serialized.variables,
        serialized.isActive, serialized.createdAt, serialized.updatedAt
      );

      logger.info(`[EnvironmentRepo] Created environment: ${environment.id}`);
      return environment;
    } catch (error) {
      logger.error(`[EnvironmentRepo] Failed to create environment: ${environment.id}`, error);
      throw error;
    }
  }

  /**
   * Update an existing environment
   */
  async update(id: string, updates: Partial<Environment>): Promise<Environment> {
    try {
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`Environment not found: ${id}`);
      }

      // If setting as active, deactivate all others
      if (updates.isActive && !existing.isActive) {
        await this.deactivateAll();
      }

      const updated: Environment = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date(),
      };

      await this.create(updated); // UPSERT
      logger.info(`[EnvironmentRepo] Updated environment: ${id}`);
      return updated;
    } catch (error) {
      logger.error(`[EnvironmentRepo] Failed to update environment: ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete an environment
   */
  async delete(id: string): Promise<void> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('DELETE FROM environments WHERE id = ?');
      stmt.run(id);
      logger.info(`[EnvironmentRepo] Deleted environment: ${id}`);
    } catch (error) {
      logger.error(`[EnvironmentRepo] Failed to delete environment: ${id}`, error);
      throw error;
    }
  }

  /**
   * Get an environment by ID
   */
  async getById(id: string): Promise<Environment | null> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM environments WHERE id = ?');
      const row = stmt.get(id) as any;

      return row ? deserializeEnvironment(row) : null;
    } catch (error) {
      logger.error(`[EnvironmentRepo] Failed to get environment: ${id}`, error);
      throw error;
    }
  }

  /**
   * Get an environment by name
   */
  async getByName(name: string): Promise<Environment | null> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM environments WHERE name = ?');
      const row = stmt.get(name) as any;

      return row ? deserializeEnvironment(row) : null;
    } catch (error) {
      logger.error(`[EnvironmentRepo] Failed to get environment by name: ${name}`, error);
      throw error;
    }
  }

  /**
   * Get all environments
   */
  async getAll(): Promise<Environment[]> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM environments');
      const rows = stmt.all() as any[];

      return rows.map(deserializeEnvironment);
    } catch (error) {
      logger.error('[EnvironmentRepo] Failed to get all environments', error);
      throw error;
    }
  }

  /**
   * Get the active environment
   */
  async getActive(): Promise<Environment | null> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM environments WHERE isActive = 1');
      const row = stmt.get() as any;

      return row ? deserializeEnvironment(row) : null;
    } catch (error) {
      logger.error('[EnvironmentRepo] Failed to get active environment', error);
      throw error;
    }
  }

  /**
   * Set an environment as active
   * Deactivates all other environments
   */
  async setActive(id: string): Promise<void> {
    try {
      await this.update(id, { isActive: true });
      logger.info(`[EnvironmentRepo] Set active environment: ${id}`);
    } catch (error) {
      logger.error(`[EnvironmentRepo] Failed to set active environment: ${id}`, error);
      throw error;
    }
  }

  /**
   * Deactivate all environments
   */
  private async deactivateAll(): Promise<void> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('UPDATE environments SET isActive = 0');
      stmt.run();
    } catch (error) {
      logger.error('[EnvironmentRepo] Failed to deactivate all environments', error);
      throw error;
    }
  }

  /**
   * Search environments by name
   */
  async searchByName(query: string): Promise<Environment[]> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM environments WHERE name LIKE ?');
      const rows = stmt.all(`%${query}%`) as any[];

      return rows.map(deserializeEnvironment);
    } catch (error) {
      logger.error(`[EnvironmentRepo] Failed to search environments: ${query}`, error);
      throw error;
    }
  }

  /**
   * Get variable value from active environment
   */
  async getVariableValue(key: string): Promise<string | undefined> {
    try {
      const activeEnv = await this.getActive();
      if (!activeEnv) {
        return undefined;
      }

      const variable = activeEnv.variables.find((v) => v.key === key && v.enabled);
      return variable?.value;
    } catch (error) {
      logger.error(`[EnvironmentRepo] Failed to get variable: ${key}`, error);
      throw error;
    }
  }

  /**
   * Bulk create environments
   */
  async bulkCreate(environments: Environment[]): Promise<Environment[]> {
    try {
      const db = getDatabase().getRawDB();
      const insertStmt = db.prepare(`
        INSERT INTO environments (id, name, variables, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction(() => {
        for (const env of environments) {
          const serialized = serializeEnvironment(env);
          insertStmt.run(
            serialized.id, serialized.name, serialized.variables,
            serialized.isActive, serialized.createdAt, serialized.updatedAt
          );
        }
      });

      transaction();
      logger.info(`[EnvironmentRepo] Bulk created ${environments.length} environments`);
      return environments;
    } catch (error) {
      logger.error('[EnvironmentRepo] Failed to bulk create environments', error);
      throw error;
    }
  }

  /**
   * Bulk update environments
   */
  async bulkUpdate(updates: Array<{ id: string; changes: Partial<Environment> }>): Promise<void> {
    try {
      const db = getDatabase().getRawDB();
      const updateStmt = db.prepare(`
        UPDATE environments SET name = ?, variables = ?, isActive = ?, updatedAt = ?
        WHERE id = ?
      `);

      const transaction = db.transaction(async () => {
        for (const { id, changes } of updates) {
          const existing = await this.getById(id);
          if (!existing) continue;

          const updated: Environment = {
            ...existing,
            ...changes,
            id,
            updatedAt: new Date(),
          };
          const serialized = serializeEnvironment(updated);

          updateStmt.run(
            serialized.name, serialized.variables, serialized.isActive,
            serialized.updatedAt, serialized.id
          );
        }
      });

      transaction();
      logger.info(`[EnvironmentRepo] Bulk updated ${updates.length} environments`);
    } catch (error) {
      logger.error('[EnvironmentRepo] Failed to bulk update environments', error);
      throw error;
    }
  }

  /**
   * Bulk delete environments
   */
  async bulkDelete(ids: string[]): Promise<void> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('DELETE FROM environments WHERE id = ?');

      const transaction = db.transaction(() => {
        for (const id of ids) {
          stmt.run(id);
        }
      });

      transaction();
      logger.info(`[EnvironmentRepo] Bulk deleted ${ids.length} environments`);
    } catch (error) {
      logger.error('[EnvironmentRepo] Failed to bulk delete environments', error);
      throw error;
    }
  }

  /**
   * Count total environments
   */
  async count(): Promise<number> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT COUNT(*) as count FROM environments');
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error) {
      logger.error('[EnvironmentRepo] Failed to count environments', error);
      throw error;
    }
  }
}

// Global environment repository instance
let environmentRepositoryInstance: EnvironmentRepository | null = null;

/**
 * Get the global environment repository instance
 */
export function getEnvironmentRepository(): EnvironmentRepository {
  if (!environmentRepositoryInstance) {
    environmentRepositoryInstance = new EnvironmentRepository();
  }
  return environmentRepositoryInstance;
}
