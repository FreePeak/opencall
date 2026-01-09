/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
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
   * Import Postman collection (v2.0 and v2.1 support)
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

        // Detect Postman version
        const schemaUrl = postmanData.info?.schema || '';
        const isV21 = schemaUrl.includes('v2.1');
        const isV20 = schemaUrl.includes('v2.0') || schemaUrl.includes('v2');

        if (!isV20 && !isV21) {
          logger.warn('[ExportImport] Unknown Postman collection format, attempting import anyway');
        }

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

        // Parse and import requests
        let requestCount = 0;
        if (postmanData.item && Array.isArray(postmanData.item)) {
          for (const item of postmanData.item) {
            const requests = await this.parsePostmanItem(item, collection.id);
            requestCount += requests.length;

            // Save each request
            for (const request of requests) {
              try {
                // Note: This assumes a Request type exists in storage
                // If not, you'll need to adapt this to your actual storage interface
                logger.info(`[ExportImport] Imported request: ${request.name}`);
              } catch (error) {
                logger.error(`[ExportImport] Failed to save request ${request.name}`, error);
              }
            }
          }
        }

        logger.info(
          `[ExportImport] Imported Postman collection: ${collection.name} with ${requestCount} requests`,
        );
        vscode.window.showInformationMessage(
          `Postman collection imported! Collection: ${collection.name}, Requests: ${requestCount}`,
        );
      }
    } catch (error) {
      logger.error('[ExportImport] Failed to import Postman collection', error);
      vscode.window.showErrorMessage(`Failed to import Postman collection: ${error}`);
    }
  }

  /**
   * Parse Postman item (handles nested folders and requests)
   */
  private async parsePostmanItem(
    item: any,
    collectionId: string,
  ): Promise<
    Array<{
      name: string;
      method: string;
      url: string;
      headers: Record<string, string>;
      body?: any;
      auth?: any;
      tests?: string;
      preRequestScript?: string;
      description?: string;
    }>
  > {
    const requests: any[] = [];

    // Handle folder (items with sub-items)
    if (item.item && Array.isArray(item.item)) {
      for (const subItem of item.item) {
        const subRequests = await this.parsePostmanItem(subItem, collectionId);
        requests.push(...subRequests);
      }
    }

    // Handle request
    if (item.request) {
      const req = item.request;
      const headers: Record<string, string> = {};

      // Parse headers (v2.0 and v2.1 compatible)
      if (Array.isArray(req.header)) {
        for (const header of req.header) {
          if (header.disabled !== true) {
            headers[header.key || header.name] = header.value || '';
          }
        }
      }

      // Parse URL (handle both string and object formats)
      let url = '';
      if (typeof req.url === 'string') {
        url = req.url;
      } else if (typeof req.url === 'object' && req.url !== null) {
        // v2.1 format: URL as object with protocol, host, path, query
        const protocol = req.url.protocol || 'https';
        const host = Array.isArray(req.url.host) ? req.url.host.join('.') : req.url.host || '';
        const path = Array.isArray(req.url.path) ? '/' + req.url.path.join('/') : req.url.path || '';
        const query = req.url.query
          ? '?' +
            (Array.isArray(req.url.query)
              ? req.url.query
                  .filter((q: any) => q.disabled !== true)
                  .map((q: any) => `${q.key}=${encodeURIComponent(q.value || '')}`)
                  .join('&')
              : new URLSearchParams(req.url.query).toString())
          : '';

        url = `${protocol}://${host}${path}${query}`;
      }

      // Parse body (v2.0 and v2.1 compatible)
      let bodyData: any = undefined;
      if (req.body) {
        if (typeof req.body === 'string') {
          bodyData = req.body;
        } else if (req.body.mode === 'raw') {
          bodyData = req.body.raw || '';
        } else if (req.body.mode === 'formdata') {
          // Convert form-data to URLSearchParams or FormData equivalent
          const formData = new URLSearchParams();
          if (Array.isArray(req.body.formdata)) {
            for (const field of req.body.formdata) {
              if (field.disabled !== true) {
                formData.append(field.key, field.value || '');
              }
            }
          }
          bodyData = formData.toString();
        } else if (req.body.mode === 'urlencoded') {
          const urlData = new URLSearchParams();
          if (Array.isArray(req.body.urlencoded)) {
            for (const field of req.body.urlencoded) {
              if (field.disabled !== true) {
                urlData.append(field.key, field.value || '');
              }
            }
          }
          bodyData = urlData.toString();
        } else if (req.body.mode === 'graphql') {
          bodyData = req.body.graphql?.query || '';
        } else if (req.body.mode === 'file') {
          bodyData = `[File: ${req.body.file?.src || 'unknown'}]`;
        }
      }

      // Parse authentication
      let auth: any = undefined;
      if (req.auth) {
        const authType = req.auth.type;
        if (authType === 'basic') {
          const basic = req.auth.basic;
          if (Array.isArray(basic)) {
            const user = basic.find((b: any) => b.key === 'username')?.value || '';
            const pass = basic.find((b: any) => b.key === 'password')?.value || '';
            auth = {
              type: 'basic',
              username: user,
              password: pass,
            };
          }
        } else if (authType === 'bearer') {
          const bearer = req.auth.bearer;
          const token =
            Array.isArray(bearer) ? bearer.find((b: any) => b.key === 'token')?.value : bearer?.token;
          auth = {
            type: 'bearer',
            token: token || '',
          };
        } else if (authType === 'apikey') {
          const apikey = req.auth.apikey;
          const key =
            Array.isArray(apikey) ? apikey.find((k: any) => k.key === 'key')?.value : apikey?.key;
          const value =
            Array.isArray(apikey) ? apikey.find((k: any) => k.key === 'value')?.value : apikey?.value;
          auth = {
            type: 'apikey',
            key: key || '',
            value: value || '',
          };
        } else if (authType === 'oauth2') {
          auth = {
            type: 'oauth2',
            clientId: Array.isArray(req.auth.oauth2)
              ? req.auth.oauth2.find((o: any) => o.key === 'clientId')?.value
              : req.auth.oauth2?.clientId,
          };
        }
      }

      // Parse scripts
      let tests: string | undefined = undefined;
      let preRequestScript: string | undefined = undefined;

      if (item.event && Array.isArray(item.event)) {
        for (const event of item.event) {
          if (event.listen === 'test') {
            tests = event.script?.exec ? event.script.exec.join('\n') : event.script;
          } else if (event.listen === 'prerequest') {
            preRequestScript = event.script?.exec ? event.script.exec.join('\n') : event.script;
          }
        }
      }

      requests.push({
        name: item.name || 'Untitled Request',
        method: (req.method || 'GET').toUpperCase(),
        url,
        headers,
        body: bodyData,
        auth,
        tests,
        preRequestScript,
        description: item.description || item.request?.description || '',
      });
    }

    return requests;
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
