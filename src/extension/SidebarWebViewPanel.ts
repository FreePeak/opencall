/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import * as vscode from "vscode";

import { CATEGORY, COLLECTION, COMMAND, MESSAGE, TYPE } from "./constants";
import { filterObjectKey, generateResponseObject, getNonce } from "./utils";
import ExtentionStateManager from "./ExtensionStateManger";
import { IUserRequestSidebarState } from "./utils/type";
import { StorageManager } from "../storage/storage-manager";
import { CollectionManager } from "../core/collection-manager";
import { EnvironmentManager } from "../core/environment-manager";
import { logger } from "../utils/logger";
import { CollectionSearchFilters } from "../types";

class SidebarWebViewPanel {
  public sidebarWebview: vscode.WebviewView | null = null;
  private extensionUri;
  public mainWebViewPanel: vscode.WebviewPanel | null = null;
  public stateManager;
  private storageManager: StorageManager;
  private collectionManager: CollectionManager;
  private environmentManager: EnvironmentManager;

  constructor(
    extensionUri: vscode.Uri,
    stateManager: ExtentionStateManager,
    storageManager: StorageManager,
    collectionManager: CollectionManager,
    environmentManager: EnvironmentManager
  ) {
    this.extensionUri = extensionUri;
    this.stateManager = stateManager;
    this.storageManager = storageManager;
    this.collectionManager = collectionManager;
    this.environmentManager = environmentManager;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.sidebarWebview = webviewView;

    this.sidebarWebview.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "media"),
        vscode.Uri.joinPath(this.extensionUri, "dist"),
      ],
    };

    this.sidebarWebview.webview.html = this.getHtmlForSidebarWebView(
      webviewView.webview,
    );

    // Send initial data with collections
    const collections = this.collectionManager.getAllCollections();
    this.sidebarWebview.webview.postMessage({
      messageCategory: CATEGORY.COLLECTION_DATA,
      history: this.stateManager.getExtensionContext(
        COLLECTION.HISTORY_COLLECTION,
      ),
      favorites: this.stateManager.getExtensionContext(
        COLLECTION.FAVORITES_COLLECTION,
      ),
      collections: collections,
    });

    console.log('Initial sidebar data sent:', {
      history: this.stateManager.getExtensionContext(COLLECTION.HISTORY_COLLECTION),
      favorites: this.stateManager.getExtensionContext(COLLECTION.FAVORITES_COLLECTION),
      collections: collections
    });

    this.receiveSidebarWebViewMessage();
  }

  postMainWebViewPanelMessage(
    userHistoryData: {
      userRequestHistory: IUserRequestSidebarState[] | undefined;
    },
    userFavoritesData: {
      userRequestHistory: IUserRequestSidebarState[] | undefined;
    },
  ) {
    if (!this.sidebarWebview) {
      console.log('Sidebar webview not available, skipping update');
      return;
    }

    // Get fresh collections data
    const collections = this.collectionManager.getAllCollections();

    console.log('Updating sidebar with data:', {
      history: userHistoryData,
      favorites: userFavoritesData,
      collections: collections
    });

    this.sidebarWebview.webview.postMessage({
      messageCategory: CATEGORY.COLLECTION_DATA,
      history: userHistoryData,
      favorites: userFavoritesData,
      collections: collections,
    });
  }

  private receiveSidebarWebViewMessage() {
    if (!this.sidebarWebview) return;

    this.sidebarWebview.webview.onDidReceiveMessage(
      async (message: any) => {
        const { command, id, target } = message;
        
        if (command === COMMAND.START_APP) {
          vscode.commands.executeCommand(COMMAND.MAIN_WEB_VIEW_PANEL);
        } else if (command === COMMAND.ADD_TO_FAVORITES) {
          // Get the request from history
          const historyData = this.stateManager.getExtensionContext(COLLECTION.HISTORY_COLLECTION);
          const historyItem = historyData?.userRequestHistory?.find((item: any) => item.id === id);
          
          if (historyItem) {
            // Mark as favorite in history
            const updatedItem = {
              ...historyItem,
              isUserFavorite: true,
              favoritedTime: new Date().getTime(),
            };
            
            // Add to favorites collection
            const favoritesData = this.stateManager.getExtensionContext(COLLECTION.FAVORITES_COLLECTION);
            const favorites = favoritesData?.userRequestHistory || [];
            
            await this.stateManager.addExtensionContext(COLLECTION.FAVORITES_COLLECTION, {
              history: [updatedItem, ...favorites],
            });
            
            // Update history to mark as favorite
            const history = historyData?.userRequestHistory || [];
            const updatedHistory = history.map((item: any) => 
              item.id === id ? updatedItem : item
            );
            
            await this.stateManager.addExtensionContext(COLLECTION.HISTORY_COLLECTION, {
              history: updatedHistory,
            });
          }
        } else if (command === COMMAND.REMOVE_FROM_FAVORITES) {
          // Get the request from history
          const historyData = this.stateManager.getExtensionContext(COLLECTION.HISTORY_COLLECTION);
          const historyItem = historyData?.userRequestHistory?.find((item: any) => item.id === id);
          
          if (historyItem) {
            // Mark as not favorite in history
            const updatedItem = {
              ...historyItem,
              isUserFavorite: false,
              favoritedTime: null,
            };
            
            // Update history
            const history = historyData?.userRequestHistory || [];
            const updatedHistory = history.map((item: any) => 
              item.id === id ? updatedItem : item
            );
            
            await this.stateManager.addExtensionContext(COLLECTION.HISTORY_COLLECTION, {
              history: updatedHistory,
            });
          }
          
          // Remove from favorites collection
          await this.stateManager.deleteExtensionContext(
            COLLECTION.FAVORITES_COLLECTION,
            id,
          );
        } else if (command === COMMAND.DELETE) {
          if (target === COLLECTION.FAVORITES_COLLECTION) {
            await this.stateManager.updateExtensionContext(
              COLLECTION.HISTORY_COLLECTION,
              id,
            );
          }

          await this.stateManager.deleteExtensionContext(target, id);
        } else if (command === COMMAND.DELETE_ALL_COLLECTION) {
          const answer = await vscode.window.showWarningMessage(
            MESSAGE.DELETE_REMINDER,
            MESSAGE.YES,
            MESSAGE.NO,
          );

          if (answer === MESSAGE.YES) {
            if (!this.sidebarWebview) return;

            await this.stateManager.deleteExtensionContext(target);

            this.sidebarWebview.webview.postMessage({
              messageCategory: CATEGORY.DELETION_COMPLETE,
              target,
            });
          }
        } else if (command === COMMAND.TOGGLE_FAVORITE) {
          // Toggle favorite status on a request
          try {
            logger.info('[SidebarWebViewPanel] Toggling favorite', { requestId: id });
            await this.collectionManager.toggleFavorite(id);
            
            // Send updated collections back to webview
            const collections = this.collectionManager.getAllCollections();
            if (this.sidebarWebview) {
              this.sidebarWebview.webview.postMessage({
                messageCategory: CATEGORY.COLLECTION_DATA,
                collections: collections,
              });
            }
          } catch (error) {
            logger.error('[SidebarWebViewPanel] Failed to toggle favorite', error);
            vscode.window.showErrorMessage(`Failed to toggle favorite: ${error}`);
          }
        } else if (command === COMMAND.PIN_COLLECTION) {
          // Pin/unpin a collection
          try {
            logger.info('[SidebarWebViewPanel] Toggling pin on collection', { collectionId: id });
            await this.collectionManager.pinCollection(id);
            
            // Send updated collections back to webview
            const collections = this.collectionManager.getAllCollections();
            if (this.sidebarWebview) {
              this.sidebarWebview.webview.postMessage({
                messageCategory: CATEGORY.COLLECTION_DATA,
                collections: collections,
              });
            }
          } catch (error) {
            logger.error('[SidebarWebViewPanel] Failed to pin collection', error);
            vscode.window.showErrorMessage(`Failed to pin collection: ${error}`);
          }
        } else if (command === COMMAND.MOVE_REQUEST) {
          // Move a request to a different collection
          try {
            const { requestId, targetCollectionId, position } = message;
            logger.info('[SidebarWebViewPanel] Moving request', { requestId, targetCollectionId, position });
            
            await this.collectionManager.moveRequest(requestId, targetCollectionId, position);
            
            // Send updated collections back to webview
            const collections = this.collectionManager.getAllCollections();
            if (this.sidebarWebview) {
              this.sidebarWebview.webview.postMessage({
                messageCategory: CATEGORY.COLLECTION_DATA,
                collections: collections,
              });
            }
          } catch (error) {
            logger.error('[SidebarWebViewPanel] Failed to move request', error);
            vscode.window.showErrorMessage(`Failed to move request: ${error}`);
          }
        } else if (command === COMMAND.REORDER_ITEMS) {
          // Reorder items within a collection
          try {
            const { collectionId, sourceIndex, destinationIndex } = message;
            logger.info('[SidebarWebViewPanel] Reordering items', { collectionId, sourceIndex, destinationIndex });
            
            await this.collectionManager.reorderItems(collectionId, sourceIndex, destinationIndex);
            
            // Send updated collections back to webview
            const collections = this.collectionManager.getAllCollections();
            if (this.sidebarWebview) {
              this.sidebarWebview.webview.postMessage({
                messageCategory: CATEGORY.COLLECTION_DATA,
                collections: collections,
              });
            }
          } catch (error) {
            logger.error('[SidebarWebViewPanel] Failed to reorder items', error);
            vscode.window.showErrorMessage(`Failed to reorder items: ${error}`);
          }
        } else if (command === COMMAND.BULK_DELETE) {
          // Delete multiple items
          try {
            const { ids } = message;
            logger.info('[SidebarWebViewPanel] Bulk deleting items', { count: ids?.length });
            
            const answer = await vscode.window.showWarningMessage(
              `Delete ${ids?.length || 0} items?`,
              MESSAGE.YES,
              MESSAGE.NO,
            );

            if (answer === MESSAGE.YES) {
              await this.collectionManager.bulkDelete(ids);
              
              // Send updated collections back to webview
              const collections = this.collectionManager.getAllCollections();
              if (this.sidebarWebview) {
                this.sidebarWebview.webview.postMessage({
                  messageCategory: CATEGORY.COLLECTION_DATA,
                  collections: collections,
                });
              }
            }
          } catch (error) {
            logger.error('[SidebarWebViewPanel] Failed to bulk delete', error);
            vscode.window.showErrorMessage(`Failed to delete items: ${error}`);
          }
        } else if (command === COMMAND.BULK_MOVE) {
          // Move multiple requests to a collection
          try {
            const { requestIds, targetCollectionId } = message;
            logger.info('[SidebarWebViewPanel] Bulk moving requests', { count: requestIds?.length, targetCollectionId });
            
            await this.collectionManager.bulkMove(requestIds, targetCollectionId);
            
            // Send updated collections back to webview
            const collections = this.collectionManager.getAllCollections();
            if (this.sidebarWebview) {
              this.sidebarWebview.webview.postMessage({
                messageCategory: CATEGORY.COLLECTION_DATA,
                collections: collections,
              });
            }
          } catch (error) {
            logger.error('[SidebarWebViewPanel] Failed to bulk move', error);
            vscode.window.showErrorMessage(`Failed to move requests: ${error}`);
          }
        } else if (command === COMMAND.BULK_ADD_TAGS) {
          // Add tags to multiple requests
          try {
            const { requestIds, tags } = message;
            logger.info('[SidebarWebViewPanel] Bulk adding tags', { count: requestIds?.length, tags });
            
            await this.collectionManager.bulkAddTags(requestIds, tags);
            
            // Send updated collections back to webview
            const collections = this.collectionManager.getAllCollections();
            if (this.sidebarWebview) {
              this.sidebarWebview.webview.postMessage({
                messageCategory: CATEGORY.COLLECTION_DATA,
                collections: collections,
              });
            }
          } catch (error) {
            logger.error('[SidebarWebViewPanel] Failed to bulk add tags', error);
            vscode.window.showErrorMessage(`Failed to add tags: ${error}`);
          }
        } else if (command === COMMAND.SEARCH_COLLECTIONS) {
          // Search collections with filters
          try {
            const { filters } = message as { filters: CollectionSearchFilters };
            logger.info('[SidebarWebViewPanel] Searching collections', { filters });
            
            const searchResults = this.collectionManager.searchCollections(filters);
            
            // Send search results back to webview
            if (this.sidebarWebview) {
              this.sidebarWebview.webview.postMessage({
                messageCategory: 'Search Results',
                results: searchResults,
              });
            }
          } catch (error) {
            logger.error('[SidebarWebViewPanel] Failed to search collections', error);
            vscode.window.showErrorMessage(`Search failed: ${error}`);
          }
        } else if (command === COMMAND.EXPORT_COLLECTION) {
          // Export collection to JSON
          try {
            const { collectionId } = message;
            logger.info('[SidebarWebViewPanel] Exporting collection', { collectionId });
            
            const jsonData = this.collectionManager.exportCollectionAsJson(collectionId);
            
            if (!jsonData) {
              vscode.window.showErrorMessage('Collection not found');
              return;
            }
            
            // Prompt user for save location
            const uri = await vscode.window.showSaveDialog({
              defaultUri: vscode.Uri.file(`collection-${collectionId}.json`),
              filters: {
                'JSON': ['json']
              }
            });

            if (uri) {
              await vscode.workspace.fs.writeFile(uri, Buffer.from(jsonData, 'utf-8'));
              vscode.window.showInformationMessage('Collection exported successfully');
            }
          } catch (error) {
            logger.error('[SidebarWebViewPanel] Failed to export collection', error);
            vscode.window.showErrorMessage(`Failed to export collection: ${error}`);
          }
        } else if (command === COMMAND.IMPORT_COLLECTION) {
          // Import collection from JSON
          try {
            const { jsonData, parentId } = message;
            logger.info('[SidebarWebViewPanel] Importing collection', { parentId });
            
            const collection = await this.collectionManager.importCollection(jsonData, parentId);
            
            if (!collection) {
              vscode.window.showErrorMessage('Failed to import collection');
              return;
            }
            
            // Send updated collections back to webview
            const collections = this.collectionManager.getAllCollections();
            if (this.sidebarWebview) {
              this.sidebarWebview.webview.postMessage({
                messageCategory: CATEGORY.COLLECTION_DATA,
                collections: collections,
              });
            }
            
            vscode.window.showInformationMessage(`Collection "${collection.name}" imported successfully`);
          } catch (error) {
            logger.error('[SidebarWebViewPanel] Failed to import collection', error);
            vscode.window.showErrorMessage(`Failed to import collection: ${error}`);
          }
        } else {
          if (!this.mainWebViewPanel) {
            vscode.commands.executeCommand(COMMAND.MAIN_WEB_VIEW_PANEL);
          }

          setTimeout(async () => {
            if (!this.mainWebViewPanel) return;

            this.mainWebViewPanel.webview.postMessage({
              type: COLLECTION.COLLECTION_REQUEST,
            });

            const targetHistory = this.stateManager.getExtensionContext(target);

            const selectedCollection = filterObjectKey(
              targetHistory,
              id,
              COLLECTION.FILTERABLE_OBJECT_KEY,
            );

            const responseObject = await generateResponseObject(
              selectedCollection,
            );

            if (selectedCollection) {
              this.mainWebViewPanel.webview.postMessage(responseObject);
              this.mainWebViewPanel.webview.postMessage({
                type: TYPE.SIDE_BAR_DATA,
                ...selectedCollection.requestObject,
              });
            }
          }, 1000);
        }
      },
    );
  }

  private getHtmlForSidebarWebView(webview: vscode.Webview) {
    const scriptPath = vscode.Uri.joinPath(
      this.extensionUri,
      "dist",
      "sidebar.js",
    );
    const resetCssPath = vscode.Uri.joinPath(
      this.extensionUri,
      "media",
      "reset.css",
    );
    const vscodeStylesCssPath = vscode.Uri.joinPath(
      this.extensionUri,
      "media",
      "vscode.css",
    );

    const resetCssSrc = webview.asWebviewUri(resetCssPath);
    const mainStylesCssSrc = webview.asWebviewUri(vscodeStylesCssPath);
    const scriptSrc = webview.asWebviewUri(scriptPath);
    const nonce = getNonce();

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:; font-src ${webview.cspSource}; worker-src 'self' blob:;">
          <title>REST API Tester Sidebar</title>
          <link href="${resetCssSrc}" rel="stylesheet">
          <link href="${mainStylesCssSrc}" rel="stylesheet">
        </head>
        <body>
          <div id="root"></div>
          <script nonce="${nonce}">window.process = window.process || { env: {} };</script>
          <script nonce="${nonce}">
            (function() {
              window.vscode = acquireVsCodeApi();
            })();
          </script>
          <script nonce="${nonce}" src="${scriptSrc}"></script>
        </body>
      </html>`;
  }
}

export default SidebarWebViewPanel;
