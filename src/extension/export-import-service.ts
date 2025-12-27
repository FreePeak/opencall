import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getStorageManager } from '../storage/storage-manager';
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
      const storage = getStorageManager();
      
      const collections = await storage.getCollections();
      const collection = collections.find(c => c.id === collectionId);
      
      if (!collection) {
        throw new Error(`Collection not found: ${collectionId}`);
      }

      // Get all requests in this collection
      const requests = await storage.getRequests();
      const collectionRequests = requests.filter(req => req.collectionId === collectionId);

      // Build export data with collection and its requests
      const exportData: OpenCallExport = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        collections: [{
          ...collection,
          items: collectionRequests
        }],
      };

      // Optionally include environments
      const environments = await storage.getEnvironments();
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
   * Export all data to a JSON file
   */
  async exportAll(): Promise<void> {
    try {
      const storage = getStorageManager();
      const data = await storage.exportData();

      // Let user choose save location
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('opencall-backup.json'),
        filters: {
          'OpenCall Backup': ['json'],
          'JSON': ['json'],
        },
        saveLabel: 'Export All Data',
      });

      if (uri) {
        await fs.promises.writeFile(uri.fsPath!, JSON.stringify(data, null, 2));
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
      const uri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Import Collection',
        filters: {
          'OpenCall Export': ['opencall.json', 'json'],
          'JSON': ['json'],
        },
      });

      if (uri) {
        const filePath = uri[0].fsPath!;
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const importData: OpenCallExport = JSON.parse(fileContent);

        const storage = getStorageManager();

        // Import collections
        if (importData.collections) {
          for (const collection of importData.collections) {
            await storage.saveCollection(collection);
          }
        }

        // Import environments
        if (importData.environments) {
          for (const environment of importData.environments) {
            await storage.saveEnvironment(environment);
          }
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
   * Import Postman collection
   */
  async importPostmanCollection(): Promise<void> {
    try {
      const uri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Import Postman Collection',
        filters: {
          'Postman Collection': ['json'],
          'JSON': ['json'],
        },
      });

      if (uri) {
        const filePath = uri[0].fsPath!;
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        const postmanData = JSON.parse(fileContent);

        // Convert Postman collection to OpenCall format
        const collection: Collection = {
          id: `postman-${Date.now()}`,
          name: postmanData.info?.name || 'Imported Postman Collection',
          description: postmanData.info?.description || 'Imported from Postman',
          parentId: undefined,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const storage = getStorageManager();
        await storage.saveCollection(collection);

        // TODO: Parse requests from data.item and create them
        // This is a simplified version - full implementation needed
        logger.info(`[ExportImport] Imported Postman collection: ${collection.name}`);
        vscode.window.showWarningMessage('Postman collection imported in basic mode. Request items not yet supported.');
      }
    } catch (error) {
      logger.error('[ExportImport] Failed to import Postman collection', error);
      vscode.window.showErrorMessage(`Failed to import Postman collection: ${error}`);
    }
  }

  /**
   * Export collection to Postman format
   */
  async exportToPostman(collectionId: string): Promise<void> {
    try {
      const storage = getStorageManager();
      
      const collections = await storage.getCollections();
      const collection = collections.find(c => c.id === collectionId);
      
      if (!collection) {
        throw new Error(`Collection not found: ${collectionId}`);
      }

      const requests = await storage.getRequests();
      const collectionRequests = requests.filter(req => req.collectionId === collectionId);

      // Convert to Postman format
      const postmanCollection = {
        info: {
          name: collection.name,
          description: collection.description,
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        item: collectionRequests.map(req => ({
          name: req.name,
          request: {
            method: req.method,
            header: req.headers ? Object.entries(req.headers).map(([key, value]) => ({
              key,
              value: String(value)
            })) : [],
            url: req.url,
            body: req.body ? {
              mode: "raw",
              raw: typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
            } : undefined
          }
        }))
      };

      // Let user choose save location
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${collection.name}.postman_collection.json`),
        filters: {
          'Postman Collection': ['json'],
          'JSON': ['json'],
        },
        saveLabel: 'Export to Postman',
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
   * Export collection to OpenAPI format
   */
  async exportToOpenAPI(collectionId: string): Promise<void> {
    try {
      const storage = getStorageManager();
      
      const collections = await storage.getCollections();
      const collection = collections.find(c => c.id === collectionId);
      
      if (!collection) {
        throw new Error(`Collection not found: ${collectionId}`);
      }

      const requests = await storage.getRequests();
      const collectionRequests = requests.filter(req => req.collectionId === collectionId);

      // Convert to OpenAPI format
      const openapiSpec = {
        openapi: "3.0.0",
        info: {
          title: collection.name,
          description: collection.description,
          version: "1.0.0"
        },
        paths: {} as Record<string, any>
      };

      // Group requests by URL and method
      collectionRequests.forEach(req => {
        if (!openapiSpec.paths[req.url]) {
          openapiSpec.paths[req.url] = {};
        }
        
        openapiSpec.paths[req.url][req.method.toLowerCase()] = {
          summary: req.name,
          description: req.description,
          parameters: [],
          responses: {
            '200': {
              description: 'Success'
            }
          }
        };
      });

      // Let user choose save location
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${collection.name}.openapi.json`),
        filters: {
          'OpenAPI Spec': ['json'],
          'JSON': ['json'],
        },
        saveLabel: 'Export to OpenAPI',
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
}

let exportImportService: ExportImportService | null = null;

export function getExportImportService(): ExportImportService {
  if (!exportImportService) {
    exportImportService = new ExportImportService();
  }
  return exportImportService;
}
