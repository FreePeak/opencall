import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { COMMANDS, VIEWS, CONTEXT_KEYS } from '../utils/constants';
import { getConfigurationManager, disposeConfigurationManager } from '../core/configuration-manager';
import { initDatabase, closeDatabase } from '../storage/database';
import { getExportImportService } from './export-import-service';

let extensionContext: vscode.ExtensionContext | null = null;

export function activate(context: vscode.ExtensionContext): void {
  logger.info('OpenCall extension is being activated');

  extensionContext = context;

  // Initialize configuration manager
  getConfigurationManager();

  // Initialize database
  initDatabase().catch((error) => {
    logger.error('Failed to initialize database', error);
  });

  // Set the extension context key
  vscode.commands.executeCommand('setContext', CONTEXT_KEYS.ENABLED, true);

  // Register core commands
  registerCommands(context);

  // Register tree view providers
  registerTreeViews(context);

  logger.info('OpenCall extension activated successfully');
}

export function deactivate(): void {
  logger.info('OpenCall extension is being deactivated');

  // Clean up resources
  disposeConfigurationManager();
  closeDatabase().catch((error) => {
    logger.error('Failed to close database', error);
  });
  // TODO: Clean up P2P connections
  // TODO: Stop any running processes

  extensionContext = null;
}

function registerCommands(context: vscode.ExtensionContext): void {
  // Core commands
  registerCommand(context, COMMANDS.OPEN, handleOpen);
  registerCommand(context, COMMANDS.CREATE_REQUEST, handleCreateRequest);
  registerCommand(context, COMMANDS.SEND_REQUEST, handleSendRequest);
  registerCommand(context, COMMANDS.SAVE_REQUEST, handleSaveRequest);
  registerCommand(context, COMMANDS.DELETE_REQUEST, handleDeleteRequest);

  // Collection commands
  registerCommand(context, COMMANDS.CREATE_COLLECTION, handleCreateCollection);
  registerCommand(context, COMMANDS.CREATE_FOLDER, handleCreateFolder);
  registerCommand(context, COMMANDS.DELETE_COLLECTION, handleDeleteCollection);
  registerCommand(context, COMMANDS.EXPORT_COLLECTION, handleExportCollection);
  registerCommand(context, COMMANDS.IMPORT_COLLECTION, handleImportCollection);

  // Environment commands
  registerCommand(context, COMMANDS.CREATE_ENVIRONMENT, handleCreateEnvironment);
  registerCommand(context, COMMANDS.SWITCH_ENVIRONMENT, handleSwitchEnvironment);
  registerCommand(context, COMMANDS.MANAGE_ENVIRONMENTS, handleManageEnvironments);

  // P2P commands (stubs for now)
  registerCommand(context, COMMANDS.START_P2P_SESSION, handleStartP2PSession);
  registerCommand(context, COMMANDS.JOIN_P2P_SESSION, handleJoinP2PSession);
  registerCommand(context, COMMANDS.STOP_P2P_SESSION, handleStopP2PSession);

  // gRPC commands (stubs for now)
  registerCommand(context, COMMANDS.LOAD_PROTO_FILE, handleLoadProtoFile);

  // OpenAPI commands (stubs for now)
  registerCommand(context, COMMANDS.GENERATE_FROM_OPENAPI, handleGenerateFromOpenAPI);

  // UI commands
  registerCommand(context, COMMANDS.REFRESH_EXPLORER, handleRefreshExplorer);

  logger.info('All commands registered successfully');
}

function registerTreeViews(context: vscode.ExtensionContext): void {
  // TODO: Register tree view providers
  // These will be implemented in Phase 2
  logger.info('Tree view providers registered (placeholders)');
}

function registerCommand(
  context: vscode.ExtensionContext,
  command: string,
  handler: (...args: any[]) => any
): void {
  const disposable = vscode.commands.registerCommand(command, handler);
  context.subscriptions.push(disposable);
  logger.debug(`Registered command: ${command}`);
}

