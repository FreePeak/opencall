import { Collection, Request } from '../types';
import { getDatabase } from './database';
import { logger } from '../utils/logger';

/**
 * Collection Item Type
 * Can be either a Collection (folder) or Request
 */
export type CollectionItem = Collection | Request;

/**
 * Collection Repository
 * Handles CRUD operations for collections and folders
 */
export class CollectionRepository {
  private db = getDatabase();

  /**
   * Create a new collection or folder
   */
  async create(collection: Collection): Promise<Collection> {
    try {
      await this.db.collections.add(collection);
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

      await this.db.collections.put(updated);
      logger.info(`[CollectionRepo] Updated collection: ${id}`);
      return updated;
    } catch (error) {
      logger.error(`[CollectionRepo] Failed to update collection: ${id}`, error);
      throw error;
    }
  }

  /**
   * Delete a collection
   * Also deletes all child collections and requests
   */
  async delete(id: string): Promise<void> {
    try {
      // First, get all children
      const children = await this.getChildren(id);

      // Recursively delete all children
      for (const child of children) {
        if ('items' in child) {
          // It's a collection/folder
          await this.delete(child.id);
        }
      }

      // Delete the collection itself
      await this.db.collections.delete(id);
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
      const collection = await this.db.collections.get(id);
      return collection || null;
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
      const collections = await this.db.collections.toArray();
      return collections;
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
      const allCollections = await this.db.collections.toArray();
      const rootCollections = allCollections.filter(
        (col) => !col.parentId || col.parentId === ''
      );
      return rootCollections;
    } catch (error) {
      logger.error('[CollectionRepo] Failed to get root collections', error);
      throw error;
    }
  }

  /**
   * Get children of a collection (collections and requests)
   */
  async getChildren(parentId?: string): Promise<CollectionItem[]> {
    try {
      // Get child collections
      const collections = parentId
        ? await this.db.collections.where('parentId').equals(parentId).toArray()
        : await this.getRootCollections();

      // Get requests in this collection/folder
      // Note: Requests are stored separately, we'll need to query from the request repository
      // For now, return only collections
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
      const allCollections = await this.getAll();
      const lowerQuery = query.toLowerCase();
      return allCollections.filter((col) =>
        col.name.toLowerCase().includes(lowerQuery)
      );
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
      await this.db.collections.bulkAdd(collections);
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
      const transactions = updates.map(async ({ id, changes }) => {
        const existing = await this.getById(id);
        if (existing) {
          const updated: Collection = {
            ...existing,
            ...changes,
            id,
            updatedAt: new Date(),
          };
          await this.db.collections.put(updated);
        }
      });

      await Promise.all(transactions);
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
      await this.db.collections.bulkDelete(ids);
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
      return await this.db.collections.count();
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
