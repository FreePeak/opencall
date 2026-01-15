/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import * as vscode from 'vscode';
import { Collection, EnvironmentVariable, Request } from '../types';
import { logger } from '../utils/logger';
import { generateId, deepClone } from '../utils/helpers';
import { StorageManager } from '../storage/storage-manager';

export interface CollectionManagerOptions {
  maxCollections?: number;
  maxItemsPerCollection?: number;
}

export class CollectionManager {
  private collections: Map<string, Collection> = new Map();
  private rootCollections: string[] = [];
  private options: CollectionManagerOptions;
  private storageManager: StorageManager | null = null;
  private requestManager: any = null; // Reference to RequestManager for hydrating requests

  // Events
  private _onCollectionCreated = new vscode.EventEmitter<Collection>();
  private _onCollectionUpdated = new vscode.EventEmitter<Collection>();
  private _onCollectionDeleted = new vscode.EventEmitter<string>();
  private _onCollectionMoved = new vscode.EventEmitter<{ collectionId: string; newParentId?: string }>();

  constructor(options: CollectionManagerOptions = {}) {
    this.options = {
      maxCollections: 1000,
      maxItemsPerCollection: 10000,
      ...options
    };
  }

  get onCollectionCreated(): vscode.Event<Collection> {
    return this._onCollectionCreated.event;
  }

  get onCollectionUpdated(): vscode.Event<Collection> {
    return this._onCollectionUpdated.event;
  }

  get onCollectionDeleted(): vscode.Event<string> {
    return this._onCollectionDeleted.event;
  }

  get onCollectionMoved(): vscode.Event<{ collectionId: string; newParentId?: string }> {
    return this._onCollectionMoved.event;
  }

  /**
   * Set storage manager for persistence (dependency injection)
   */
  setStorageManager(storageManager: StorageManager): void {
    this.storageManager = storageManager;
    logger.info('[CollectionManager] Storage manager connected');
  }

  /**
   * Set request manager for hydrating request references (dependency injection)
   */
  setRequestManager(requestManager: any): void {
    this.requestManager = requestManager;
    logger.info('[CollectionManager] Request manager connected');
  }

  async createCollection(
    name: string,
    description?: string,
    parentId?: string
  ): Promise<Collection> {
    if (this.collections.size >= this.options.maxCollections!) {
      throw new Error(`Maximum number of collections (${this.options.maxCollections}) reached`);
    }

    const collection: Collection = {
      id: generateId(),
      name,
      description,
      type: 'collection',
      parentId,
      items: [],
      auth: { type: 'none' },
      variables: [],
      scripts: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.collections.set(collection.id, collection);

    if (!parentId) {
      this.rootCollections.push(collection.id);
    } else {
      this.addToParentCollection(parentId, collection);
    }

    await this.saveCollection(collection);

    logger.info(`Created collection: ${name} (${collection.id})`);
    this._onCollectionCreated.fire(collection);

    return collection;
  }

  async createFolder(
    name: string,
    parentId: string,
    description?: string
  ): Promise<Collection> {
    const parent = this.collections.get(parentId);
    if (!parent) {
      throw new Error(`Parent collection not found: ${parentId}`);
    }

    const folder: Collection = {
      id: generateId(),
      name,
      description,
      type: 'folder',
      parentId,
      items: [],
      auth: { type: 'none' },
      variables: [],
      scripts: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.collections.set(folder.id, folder);
    parent.items.push(folder);

    await this.saveCollection(parent);
    await this.saveCollection(folder);

    logger.info(`Created folder: ${name} in collection ${parent.name}`);
    this._onCollectionCreated.fire(folder);

    return folder;
  }

  async updateCollection(
    collectionId: string,
    updates: Partial<Collection>
  ): Promise<Collection | null> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      logger.warn(`Collection not found: ${collectionId}`);
      return null;
    }

    const updatedCollection = { ...collection, ...updates, updatedAt: new Date() };
    this.collections.set(collectionId, updatedCollection);
    await this.saveCollection(updatedCollection);

    logger.info(`Updated collection: ${updatedCollection.name}`);
    this._onCollectionUpdated.fire(updatedCollection);

    return updatedCollection;
  }

