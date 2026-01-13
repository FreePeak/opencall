import * as vscode from 'vscode';
import { Collection, Request } from '../types';
import { CollectionTreeItem } from './CollectionTreeItem';
import { CollectionManager } from '../core/collection-manager';
import { logger } from '../utils/logger';

export class CollectionTreeProvider implements vscode.TreeDataProvider<CollectionTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<CollectionTreeItem | undefined | null | void> = 
    new vscode.EventEmitter<CollectionTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<CollectionTreeItem | undefined | null | void> = 
    this._onDidChangeTreeData.event;

  constructor(private collectionManager: CollectionManager) {
    // Listen to collection manager events
    this.collectionManager.onCollectionCreated(() => this.refresh());
    this.collectionManager.onCollectionUpdated(() => this.refresh());
    this.collectionManager.onCollectionDeleted(() => this.refresh());
    this.collectionManager.onCollectionMoved(() => this.refresh());

    logger.info('[CollectionTreeProvider] Initialized');
  }

  refresh(): void {
    logger.debug('[CollectionTreeProvider] Refreshing tree view');
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CollectionTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: CollectionTreeItem): Promise<CollectionTreeItem[]> {
    if (!element) {
      // Root level - return all root collections
      const rootCollections = this.collectionManager.getRootCollections();
      logger.debug(`[CollectionTreeProvider] Found ${rootCollections.length} root collections`);
      
      return rootCollections.map(collection => 
        new CollectionTreeItem(
          collection,
          this.hasChildren(collection) 
            ? vscode.TreeItemCollapsibleState.Collapsed 
            : vscode.TreeItemCollapsibleState.None,
          collection.type === 'folder' ? 'folder' : 'collection'
        )
      );
    } else {
      // Child level - return items in collection/folder
      const item = element.item;
      
      if (this.isCollection(item)) {
        const items = item.items || [];
        logger.debug(`[CollectionTreeProvider] Collection ${item.name} has ${items.length} items`);
        
        return items.map(childItem => {
          const isRequest = this.isRequest(childItem);
          const isFolder = !isRequest && (childItem as Collection).type === 'folder';
          const itemType = isRequest ? 'request' : (isFolder ? 'folder' : 'collection');
          
          return new CollectionTreeItem(
            childItem,
            isRequest ? vscode.TreeItemCollapsibleState.None : 
              (this.hasChildren(childItem as Collection) 
                ? vscode.TreeItemCollapsibleState.Collapsed 
                : vscode.TreeItemCollapsibleState.None),
            itemType
          );
        });
      }
      
      return [];
    }
  }

  getParent(element: CollectionTreeItem): vscode.ProviderResult<CollectionTreeItem> {
    const item = element.item;
    
    if ('parentId' in item && item.parentId) {
      const parent = this.collectionManager.getCollection(item.parentId);
      if (parent) {
        return new CollectionTreeItem(
          parent,
          vscode.TreeItemCollapsibleState.Collapsed,
          parent.type === 'folder' ? 'folder' : 'collection'
        );
      }
    }
    
    return null;
  }

  private isCollection(item: Collection | Request): item is Collection {
    return 'items' in item;
  }

  private isRequest(item: Collection | Request): item is Request {
    return 'method' in item;
  }

  private hasChildren(collection: Collection): boolean {
    return collection.items && collection.items.length > 0;
  }
}
