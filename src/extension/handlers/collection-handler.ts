import * as vscode from 'vscode';
import { Collection } from '../../types';
import ServiceRegistry from '../ServiceRegistry';
import { ExportImportService } from '../export-import-service';
import { logger } from '../../utils/logger';

/**
 * Collection Handler
 * Handles all collection-related operations
 */
export class CollectionHandler {
  private collectionManager;
  private exportImportService: ExportImportService;

  constructor() {
    const registry = ServiceRegistry.getInstance();
    this.collectionManager = registry.getCollectionManager();
    this.exportImportService = new ExportImportService();
  }

  /**
   * Create a new collection
   */
  async handleCreateCollection(): Promise<void> {
    try {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter collection name',
        placeHolder: 'My Collection',
      });

      if (!name) {
        return;
      }

      const description = await vscode.window.showInputBox({
        prompt: 'Enter collection description (optional)',
        placeHolder: 'Description...',
      });

      await this.collectionManager.createCollection(name, description || '');
      vscode.window.showInformationMessage(`Collection "${name}" created successfully!`);
      logger.info(`[CollectionHandler] Created collection: ${name}`);

    } catch (error) {
      logger.error('[CollectionHandler] Failed to create collection', error);
      vscode.window.showErrorMessage(`Failed to create collection: ${error}`);
    }
  }

  /**
   * Delete a collection
   */
  async handleDeleteCollection(collectionId: string): Promise<void> {
    try {
      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to delete this collection? All requests in this collection will also be deleted.',
        'Delete',
        'Cancel'
      );

      if (confirm !== 'Delete') {
        return;
      }

      await this.collectionManager.deleteCollection(collectionId);
      vscode.window.showInformationMessage('Collection deleted successfully!');
      logger.info(`[CollectionHandler] Deleted collection: ${collectionId}`);

    } catch (error) {
      logger.error('[CollectionHandler] Failed to delete collection', error);
      vscode.window.showErrorMessage(`Failed to delete collection: ${error}`);
    }
  }

  /**
   * Import a collection
   */
  async handleImportCollection(): Promise<void> {
    try {
      const importType = await vscode.window.showQuickPick(
        ['Postman Collection', 'OpenCall JSON'],
        { placeHolder: 'Select import format' }
      );

      if (!importType) {
        return;
      }

      switch (importType) {
        case 'Postman Collection':
          await this.exportImportService.importPostmanCollection();
          break;
        case 'OpenCall JSON':
          await this.exportImportService.importCollection();
          break;
      }

    } catch (error) {
      logger.error('[CollectionHandler] Failed to import collection', error);
      vscode.window.showErrorMessage(`Failed to import collection: ${error}`);
    }
  }

  /**
   * Export a collection
   */
  async handleExportCollection(collectionId: string): Promise<void> {
    try {
      const exportType = await vscode.window.showQuickPick(
        ['OpenCall JSON', 'Postman v2.0', 'OpenAPI 3.0'],
        { placeHolder: 'Select export format' }
      );

      if (!exportType) {
        return;
      }

      switch (exportType) {
        case 'OpenCall JSON':
          await this.exportImportService.exportCollection(collectionId);
          break;
        case 'Postman v2.0':
          await this.exportImportService.exportToPostman(collectionId);
          break;
        case 'OpenAPI 3.0':
          await this.exportImportService.exportToOpenAPI(collectionId);
          break;
      }

      vscode.window.showInformationMessage('Collection exported successfully!');
      logger.info(`[CollectionHandler] Exported collection: ${collectionId}`);

    } catch (error) {
      logger.error('[CollectionHandler] Failed to export collection', error);
      vscode.window.showErrorMessage(`Failed to export collection: ${error}`);
    }
  }

  /**
   * Rename a collection
   */
  async handleRenameCollection(collectionId: string, currentName: string): Promise<void> {
    try {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter new collection name',
        placeHolder: currentName,
      });

      if (!name || name === currentName) {
        return;
      }

      // CollectionManager.updateCollection doesn't exist, need to use different approach
      // For now, just show a message
      vscode.window.showInformationMessage('Collection renaming not yet implemented in CollectionManager');
      logger.info(`[CollectionHandler] Rename requested: ${currentName} -> ${name}`);

    } catch (error) {
      logger.error('[CollectionHandler] Failed to rename collection', error);
      vscode.window.showErrorMessage(`Failed to rename collection: ${error}`);
    }
  }
}

export default CollectionHandler;