  async deleteCollection(collectionId: string): Promise<boolean> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      logger.warn(`Collection not found: ${collectionId}`);
      return false;
    }

    // Remove from parent if it has one
    if (collection.parentId) {
      const parent = this.collections.get(collection.parentId);
      if (parent) {
        parent.items = parent.items.filter(item => item.id !== collectionId);
        await this.saveCollection(parent);
      }
    } else {
      // Remove from root collections
      this.rootCollections = this.rootCollections.filter(id => id !== collectionId);
    }

    // Recursively delete children
    await this.deleteChildren(collectionId);

    // Delete the collection itself
    this.collections.delete(collectionId);
    await this.deleteCollectionData(collectionId);

    logger.info(`Deleted collection: ${collection.name}`);
    this._onCollectionDeleted.fire(collectionId);

    return true;
  }

  private async deleteChildren(collectionId: string): Promise<void> {
    const collection = this.collections.get(collectionId);
    if (!collection) return;

    for (const item of collection.items) {
      if ('items' in item) {
        // It's a sub-collection/folder
        await this.deleteChildren(item.id);
        this.collections.delete(item.id);
        await this.deleteCollectionData(item.id);
      }
    }
  }

  async moveCollection(
    collectionId: string,
    newParentId?: string
  ): Promise<boolean> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      logger.warn(`Collection not found: ${collectionId}`);
      return false;
    }

    const oldParentId = collection.parentId;

    // Remove from old parent
    if (oldParentId) {
      const oldParent = this.collections.get(oldParentId);
      if (oldParent) {
        oldParent.items = oldParent.items.filter(item => item.id !== collectionId);
        await this.saveCollection(oldParent);
      }
    } else {
      this.rootCollections = this.rootCollections.filter(id => id !== collectionId);
    }

    // Add to new parent
    if (newParentId) {
      const newParent = this.collections.get(newParentId);
      if (!newParent) {
        logger.warn(`New parent collection not found: ${newParentId}`);
        return false;
      }

      newParent.items.push(collection);
      await this.saveCollection(newParent);
    } else {
      this.rootCollections.push(collectionId);
    }

    // Update collection
    collection.parentId = newParentId;
    collection.updatedAt = new Date();
    await this.saveCollection(collection);

    logger.info(`Moved collection: ${collection.name} to ${newParentId || 'root'}`);
    this._onCollectionMoved.fire({ collectionId, newParentId });

    return true;
  }

  getCollection(collectionId: string): Collection | null {
    return this.collections.get(collectionId) || null;
  }

  getAllCollections(): Collection[] {
    return Array.from(this.collections.values());
  }

  getRootCollections(): Collection[] {
    return this.rootCollections
      .map(id => this.collections.get(id))
      .filter(collection => collection !== undefined) as Collection[];
  }

  getCollectionsFlat(): Collection[] {
    const flatten = (collections: Collection[]): Collection[] => {
      const result: Collection[] = [];
      for (const collection of collections) {
        result.push(collection);
        if (collection.items) {
          const childCollections = collection.items.filter(item => 'items' in item) as Collection[];
          result.push(...flatten(childCollections));
        }
      }
      return result;
    };

    return flatten(this.getRootCollections());
  }

  getCollectionHierarchy(): CollectionTree {
    const buildTree = (collections: Collection[]): CollectionTreeItem[] => {
      return collections.map(collection => ({
        ...collection,
        children: collection.items.filter(item => 'items' in item).length > 0
          ? buildTree(collection.items.filter(item => 'items' in item) as Collection[])
          : undefined
      })) as CollectionTreeItem[];
    };

    return {
      collections: buildTree(this.getRootCollections()),
      totalCollections: this.collections.size,
      totalItems: this.countTotalItems()
    };
  }

  private countTotalItems(): number {
    let count = 0;
    for (const collection of this.collections.values()) {
      count += collection.items.length;
    }
    return count;
  }

  searchCollections(query: string): Collection[] {
    const lowerQuery = query.toLowerCase();
    const results: Collection[] = [];

    for (const collection of this.collections.values()) {
      if (
        collection.name.toLowerCase().includes(lowerQuery) ||
        (collection.description?.toLowerCase().includes(lowerQuery))
      ) {
        results.push(collection);
      }
    }

    return results;
  }

  private addToParentCollection(parentId: string, collection: Collection): void {
    const parent = this.collections.get(parentId);
    if (parent) {
      parent.items.push(collection);
    }
  }

  private async saveCollection(collection: Collection): Promise<void> {
    try {
      if (!this.storageManager) {
        logger.warn('[CollectionManager] Storage manager not set, skipping save');
        return;
      }
      // Serialize collection to avoid circular references
      const serialized = this.serializeCollection(collection);
      await this.storageManager.saveCollection(serialized);
      logger.debug(`[CollectionManager] Saved collection: ${collection.id}`);
    } catch (error) {
      logger.error('Failed to save collection', error);
      throw error;
    }
  }

  /**
   * Serialize collection for storage without circular references
   * Converts nested Collection/Request objects to ID references
   */
  private serializeCollection(collection: Collection): Collection {
    return {
      ...collection,
      items: collection.items.map(item => {
        // Check if item has 'items' property (Collection) or 'method' property (Request)
        const isCollection = 'items' in item;
        const isRequest = 'method' in item;
        
        // Store only item metadata, not full nested objects
        return {
          id: item.id,
          name: item.name,
          type: isCollection ? 'collection' : isRequest ? 'request' : 'unknown',
        } as any;
      })
    };
  }

  /**
   * Hydrate collection by resolving item IDs to full objects
   */
  private hydrateCollection(collection: Collection): Collection {
    const hydrated = { ...collection };
    hydrated.items = collection.items.map(item => {
      const itemData = item as any;
      if (itemData.type === 'collection') {
        // Resolve collection reference
        const childCollection = this.collections.get(itemData.id);
        return childCollection || item;
      } else {
        // For requests, we'll keep the minimal data or fetch from request manager
        // For now, keep as-is since requests are managed separately
        return item;
      }
    });
    return hydrated;
  }

  private async deleteCollectionData(collectionId: string): Promise<void> {
    try {
      if (!this.storageManager) {
        logger.warn('[CollectionManager] Storage manager not set, skipping delete');
        return;
      }
      await this.storageManager.deleteCollection(collectionId);
      logger.debug(`[CollectionManager] Deleted collection data: ${collectionId}`);
    } catch (error) {
      logger.error('Failed to delete collection data', error);
      throw error;
    }
  }

  async loadCollections(): Promise<void> {
    try {
      if (!this.storageManager) {
        logger.warn('[CollectionManager] Storage manager not set, skipping load');
        return;
      }

      const collections = await this.storageManager.getCollections();
      logger.info(`[CollectionManager] Loading ${collections.length} collections from storage`);

      // Clear current state
      this.collections.clear();
      this.rootCollections = [];

      // First pass: Load all collections into map
      for (const collection of collections) {
        this.collections.set(collection.id, collection);
        if (!collection.parentId) {
          this.rootCollections.push(collection.id);
        }
      }

      // Second pass: Hydrate items by resolving references
      for (const [id, collection] of this.collections.entries()) {
        const hydrated = this.hydrateCollectionItems(collection);
        this.collections.set(id, hydrated);
      }

      logger.info(`[CollectionManager] Loaded ${this.collections.size} collections`);
    } catch (error) {
      logger.error('Failed to load collections', error);
      throw error;
    }
  }

  /**
   * Hydrate collection items by resolving ID references to full objects
   */
  private hydrateCollectionItems(collection: Collection): Collection {
    const hydrated = { ...collection };
    hydrated.items = collection.items.map(item => {
      const itemData = item as any;
      // Check if item is just an ID reference (from serialized data)
      if (itemData.type === 'collection' && typeof itemData.id === 'string') {
        const childCollection = this.collections.get(itemData.id);
        return childCollection || item;
      } else if (itemData.type === 'request' && typeof itemData.id === 'string') {
        // Try to resolve request from RequestManager
        if (this.requestManager) {
          const fullRequest = this.requestManager.getRequest(itemData.id);
          return fullRequest || item;
        }
        return item;
      }
      // Otherwise keep as-is (already full object)
      return item;
    });
    return hydrated;
  }

  /**
   * Add a request to a collection
   */
  async addRequestToCollection(collectionId: string, request: Request): Promise<boolean> {
    try {
      const collection = this.collections.get(collectionId);
      if (!collection) {
        logger.warn(`[CollectionManager] Collection not found: ${collectionId}`);
        return false;
      }

      // Check if request already exists in items
      const existingIndex = collection.items.findIndex(item => item.id === request.id);
      if (existingIndex >= 0) {
        // Update existing request
        collection.items[existingIndex] = request;
      } else {
        // Add new request
        collection.items.push(request);
      }

      collection.updatedAt = new Date();
      await this.saveCollection(collection);

      logger.info(`[CollectionManager] Added request ${request.id} to collection ${collectionId}`);
      this._onCollectionUpdated.fire(collection);
      return true;
    } catch (error) {
      logger.error(`[CollectionManager] Failed to add request to collection`, error);
      return false;
    }
  }

  /**
   * Remove a request from a collection
   */
  async removeRequestFromCollection(collectionId: string, requestId: string): Promise<boolean> {
    try {
      const collection = this.collections.get(collectionId);
      if (!collection) {
        logger.warn(`[CollectionManager] Collection not found: ${collectionId}`);
        return false;
      }

      const initialLength = collection.items.length;
      collection.items = collection.items.filter(item => item.id !== requestId);

      if (collection.items.length === initialLength) {
        // Request was not in collection
        return false;
      }

      collection.updatedAt = new Date();
      await this.saveCollection(collection);

      logger.info(`[CollectionManager] Removed request ${requestId} from collection ${collectionId}`);
      this._onCollectionUpdated.fire(collection);
      return true;
    } catch (error) {
      logger.error(`[CollectionManager] Failed to remove request from collection`, error);
      return false;
    }
  }

  exportCollection(collectionId: string): ExportedCollection | null {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      return null;
    }

    return {
      info: {
        name: collection.name,
        description: collection.description,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: this.exportCollectionItems(collection),
      variable: collection.variables?.map(v => ({
        key: v.key,
        value: v.value,
        type: v.type,
        description: v.description
      })) || [],
      auth: this.exportAuth(collection.auth)
    };
  }

  private exportCollectionItems(collection: Collection): any[] {
    const items: any[] = [];

    for (const item of collection.items) {
      if ('method' in item) {
        // It's a request
        items.push(this.exportRequest(item));
      } else {
        // It's a sub-collection/folder
        items.push({
          name: item.name,
          description: item.description,
          item: this.exportCollectionItems(item)
        });
      }
    }

    return items;
  }

  private exportRequest(request: any): any {
    return {
      name: request.name,
      request: {
        method: request.method,
        header: request.headers?.map((h: any) => ({
          key: h.key,
          value: h.value,
          description: h.description
        })) || [],
        url: {
          raw: request.url,
          host: [new URL(request.url).hostname]
        },
        body: request.body,
        auth: this.exportAuth(request.auth)
      }
    };
  }

  private exportAuth(auth: any): any {
    if (!auth || auth.type === 'none') {
      return undefined;
    }

    switch (auth.type) {
      case 'bearer':
        return {
          type: 'bearer',
          bearer: auth.bearer
        };
      case 'basic':
        return {
          type: 'basic',
          basic: auth.basic
        };
      case 'apikey':
        return {
          type: 'apikey',
          apikey: auth.apiKey
        };
      default:
        return undefined;
    }
  }
}

export interface CollectionTree {
  collections: CollectionTreeItem[];
  totalCollections: number;
  totalItems: number;
}

export interface CollectionTreeItem extends Collection {
  children?: CollectionTreeItem[];
}

export interface ExportedCollection {
  info: {
    name: string;
    description?: string;
    schema: string;
  };
  item: any[];
  variable: any[];
  auth?: any;
}