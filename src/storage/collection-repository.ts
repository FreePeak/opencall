/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Collection, Request } from '../types';
import { getDatabase, serializeCollection, deserializeCollection } from './database';
import { getRequestRepository } from './request-repository';
import { logger } from '../utils/logger';

/**
 * Collection Item Type
 * Can be either a Collection (folder) or Request
 */
export type CollectionItem = Collection | Request;

/**
 * Collection Repository
 * Handles CRUD operations for collections and folders using SQLite
 */
export class CollectionRepository {
  /**
   * Create a new collection or folder
   */
  async create(collection: Collection): Promise<Collection> {
    try {
      const db = getDatabase().getRawDB();
      const serialized = serializeCollection(collection);

      const stmt = db.prepare(`
        INSERT INTO collections
        (id, name, description, parentId, items, auth, variables, scripts, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        serialized.id, serialized.name, serialized.description, serialized.parentId,
        serialized.items, serialized.auth, serialized.variables, serialized.scripts,
        serialized.createdAt, serialized.updatedAt
      );

      logger.info(`[CollectionRepo] Created collection: ${collection.id}`);
      return collection;
    } catch (error) {
      logger.error(`[CollectionRepo] Failed to create collection: ${collection.id}`, error);
      throw error;
    }
  }

  /**
   * Update an existing collection
   */
  async update(id: string, updates: Partial<Collection>): Promise<Collection> {
    try {
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error(`Collection not found: ${id}`);
      }

      const updated: Collection = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date(),
      };

      await this.create(updated); // UPSERT
      logger.info(`[CollectionRepo] Updated collection: ${id}`);
      return updated;
    } catch (error) {
      logger.error(`[CollectionRepo] Failed to update collection: ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete a collection
   * Also deletes all child collections recursively
   * Note: Requests in deleted collections need to be handled separately
   */
  async delete(id: string): Promise<void> {
    try {
      const db = getDatabase().getRawDB();

      // First, recursively delete all children
      const children = await this.getByParent(id);
      for (const child of children) {
        await this.delete(child.id);
      }

      // Delete the collection itself
      const stmt = db.prepare('DELETE FROM collections WHERE id = ?');
      stmt.run(id);

      logger.info(`[CollectionRepo] Deleted collection: ${id}`);
    } catch (error) {
      logger.error(`[CollectionRepo] Failed to delete collection: ${id}`, error);
      throw error;
    }
  }

  /**
   * Get a collection by ID
   */
  async getById(id: string): Promise<Collection | null> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM collections WHERE id = ?');
      const row = stmt.get(id) as any;

      return row ? deserializeCollection(row) : null;
    } catch (error) {
      logger.error(`[CollectionRepo] Failed to get collection: ${id}`, error);
      throw error;
    }
  }

  /**
   * Get all collections
   */
  async getAll(): Promise<Collection[]> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM collections');
      const rows = stmt.all() as any[];

      return rows.map(deserializeCollection);
    } catch (error) {
      logger.error('[CollectionRepo] Failed to get all collections', error);
      throw error;
    }
  }

  /**
   * Get root collections (collections without parent)
   */
  async getRootCollections(): Promise<Collection[]> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare(`
        SELECT * FROM collections
        WHERE parentId IS NULL OR parentId = ''
      `);
      const rows = stmt.all() as any[];

      return rows.map(deserializeCollection);
    } catch (error) {
      logger.error('[CollectionRepo] Failed to get root collections', error);
      throw error;
    }
  }

  /**
   * Get children of a parent collection
   */
  async getByParent(parentId?: string): Promise<Collection[]> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM collections WHERE parentId = ?');
      const rows = stmt.all(parentId || '') as any[];

      return rows.map(deserializeCollection);
    } catch (error) {
      logger.error(`[CollectionRepo] Failed to get children for: ${parentId || 'root'}`, error);
      throw error;
    }
  }

  /**
   * Get children of a collection (collections only for now)
   * TODO: Include requests when request repository is integrated
   */
  async getChildren(parentId?: string): Promise<CollectionItem[]> {
    try {
      const collections = await this.getByParent(parentId);
      return collections as CollectionItem[];
    } catch (error) {
      logger.error(`[CollectionRepo] Failed to get children for: ${parentId || 'root'}`, error);
      throw error;
    }
  }

  /**
   * Get the full hierarchy tree
   */
  async getHierarchy(): Promise<Collection[]> {
    try {
      const allCollections = await this.getAll();
      const collectionMap = new Map<string, Collection>();

      // First pass: create map of all collections
      for (const collection of allCollections) {
        collectionMap.set(collection.id, { ...collection, items: [] });
      }

      // Second pass: build hierarchy
      const rootCollections: Collection[] = [];

      for (const collection of allCollections) {
        const node = collectionMap.get(collection.id)!;

        if (collection.parentId) {
          const parent = collectionMap.get(collection.parentId);
          if (parent) {
            parent.items.push(node);
          }
        } else {
          rootCollections.push(node);
        }
      }

      return rootCollections;
    } catch (error) {
      logger.error('[CollectionRepo] Failed to get hierarchy', error);
      throw error;
    }
  }

  /**
   * Search collections by name
   */
  async searchByName(query: string): Promise<Collection[]> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT * FROM collections WHERE name LIKE ?');
      const rows = stmt.all(`%${query}%`) as any[];

      return rows.map(deserializeCollection);
    } catch (error) {
      logger.error(`[CollectionRepo] Failed to search collections: ${query}`, error);
      throw error;
    }
  }

  /**
   * Move a collection to a new parent
   */
  async move(id: string, newParentId: string | undefined): Promise<void> {
    try {
      await this.update(id, { parentId: newParentId });
      logger.info(`[CollectionRepo] Moved collection ${id} to ${newParentId || 'root'}`);
    } catch (error) {
      logger.error(`[CollectionRepo] Failed to move collection: ${id}`, error);
      throw error;
    }
  }

  /**
   * Bulk create collections
   */
  async bulkCreate(collections: Collection[]): Promise<Collection[]> {
    try {
      const db = getDatabase().getRawDB();
      const insertStmt = db.prepare(`
        INSERT INTO collections
        (id, name, description, parentId, items, auth, variables, scripts, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction(() => {
        for (const col of collections) {
          const serialized = serializeCollection(col);
          insertStmt.run(
            serialized.id, serialized.name, serialized.description, serialized.parentId,
            serialized.items, serialized.auth, serialized.variables, serialized.scripts,
            serialized.createdAt, serialized.updatedAt
          );
        }
      });

      transaction();
      logger.info(`[CollectionRepo] Bulk created ${collections.length} collections`);
      return collections;
    } catch (error) {
      logger.error('[CollectionRepo] Failed to bulk create collections', error);
      throw error;
    }
  }

  /**
   * Bulk update collections
   */
  async bulkUpdate(updates: Array<{ id: string; changes: Partial<Collection> }>): Promise<void> {
    try {
      const db = getDatabase().getRawDB();
      const updateStmt = db.prepare(`
        UPDATE collections SET
          name = ?, description = ?, parentId = ?, items = ?, auth = ?,
          variables = ?, scripts = ?, updatedAt = ?
        WHERE id = ?
      `);

      const transaction = db.transaction(async () => {
        for (const { id, changes } of updates) {
          const existing = await this.getById(id);
          if (!existing) continue;

          const updated: Collection = {
            ...existing,
            ...changes,
            id,
            updatedAt: new Date(),
          };
          const serialized = serializeCollection(updated);

          updateStmt.run(
            serialized.name, serialized.description, serialized.parentId,
            serialized.items, serialized.auth, serialized.variables,
            serialized.scripts, serialized.updatedAt, serialized.id
          );
        }
      });

      transaction();
      logger.info(`[CollectionRepo] Bulk updated ${updates.length} collections`);
    } catch (error) {
      logger.error('[CollectionRepo] Failed to bulk update collections', error);
      throw error;
    }
  }

  /**
   * Bulk delete collections
   */
  async bulkDelete(ids: string[]): Promise<void> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('DELETE FROM collections WHERE id = ?');

      const transaction = db.transaction(() => {
        for (const id of ids) {
          stmt.run(id);
        }
      });

      transaction();
      logger.info(`[CollectionRepo] Bulk deleted ${ids.length} collections`);
    } catch (error) {
      logger.error('[CollectionRepo] Failed to bulk delete collections', error);
      throw error;
    }
  }

  /**
   * Count total collections
   */
  async count(): Promise<number> {
    try {
      const db = getDatabase().getRawDB();
      const stmt = db.prepare('SELECT COUNT(*) as count FROM collections');
      const result = stmt.get() as { count: number };
      return result.count;
    } catch (error) {
      logger.error('[CollectionRepo] Failed to count collections', error);
      throw error;
    }
  }
}

// Global collection repository instance
let collectionRepositoryInstance: CollectionRepository | null = null;

/**
 * Get the global collection repository instance
 */
export function getCollectionRepository(): CollectionRepository {
  if (!collectionRepositoryInstance) {
    collectionRepositoryInstance = new CollectionRepository();
  }
  return collectionRepositoryInstance;
}
