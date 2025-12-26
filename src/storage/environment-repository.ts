import { Environment } from '../types';
import { getDatabase } from './database';
import { logger } from '../utils/logger';

/**
 * Environment Repository
 * Handles CRUD operations for environments
 */
export class EnvironmentRepository {
  private db = getDatabase();

  /**
   * Create a new environment
   */
  async create(environment: Environment): Promise<Environment> {
    try {
      // If this is set as active, deactivate all others
      if (environment.isActive) {
        await this.deactivateAll();
      }

      await this.db.environments.add(environment);
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

      await this.db.environments.put(updated);
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
      await this.db.environments.delete(id);
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
      const environment = await this.db.environments.get(id);
      return environment || null;
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
      const environment = await this.db.environments.where('name').equals(name).first();
      return environment || null;
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
      const environments = await this.db.environments.toArray();
      return environments;
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
      const allEnvironments = await this.db.environments.toArray();
      const activeEnvironment = allEnvironments.find((env) => env.isActive);
      return activeEnvironment || null;
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
      // First, deactivate all environments
      await this.deactivateAll();

      // Then, activate the requested environment
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
      const allEnvironments = await this.getAll();
      const updates = allEnvironments
        .filter((env) => env.isActive)
        .map((env) => ({
          ...env,
          isActive: false,
          updatedAt: new Date(),
        }));

      if (updates.length > 0) {
        await this.db.environments.bulkPut(updates);
      }
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
      const allEnvironments = await this.getAll();
      const lowerQuery = query.toLowerCase();
      return allEnvironments.filter((env) =>
        env.name.toLowerCase().includes(lowerQuery)
      );
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
      await this.db.environments.bulkAdd(environments);
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
      const transactions = updates.map(async ({ id, changes }) => {
        const existing = await this.getById(id);
        if (existing) {
          const updated: Environment = {
            ...existing,
            ...changes,
            id,
            updatedAt: new Date(),
          };
          await this.db.environments.put(updated);
        }
      });

      await Promise.all(transactions);
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
      await this.db.environments.bulkDelete(ids);
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
      return await this.db.environments.count();
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
