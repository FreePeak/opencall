import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getDatabase } from '../storage/database';
import { getCollectionRepository } from '../storage/collection-repository';
import { getRequestRepository } from '../storage/request-repository';
import { getEnvironmentRepository } from '../storage/environment-repository';
import { logger } from '../utils/logger';
import { Collection, Environment } from '../types';

/**
 * Export format for OpenCall collections
 */
export interface OpenCallExport {
  version: string;
  exportedAt: string;
  collections: Collection[];
  environments?: Environment[];
}

/**
 * Export/Import service for sharing configurations
 */
export class ExportImportService {
  /**
   * Export a collection to a JSON file
   */
  async exportCollection(collectionId: string): Promise<void> {
    try {
      const collectionRepo = getCollectionRepository();
      const requestRepo = getRequestRepository();
      const environmentRepo = getEnvironmentRepository();

      const collection = await collectionRepo.getById(collectionId);
      if (!collection) {
        throw new Error(`Collection not found: ${collectionId}`);
      }

      // Get all requests in this collection
      const requests = await requestRepo.getByCollection(collectionId);

      // Build export data
      const exportData: OpenCallExport = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        collections: [collection],
      };

      // Optionally include environments
      const environments = await environmentRepo.getAll();
      if (environments.length > 0) {
        exportData.environments = environments;
      }

      // Let user choose save location
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${collection.name}.opencall.json`),
        filters: {
          'OpenCall Export': ['opencall.json', 'json'],
          'JSON': ['json'],
        },
        saveLabel: 'Export Collection',
      });

      if (uri) {
        await fs.promises.writeFile(uri.fsPath!, JSON.stringify(exportData, null, 2));
        vscode.window.showInformationMessage(`Collection exported to: ${uri.fsPath}`);
        logger.info(`[ExportImport] Exported collection: ${collectionId} to ${uri.fsPath}`);
      }
    } catch (error) {
      logger.error(`[ExportImport] Failed to export collection: ${collectionId}`, error);
      vscode.window.showErrorMessage(`Failed to export collection: ${error}`);
    }
  }

  /**
   * Export all data (collections, requests, environments)
   */
  async exportAll(): Promise<void> {
    try {
      const db = getDatabase();
      const data = await db.exportData();

      const exportData: OpenCallExport = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        collections: data.collections,
        environments: data.environments,
      };

      // Let user choose save location
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`opencall-backup-${Date.now()}.json`),
        filters: {
          'OpenCall Backup': ['json'],
        },
        saveLabel: 'Export All Data',
      });

      if (uri) {
        await fs.promises.writeFile(uri.fsPath!, JSON.stringify(exportData, null, 2));
        vscode.window.showInformationMessage(`Data exported to: ${uri.fsPath}`);
        logger.info(`[ExportImport] Exported all data to ${uri.fsPath}`);
      }
    } catch (error) {
      logger.error('[ExportImport] Failed to export all data', error);
      vscode.window.showErrorMessage(`Failed to export data: ${error}`);
    }
  }

  /**
   * Import a collection from a JSON file
   */
  async importCollection(): Promise<void> {
    try {
      // Let user choose file to import
      const uri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'OpenCall Export': ['opencall.json', 'json'],
          'Postman Collection': ['json'],
          'All Files': ['*'],
        },
        openLabel: 'Import Collection',
      });

      if (uri && uri[0]) {
        const filePath = uri[0].fsPath!;
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        // Detect format and import accordingly
        if (this.isOpenCallExport(data)) {
          await this.importOpenCallFormat(data);
        } else if (this.isPostmanCollection(data)) {
          await this.importPostmanFormat(data);
        } else {
          throw new Error('Unknown file format');
        }

        vscode.window.showInformationMessage(`Collection imported from: ${filePath}`);
        logger.info(`[ExportImport] Imported collection from ${filePath}`);
      }
    } catch (error) {
      logger.error('[ExportImport] Failed to import collection', error);
      vscode.window.showErrorMessage(`Failed to import collection: ${error}`);
    }
  }

  /**
   * Import OpenCall format
   */
  private async importOpenCallFormat(data: OpenCallExport): Promise<void> {
    const db = getDatabase();

    // Import collections
    if (data.collections && data.collections.length > 0) {
      for (const collection of data.collections) {
        const collectionRepo = getCollectionRepository();
        const allCollections = await collectionRepo.getAll();
        const existing = allCollections.find(c => c.name === collection.name);
        if (existing) {
          // Ask user what to do
          const action = await vscode.window.showQuickPick(
            ['Skip', 'Overwrite', 'Rename'],
            {
              placeHolder: `Collection "${collection.name}" already exists. What to do?`
            }
          );

          if (action === 'Skip') {
            continue;
          } else if (action === 'Overwrite') {
            await collectionRepo.delete(existing.id);
          } else if (action === 'Rename') {
            const newName = await vscode.window.showInputBox({
              placeHolder: 'Enter new name',
              value: `${collection.name} (imported)`,
            });
            if (newName) {
              collection.name = newName;
            }
          }
        }
      }

      await db.importData({ collections: data.collections });
    }

    // Import environments
    if (data.environments && data.environments.length > 0) {
      await db.importData({ environments: data.environments });
    }
  }

  /**
   * Import Postman collection format
   * NOTE: This is a basic implementation. Full Postman support requires more work.
   */
  private async importPostmanFormat(data: any): Promise<void> {
    const collectionRepo = getCollectionRepository();
    const requestRepo = getRequestRepository();

    // Basic Postman v2.1 collection import
    if (data.info && data.item) {
      const collectionName = data.info.name || 'Imported Collection';
      const collection: Collection = {
        id: this.generateId(),
        name: collectionName,
        description: data.info.description,
        parentId: undefined,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await collectionRepo.create(collection);

      // TODO: Parse requests from data.item and create them
      // This is a simplified version - full implementation needed
      logger.info(`[ExportImport] Imported Postman collection: ${collectionName}`);
      vscode.window.showWarningMessage('Postman collection imported in basic mode. Request items not yet supported.');
    }
  }

  /**
   * Check if data is OpenCall export format
   */
  private isOpenCallExport(data: any): data is OpenCallExport {
    return data && data.version && data.collections && Array.isArray(data.collections);
  }

  /**
   * Check if data is Postman collection format
   */
  private isPostmanCollection(data: any): boolean {
    return data && data.info && (data.info.schema === 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' || data.item);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export collection to Postman format (for sharing with Postman users)
   */
  async exportToPostman(collectionId: string): Promise<void> {
    try {
      const collectionRepo = getCollectionRepository();
      const requestRepo = getRequestRepository();

      const collection = await collectionRepo.getById(collectionId);
      if (!collection) {
        throw new Error(`Collection not found: ${collectionId}`);
      }

      const requests = await requestRepo.getByCollection(collectionId);

      // Build Postman v2.1 collection format
      const postmanCollection = {
        info: {
          name: collection.name,
          description: collection.description,
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: await this.buildPostmanItems(collection, requests),
      };

      // Let user choose save location
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${collection.name}.postman.json`),
        filters: {
          'Postman Collection': ['json'],
        },
        saveLabel: 'Export to Postman Format',
      });

      if (uri) {
        await fs.promises.writeFile(uri.fsPath!, JSON.stringify(postmanCollection, null, 2));
        vscode.window.showInformationMessage(`Collection exported to Postman format: ${uri.fsPath}`);
        logger.info(`[ExportImport] Exported collection to Postman format: ${collectionId}`);
      }
    } catch (error) {
      logger.error(`[ExportImport] Failed to export to Postman: ${collectionId}`, error);
      vscode.window.showErrorMessage(`Failed to export to Postman: ${error}`);
    }
  }

  /**
   * Build Postman items from collection
   */
  private async buildPostmanItems(collection: Collection, requests: any[]): Promise<any[]> {
    const items: any[] = [];

    for (const request of requests) {
      items.push({
        name: request.name,
        request: {
          method: request.method,
          header: request.headers?.map((h: any) => ({
            key: h.key,
            value: h.value,
            description: h.description,
          })) || [],
          url: request.url,
          description: request.description,
        },
      });
    }

    return items;
  }

  /**
   * Export collection to OpenAPI/Swagger format
   */
  async exportToOpenAPI(collectionId: string): Promise<void> {
    try {
      const collectionRepo = getCollectionRepository();
      const requestRepo = getRequestRepository();

      const collection = await collectionRepo.getById(collectionId);
      if (!collection) {
        throw new Error(`Collection not found: ${collectionId}`);
      }

      const requests = await requestRepo.getByCollection(collectionId);

      // Build basic OpenAPI 3.0 spec
      const openapiSpec = {
        openapi: '3.0.0',
        info: {
          title: collection.name,
          description: collection.description,
          version: '1.0.0',
        },
        paths: this.buildOpenAPIPaths(requests),
      };

      // Let user choose save location
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${collection.name}.openapi.json`),
        filters: {
          'OpenAPI Spec': ['json', 'yaml'],
        },
        saveLabel: 'Export to OpenAPI Format',
      });

      if (uri) {
        await fs.promises.writeFile(uri.fsPath!, JSON.stringify(openapiSpec, null, 2));
        vscode.window.showInformationMessage(`Collection exported to OpenAPI format: ${uri.fsPath}`);
        logger.info(`[ExportImport] Exported collection to OpenAPI format: ${collectionId}`);
      }
    } catch (error) {
      logger.error(`[ExportImport] Failed to export to OpenAPI: ${collectionId}`, error);
      vscode.window.showErrorMessage(`Failed to export to OpenAPI: ${error}`);
    }
  }

  /**
   * Build OpenAPI paths from requests
   */
  private buildOpenAPIPaths(requests: any[]): any {
    const paths: any = {};

    for (const request of requests) {
      // Try to parse URL as a path
      // This is a simplified implementation
      const path = request.url.replace(/https?:\/\/[^\/]+/, '') || '/';
      const method = request.method.toLowerCase();

      if (!paths[path]) {
        paths[path] = {};
      }

      paths[path][method] = {
        summary: request.name,
        description: request.description,
        parameters: [],
        responses: {
          '200': {
            description: 'Success',
          },
        },
      };
    }

    return paths;
  }
}

// Global export/import service instance
let exportImportServiceInstance: ExportImportService | null = null;

/**
 * Get the global export/import service instance
 */
export function getExportImportService(): ExportImportService {
  if (!exportImportServiceInstance) {
    exportImportServiceInstance = new ExportImportService();
  }
  return exportImportServiceInstance;
}
