import * as vscode from 'vscode';
import { Request, Response, RequestExecution, EnvironmentVariable } from '../types';
import { logger } from '../utils/logger';
import { generateId, deepClone, substituteVariables } from '../utils/helpers';
import { RestClient, RequestConfig } from '../api';

export interface RequestManagerOptions {
  maxConcurrentRequests?: number;
  defaultTimeout?: number;
  historySize?: number;
}

export class RequestManager {
  private restClient: RestClient;
  private requests: Map<string, Request> = new Map();
  private executions: Map<string, RequestExecution> = new Map();
  private history: RequestExecution[] = [];
  private activeRequests: Set<string> = new Set();
  private options: RequestManagerOptions;
  private disposables: vscode.Disposable[] = [];

  // Events
  private _onRequestExecuted = new vscode.EventEmitter<RequestExecution>();
  private _onRequestCompleted = new vscode.EventEmitter<RequestExecution>();
  private _onRequestFailed = new vscode.EventEmitter<RequestExecution>();

  constructor(options: RequestManagerOptions = {}) {
    this.options = {
      maxConcurrentRequests: 10,
      defaultTimeout: 30000,
      historySize: 1000,
      ...options
    };

    this.restClient = new RestClient({
      timeout: this.options.defaultTimeout
    });
  }

  get onRequestExecuted(): vscode.Event<RequestExecution> {
    return this._onRequestExecuted.event;
  }

  get onRequestCompleted(): vscode.Event<RequestExecution> {
    return this._onRequestCompleted.event;
  }

  get onRequestFailed(): vscode.Event<RequestExecution> {
    return this._onRequestFailed.event;
  }

  async createRequest(
    name: string,
    method: string,
    url: string,
    collectionId?: string
  ): Promise<Request> {
    const request: Request = {
      id: generateId(),
      name,
      description: '',
      method: method as any,
      url,
      headers: [],
      body: undefined,
      auth: { type: 'none' },
      tests: [],
      collectionId,
      folderId: undefined,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.requests.set(request.id, request);
    this.saveRequest(request);

    logger.info(`Created new request: ${name} (${request.method} ${url})`);
    return request;
  }

  async updateRequest(requestId: string, updates: Partial<Request>): Promise<Request | null> {
    const request = this.requests.get(requestId);
    if (!request) {
      logger.warn(`Request not found: ${requestId}`);
      return null;
    }

    const updatedRequest = { ...request, ...updates, updatedAt: new Date() };
    this.requests.set(requestId, updatedRequest);
    this.saveRequest(updatedRequest);

    logger.info(`Updated request: ${updatedRequest.name}`);
    return updatedRequest;
  }

  async deleteRequest(requestId: string): Promise<boolean> {
    const request = this.requests.get(requestId);
    if (!request) {
      logger.warn(`Request not found: ${requestId}`);
      return false;
    }

    this.requests.delete(requestId);
    this.activeRequests.delete(requestId);

    // Clean up executions for this request
    for (const [id, execution] of this.executions) {
      if (execution.requestId === requestId) {
        this.executions.delete(id);
      }
    }

    await this.deleteRequestData(requestId);

    logger.info(`Deleted request: ${request.name}`);
    return true;
  }

  getRequest(requestId: string): Request | null {
    return this.requests.get(requestId) || null;
  }

  getAllRequests(): Request[] {
    return Array.from(this.requests.values());
  }

  getRequestsByCollection(collectionId: string): Request[] {
    return Array.from(this.requests.values()).filter(
      request => request.collectionId === collectionId
    );
  }

  async sendRequest(
    requestId: string,
    environment?: EnvironmentVariable[],
    additionalVars?: Record<string, string>
  ): Promise<RequestExecution> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    // Check concurrent request limit
    if (this.activeRequests.size >= this.options.maxConcurrentRequests!) {
      throw new Error(`Maximum concurrent requests (${this.options.maxConcurrentRequests}) reached`);
    }

    // Add to active requests
    this.activeRequests.add(requestId);

    try {
      logger.info(`Executing request: ${request.name} (${request.method} ${request.url})`);

      const config: RequestConfig = {
        request,
        environment,
        additionalVars
      };

      const execution = await this.restClient.sendRequest(config);

      // Update request metadata
      await this.updateRequest(requestId, {
        lastSentAt: new Date()
      });

      // Store execution
      this.executions.set(execution.id, execution);
      this.addToHistory(execution);

      // Emit events
      this._onRequestExecuted.fire(execution);

      if (execution.status === 'completed') {
        this._onRequestCompleted.fire(execution);
        logger.info(`Request completed successfully: ${request.name}`);
      } else {
        this._onRequestFailed.fire(execution);
        logger.error(`Request failed: ${request.name}`, execution.error);
      }

      return execution;

    } finally {
      // Remove from active requests
      this.activeRequests.delete(requestId);
    }
  }

