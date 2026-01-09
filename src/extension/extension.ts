/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import * as vscode from "vscode";

import { COLLECTION, COMMAND, MESSAGE } from "./constants";
import ExtentionStateManager from "./ExtensionStateManger";
import MainWebViewPanel from "./MainWebViewPanel";
import SidebarWebViewPanel from "./SidebarWebViewPanel";
import { initStorageManager, closeStorageManager } from "../storage";
import { getConfigurationManager, disposeConfigurationManager } from "../core/configuration-manager";
import { logger } from "../utils/logger";

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
  );
  const MainWebViewProvider = new MainWebViewPanel(
    context.extensionUri,
    StateManager,
    SidebarWebViewProvider,
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
    vscode.commands.registerCommand("opencall.createRequest", openMainPanel),
  );
  logger.info("[Extension] Registered command: opencall.createRequest");

  // Register opencall.newRequest command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.newRequest", openMainPanel),
  );
  logger.info("[Extension] Registered command: opencall.newRequest");

  // Register opencall.sendRequest command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.sendRequest", async () => {
      logger.info("[Extension] opencall.sendRequest command triggered");
      openMainPanel();
      // TODO: Handle sending specific request from tree view context
    }),
  );
  logger.info("[Extension] Registered command: opencall.sendRequest");

  // Register opencall.refreshExplorer command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.refreshExplorer", async () => {
      logger.info("[Extension] opencall.refreshExplorer command triggered");
      // TODO: Trigger tree view refresh
    }),
  );
  logger.info("[Extension] Registered command: opencall.refreshExplorer");

  // Register opencall.exportCollection command
  context.subscriptions.push(
    vscode.commands.registerCommand("opencall.exportCollection", async () => {
      logger.info("[Extension] opencall.exportCollection command triggered");
      // TODO: Trigger collection export from tree view context
    }),
  );
  logger.info("[Extension] Registered command: opencall.exportCollection");

  logger.info("[Extension] OpenCall extension activated successfully!");
}

export function deactivate(): void {
  logger.info("[Extension] Deactivating OpenCall extension...");
  
  // Close configuration manager
  disposeConfigurationManager();
  
  // Ensure storage manager is properly closed when the extension deactivates
  closeStorageManager();
  
  logger.info("[Extension] OpenCall extension deactivated");
}
