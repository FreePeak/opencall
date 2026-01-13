import * as vscode from 'vscode';
import { Request, RequestExecution } from '../../types';
import ServiceRegistry from '../ServiceRegistry';
import { logger } from '../../utils/logger';

/**
 * Request Handler
 * Handles all request-related operations
 */
export class RequestHandler {
  private requestManager;
  private storageManager;

  constructor() {
    const registry = ServiceRegistry.getInstance();
    this.requestManager = registry.getRequestManager();
    this.storageManager = registry.getStorageManager();
  }

  /**
   * Create a new request
   */
  async handleCreateRequest(parentId?: string): Promise<void> {
    try {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter request name',
        placeHolder: 'My Request',
      });

      if (!name) {
        return;
      }

      const method = await vscode.window.showQuickPick(
        ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        { placeHolder: 'Select HTTP method' }
      );

      if (!method) {
        return;
      }

      const url = await vscode.window.showInputBox({
        prompt: 'Enter request URL',
        placeHolder: 'https://api.example.com/endpoint',
      });

      if (!url) {
        return;
      }

      await this.requestManager.createRequest(
        name,
        method,
        url,
        parentId || 'default'
      );

      vscode.window.showInformationMessage(`Request "${name}" created successfully!`);
      logger.info(`[RequestHandler] Created request: ${name}`);

    } catch (error) {
      logger.error('[RequestHandler] Failed to create request', error);
      vscode.window.showErrorMessage(`Failed to create request: ${error}`);
    }
  }

  /**
   * Send a request
   */
  async handleSendRequest(requestId: string): Promise<RequestExecution | null> {
    try {
      const execution = await this.requestManager.sendRequest(requestId);
      return execution;

    } catch (error) {
      logger.error('[RequestHandler] Failed to send request', error);
      vscode.window.showErrorMessage(`Request failed: ${error}`);
      return null;
    }
  }

  /**
   * Save a request
   */
  async handleSaveRequest(request: Request): Promise<void> {
    try {
      await this.storageManager.saveRequest(request);
      vscode.window.showInformationMessage(`Request "${request.name}" saved successfully!`);
      logger.info(`[RequestHandler] Saved request: ${request.name}`);

    } catch (error) {
      logger.error('[RequestHandler] Failed to save request', error);
      vscode.window.showErrorMessage(`Failed to save request: ${error}`);
    }
  }

  /**
   * Delete a request
   */
  async handleDeleteRequest(requestId: string): Promise<void> {
    try {
      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to delete this request?',
        'Delete',
        'Cancel'
      );

      if (confirm !== 'Delete') {
        return;
      }

      await this.requestManager.deleteRequest(requestId);
      vscode.window.showInformationMessage('Request deleted successfully!');
      logger.info(`[RequestHandler] Deleted request: ${requestId}`);

    } catch (error) {
      logger.error('[RequestHandler] Failed to delete request', error);
      vscode.window.showErrorMessage(`Failed to delete request: ${error}`);
    }
  }

  /**
   * Duplicate a request
   */
  async handleDuplicateRequest(requestId: string): Promise<void> {
    try {
      const clonedRequest = this.requestManager.cloneRequest(requestId);

      if (!clonedRequest) {
        vscode.window.showErrorMessage('Request not found');
        return;
      }

      vscode.window.showInformationMessage(`Request duplicated: ${clonedRequest.name}`);
      logger.info(`[RequestHandler] Duplicated request: ${clonedRequest.name}`);

    } catch (error) {
      logger.error('[RequestHandler] Failed to duplicate request', error);
      vscode.window.showErrorMessage(`Failed to duplicate request: ${error}`);
    }
  }
}

export default RequestHandler;