  async cancelRequest(requestId: string): Promise<boolean> {
    if (!this.activeRequests.has(requestId)) {
      return false;
    }

    // Note: Axios doesn't provide built-in cancellation in the simple API
    // In a real implementation, we would use AbortController or CancelToken
    this.activeRequests.delete(requestId);

    logger.info(`Cancelled request: ${requestId}`);
    return true;
  }

  getExecution(executionId: string): RequestExecution | null {
    return this.executions.get(executionId) || null;
  }

  getExecutionsByRequest(requestId: string): RequestExecution[] {
    return Array.from(this.executions.values())
      .filter(execution => execution.requestId === requestId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  getHistory(): RequestExecution[] {
    return [...this.history];
  }

  getActiveRequests(): string[] {
    return Array.from(this.activeRequests);
  }

  private addToHistory(execution: RequestExecution): void {
    this.history.unshift(execution);

    // Trim history if it exceeds the limit
    if (this.history.length > this.options.historySize!) {
      this.history = this.history.slice(0, this.options.historySize);
    }
  }

  private async saveRequest(request: Request): Promise<void> {
    try {
      // Save to VSCode workspace state or extension storage
      const context = vscode.extensions.getExtension('opencall.opencall')?.extensionContext;
      if (context) {
        const requests = this.getAllRequests();
        await context.globalState.update('opencall.requests', requests);
      }
    } catch (error) {
      logger.error('Failed to save request', error);
    }
  }

  private async deleteRequestData(requestId: string): Promise<void> {
    try {
      const context = vscode.extensions.getExtension('opencall.opencall')?.extensionContext;
      if (context) {
        const requests = this.getAllRequests().filter(r => r.id !== requestId);
        await context.globalState.update('opencall.requests', requests);
      }
    } catch (error) {
      logger.error('Failed to delete request data', error);
    }
  }

  async loadRequests(): Promise<void> {
    try {
      const context = vscode.extensions.getExtension('opencall.opencall')?.extensionContext;
      if (context) {
        const requests = context.globalState.get<Request[]>('opencall.requests', []);
        this.requests.clear();
        requests.forEach(request => {
          this.requests.set(request.id, request);
        });

        logger.info(`Loaded ${requests.length} requests from storage`);
      }
    } catch (error) {
      logger.error('Failed to load requests', error);
    }
  }

  cloneRequest(requestId: string, newName?: string): Request | null {
    const originalRequest = this.requests.get(requestId);
    if (!originalRequest) {
      return null;
    }

    const clonedRequest: Request = {
      ...deepClone(originalRequest),
      id: generateId(),
      name: newName || `${originalRequest.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSentAt: undefined // Reset last sent time
    };

    this.requests.set(clonedRequest.id, clonedRequest);
    this.saveRequest(clonedRequest);

    logger.info(`Cloned request: ${originalRequest.name} -> ${clonedRequest.name}`);
    return clonedRequest;
  }

  duplicateToEnvironment(requestId: string, targetEnvId: string): Request | null {
    const originalRequest = this.requests.get(requestId);
    if (!originalRequest) {
      return null;
    }

    // Create a copy with environment-specific modifications
    const duplicatedRequest: Request = {
      ...deepClone(originalRequest),
      id: generateId(),
      name: `${originalRequest.name} [${targetEnvId}]`,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSentAt: undefined
    };

    this.requests.set(duplicatedRequest.id, duplicatedRequest);
    this.saveRequest(duplicatedRequest);

    logger.info(`Duplicated request to environment: ${originalRequest.name} -> ${targetEnvId}`);
    return duplicatedRequest;
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}