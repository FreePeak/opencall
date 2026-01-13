/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import * as vscode from "vscode";

import { COLLECTION, COMMAND, MESSAGE } from "./constants";
import ExtentionStateManager from "./ExtensionStateManger";
import MainWebViewPanel from "./MainWebViewPanel";
import SidebarWebViewPanel from "./SidebarWebViewPanel";
import { initStorageManager, closeStorageManager, getStorageManager } from "../storage";
import { getConfigurationManager, disposeConfigurationManager } from "../core/configuration-manager";
import { logger } from "../utils/logger";
import { RequestManager } from "../core/request-manager";
import { CollectionManager } from "../core/collection-manager";
import { EnvironmentManager } from "../core/environment-manager";
import { TeamManager } from "../core/team-manager";
import { P2PSyncService } from "../core/p2p-sync-service";
import { LocalDiscoveryService } from "../core/local-discovery-service";
import ServiceRegistry from "./ServiceRegistry";
import RequestHandler from "./handlers/request-handler";
import CollectionHandler from "./handlers/collection-handler";
import EnvironmentHandler from "./handlers/environment-handler";

export async function activate(context: vscode.ExtensionContext) {
  logger.info("[Extension] Activating OpenCall extension...");

  // Initialize persistent storage manager (GlobalState-based)
  try {
    await initStorageManager(context);
    logger.info("[Extension] Storage manager initialized successfully");
  } catch (error) {
    logger.error("[Extension] Failed to initialize storage manager", error);
    vscode.window.showErrorMessage("Failed to initialize OpenCall storage. Some features may not work.");
  }

  const storageManager = getStorageManager();

  // Initialize core services
  const requestManager = new RequestManager({
    maxConcurrentRequests: 10,
    defaultTimeout: 30000,
    historySize: 1000
  });
  logger.info("[Extension] Request manager initialized");

  const collectionManager = new CollectionManager({
    maxCollections: 1000,
    maxItemsPerCollection: 10000
  });
  logger.info("[Extension] Collection manager initialized");

  const environmentManager = new EnvironmentManager({
    maxEnvironments: 50,
    maxVariablesPerEnvironment: 1000
  });
  logger.info("[Extension] Environment manager initialized");

  const teamManager = new TeamManager();
  logger.info("[Extension] Team manager initialized");

  const p2pSyncService = new P2PSyncService();
  logger.info("[Extension] P2P sync service initialized");

  const localDiscoveryService = new LocalDiscoveryService();
  logger.info("[Extension] Local discovery service initialized");

  // Register all services in ServiceRegistry
  const registry = ServiceRegistry.getInstance();
  registry.registerStorageManager(storageManager);
  registry.registerRequestManager(requestManager);
  registry.registerCollectionManager(collectionManager);
  registry.registerEnvironmentManager(environmentManager);
  registry.registerTeamManager(teamManager);
  registry.registerP2PSyncService(p2pSyncService);
  registry.registerLocalDiscoveryService(localDiscoveryService);
  logger.info("[Extension] All services registered in ServiceRegistry");

  // Initialize handlers
  const requestHandler = new RequestHandler();
  const collectionHandler = new CollectionHandler();
  const environmentHandler = new EnvironmentHandler();
  logger.info("[Extension] Handlers initialized");

  // Initialize configuration manager
  const configManager = getConfigurationManager();
  logger.info("[Extension] Configuration manager initialized");

  // Set extension context to enabled
  await vscode.commands.executeCommand("setContext", "opencall:enabled", true);
  logger.info("[Extension] Set context: opencall:enabled = true");

  const StateManager = new ExtentionStateManager(context);
  const SidebarWebViewProvider = new SidebarWebViewPanel(
    context.extensionUri,
    StateManager,
    storageManager,
    collectionManager,
    environmentManager,
  );
  const MainWebViewProvider = new MainWebViewPanel(
    context.extensionUri,
    StateManager,
    SidebarWebViewProvider,
    requestManager,
    storageManager,
  );
  let currentPanel: vscode.WebviewPanel | null = null;

  // Initialize default collections if they don't exist
  if (!StateManager.getExtensionContext(COLLECTION.HISTORY_COLLECTION)) {
    await StateManager.addExtensionContext(COLLECTION.HISTORY_COLLECTION, {
      history: [],
    });
  }

  if (!StateManager.getExtensionContext(COLLECTION.FAVORITES_COLLECTION)) {
    await StateManager.addExtensionContext(COLLECTION.FAVORITES_COLLECTION, {
      history: [],
    });
  }

  vscode.window.showInformationMessage(MESSAGE.WELCOME_MESSAGE);

  // Register webview view provider for sidebar
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      COMMAND.SIDEBAR_WEB_VIEW_PANEL,
      SidebarWebViewProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  // Helper function to open/focus the main webview panel
  const openMainPanel = () => {
    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.One);
    } else {
      currentPanel = MainWebViewProvider.initializeWebView();
      SidebarWebViewProvider.mainWebViewPanel = MainWebViewProvider.mainPanel;

      if (MainWebViewProvider.mainPanel) {
        MainWebViewProvider.mainPanel.onDidDispose(() => {
          SidebarWebViewProvider.mainWebViewPanel = null;
          currentPanel = null;
        }, null);
      }
    }
  };

  // Register opencall.open command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.open", openMainPanel),
  );
  logger.info("[Extension] Registered command: opencall.open");

  // Register opencall.createRequest command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.createRequest", async () => {
      await requestHandler.handleCreateRequest();
    }),
  );
  logger.info("[Extension] Registered command: opencall.createRequest");

  // Register opencall.newRequest command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.newRequest", async () => {
      await requestHandler.handleCreateRequest();
      openMainPanel();
    }),
  );
  logger.info("[Extension] Registered command: opencall.newRequest");

  // Register opencall.sendRequest command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.sendRequest", async (requestId: string) => {
      logger.info("[Extension] opencall.sendRequest command triggered", requestId);
      await requestHandler.handleSendRequest(requestId);
    }),
  );
  logger.info("[Extension] Registered command: opencall.sendRequest");

  // Register opencall.saveRequest command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.saveRequest", async (request: any) => {
      logger.info("[Extension] opencall.saveRequest command triggered");
      await requestHandler.handleSaveRequest(request);
    }),
  );
  logger.info("[Extension] Registered command: opencall.saveRequest");

  // Register opencall.deleteRequest command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.deleteRequest", async (requestId: string) => {
      logger.info("[Extension] opencall.deleteRequest command triggered", requestId);
      await requestHandler.handleDeleteRequest(requestId);
    }),
  );
  logger.info("[Extension] Registered command: opencall.deleteRequest");

  // Register opencall.refreshExplorer command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.refreshExplorer", async () => {
      logger.info("[Extension] opencall.refreshExplorer command triggered");
      vscode.window.showInformationMessage("Collections refreshed!");
    }),
  );
  logger.info("[Extension] Registered command: opencall.refreshExplorer");

  // Register opencall.createCollection command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.createCollection", async () => {
      await collectionHandler.handleCreateCollection();
    }),
  );
  logger.info("[Extension] Registered command: opencall.createCollection");

  // Register opencall.importCollection command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.importCollection", async () => {
      await collectionHandler.handleImportCollection();
    }),
  );
  logger.info("[Extension] Registered command: opencall.importCollection");

  // Register opencall.exportCollection command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.exportCollection", async (collectionId: string) => {
      logger.info("[Extension] opencall.exportCollection command triggered", collectionId);
      await collectionHandler.handleExportCollection(collectionId);
    }),
  );
  logger.info("[Extension] Registered command: opencall.exportCollection");

  // Register opencall.deleteCollection command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.deleteCollection", async (collectionId: string) => {
      logger.info("[Extension] opencall.deleteCollection command triggered", collectionId);
      await collectionHandler.handleDeleteCollection(collectionId);
    }),
  );
  logger.info("[Extension] Registered command: opencall.deleteCollection");

  // Register opencall.createEnvironment command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.createEnvironment", async () => {
      await environmentHandler.handleCreateEnvironment();
    }),
  );
  logger.info("[Extension] Registered command: opencall.createEnvironment");

  // Register opencall.switchEnvironment command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.switchEnvironment", async (environmentId: string) => {
      logger.info("[Extension] opencall.switchEnvironment command triggered", environmentId);
      await environmentHandler.handleSwitchEnvironment(environmentId);
    }),
  );
  logger.info("[Extension] Registered command: opencall.switchEnvironment");

  // Register opencall.editEnvironment command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.editEnvironment", async (environmentId: string) => {
      logger.info("[Extension] opencall.editEnvironment command triggered", environmentId);
      await environmentHandler.handleEditEnvironment(environmentId);
    }),
  );
  logger.info("[Extension] Registered command: opencall.editEnvironment");

  // Register opencall.deleteEnvironment command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.deleteEnvironment", async (environmentId: string) => {
      logger.info("[Extension] opencall.deleteEnvironment command triggered", environmentId);
      await environmentHandler.handleDeleteEnvironment(environmentId);
    }),
  );
  logger.info("[Extension] Registered command: opencall.deleteEnvironment");

  logger.info("[Extension] OpenCall extension activated successfully!");
}

export function deactivate(): void {
  logger.info("[Extension] Deactivating OpenCall extension...");

  // Close configuration manager
  disposeConfigurationManager();

  // Ensure storage manager is properly closed when extension deactivates
  closeStorageManager();

  // Dispose of request manager
  const registry = ServiceRegistry.getInstance();
  try {
    const requestManager = registry.getRequestManager();
    requestManager.dispose();
  } catch (error) {
    logger.error("[Extension] Error disposing RequestManager", error);
  }

  logger.info("[Extension] OpenCall extension deactivated");
}