// Command handlers - Core

async function handleOpen(): Promise<void> {
  logger.info('Opening OpenCall webview');
  vscode.window.showInformationMessage('OpenCall webview will be implemented in Phase 4');
}

async function handleCreateRequest(): Promise<void> {
  logger.info('Creating new request');
  vscode.window.showInformationMessage('Create request will be implemented in Phase 3');
}

async function handleSendRequest(requestId: string): Promise<void> {
  logger.info(`Sending request: ${requestId}`);
  vscode.window.showInformationMessage('Send request will be implemented in Phase 3');
}

async function handleSaveRequest(...args: any[]): Promise<void> {
  logger.info('Saving request');
  vscode.window.showInformationMessage('Save request will be implemented in Phase 3');
}

async function handleDeleteRequest(requestId: string): Promise<void> {
  logger.info(`Deleting request: ${requestId}`);
  vscode.window.showInformationMessage('Delete request will be implemented in Phase 3');
}

// Command handlers - Collections

async function handleCreateCollection(): Promise<void> {
  logger.info('Creating new collection');
  vscode.window.showInformationMessage('Create collection will be implemented in Phase 3');
}

async function handleCreateFolder(): Promise<void> {
  logger.info('Creating new folder');
  vscode.window.showInformationMessage('Create folder will be implemented in Phase 3');
}

async function handleDeleteCollection(collectionId: string): Promise<void> {
  logger.info(`Deleting collection: ${collectionId}`);
  vscode.window.showInformationMessage('Delete collection will be implemented in Phase 3');
}

async function handleExportCollection(collectionId?: string): Promise<void> {
  logger.info(`Exporting collection: ${collectionId || 'selected'}`);
  const exportImportService = getExportImportService();

  if (collectionId) {
    await exportImportService.exportCollection(collectionId);
  } else {
    // Export all collections if no specific ID provided
    await exportImportService.exportAll();
  }
}

async function handleImportCollection(): Promise<void> {
  logger.info('Importing collection');
  const exportImportService = getExportImportService();
  await exportImportService.importCollection();
}

// Command handlers - Environments

async function handleCreateEnvironment(): Promise<void> {
  logger.info('Creating new environment');
  vscode.window.showInformationMessage('Create environment will be implemented in Phase 3');
}

async function handleSwitchEnvironment(environmentId: string): Promise<void> {
  logger.info(`Switching to environment: ${environmentId}`);
  vscode.window.showInformationMessage('Switch environment will be implemented in Phase 3');
}

async function handleManageEnvironments(): Promise<void> {
  logger.info('Managing environments');
  vscode.window.showInformationMessage('Manage environments will be implemented in Phase 3');
}

// Command handlers - P2P (stubs)

async function handleStartP2PSession(): Promise<void> {
  logger.info('Starting P2P session');
  vscode.window.showInformationMessage('P2P session will be implemented in Phase 9');
}

async function handleJoinP2PSession(): Promise<void> {
  logger.info('Joining P2P session');
  vscode.window.showInformationMessage('P2P session will be implemented in Phase 9');
}

async function handleStopP2PSession(): Promise<void> {
  logger.info('Stopping P2P session');
  vscode.window.showInformationMessage('P2P session will be implemented in Phase 9');
}

// Command handlers - gRPC (stubs)

async function handleLoadProtoFile(): Promise<void> {
  logger.info('Loading proto file');
  vscode.window.showInformationMessage('gRPC support will be implemented in Phase 8');
}

// Command handlers - OpenAPI (stubs)

async function handleGenerateFromOpenAPI(): Promise<void> {
  logger.info('Generating from OpenAPI spec');
  vscode.window.showInformationMessage('OpenAPI support will be implemented in Phase 8');
}

// Command handlers - UI

async function handleRefreshExplorer(): Promise<void> {
  logger.info('Refreshing explorer');
  // TODO: Trigger tree view refresh
}

export function getExtensionContext(): vscode.ExtensionContext | null {
  return extensionContext;
}
