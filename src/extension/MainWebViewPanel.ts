/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { v4 as uuidv4 } from "uuid";
import * as vscode from "vscode";

import { COLLECTION, COMMAND, MESSAGE, NAME, TYPE } from "./constants";
import {
  generateResponseObject,
  getBody,
  getHeaders,
  getNonce,
  getUrl,
} from "./utils";
import { IRequestHeaderInformation, IRequestObjectType, IUserRequestSidebarState } from "./utils/type";
import SidebarWebViewPanel from "./SidebarWebViewPanel";
import ExtentionStateManager from "./ExtensionStateManger";
import { RequestManager } from "../core/request-manager";
import { StorageManager } from "../storage/storage-manager";

class MainWebViewPanel {
  private url: string = "";
  private body: string | FormData | URLSearchParams = "";
  private method: string = "";
  private headers: IRequestHeaderInformation = { key: "" };
  public mainPanel: vscode.WebviewPanel | null = null;
  private extensionUri;
  public stateManager;
  public sidebarWebViewPanel;
  private requestManager: RequestManager;
  private storageManager: StorageManager;

  constructor(
    extensionUri: vscode.Uri,
    stateManager: ExtentionStateManager,
    sidebarWebViewPanel: SidebarWebViewPanel,
    requestManager: RequestManager,
    storageManager: StorageManager,
  ) {
    this.extensionUri = extensionUri;
    this.stateManager = stateManager;
    this.sidebarWebViewPanel = sidebarWebViewPanel;
    this.requestManager = requestManager;
    this.storageManager = storageManager;
  }

  initializeWebView() {
    this.mainPanel = vscode.window.createWebviewPanel(
      TYPE.WEB_VIEW_TYPE,
      NAME.MAIN_PANEL_NAME,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.extensionUri, "media"),
          vscode.Uri.joinPath(this.extensionUri, "dist"),
        ],
      },
    );

    this.mainPanel.webview.html = this.getHtmlForWebView(
      this.mainPanel.webview,
    );

    this.mainPanel.iconPath = vscode.Uri.joinPath(
      this.extensionUri,
      "media/icon.svg",
    );

    this.receiveWebviewMessage();

    return this.mainPanel;
  }

  private async handleSaveRequest(requestData: any) {
    try {
      const { requestUrl, requestMethod, keyValueTableData, authOption, authData, bodyOption, bodyRawOption, bodyRawData } = requestData;
      
      // Create a request object
      const requestObject = {
        requestMethod,
        requestUrl,
        authOption,
        authData,
        bodyOption,
        bodyRawOption,
        bodyRawData,
        keyValueTableData,
      };

      // Generate a unique ID for the request
      const requestId = uuidv4();
      const requestedTime = new Date().getTime();

      // Get current history
      const { userRequestHistory } = this.stateManager.getExtensionContext(COLLECTION.HISTORY_COLLECTION);

      // Process the request data to match the interface
      const url = getUrl(requestUrl);
      const method = requestMethod;
      const headers = getHeaders(keyValueTableData, authOption, authData);
      const responseType = 'text';

      // Create new request entry matching IUserRequestSidebarState
      const newRequest: IUserRequestSidebarState = {
        url,
        method,
        headers,
        responseType,
        requestedTime,
        favoritedTime: null,
        isUserFavorite: false,
        id: requestId,
        requestObject,
      };

      // Save to history
      if (!userRequestHistory) {
        await this.stateManager.addExtensionContext(COLLECTION.HISTORY_COLLECTION, {
          history: [newRequest],
        });
      } else {
        await this.stateManager.addExtensionContext(COLLECTION.HISTORY_COLLECTION, {
          history: [newRequest, ...userRequestHistory],
        });
      }

      // Show success message
      vscode.window.showInformationMessage('Request saved successfully!');
      
      // Update sidebar
      this.sidebarWebViewPanel.postMainWebViewPanelMessage(
        this.stateManager.getExtensionContext(COLLECTION.HISTORY_COLLECTION),
        this.stateManager.getExtensionContext(COLLECTION.FAVORITES_COLLECTION),
      );

    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save request: ${error}`);
    }
  }

  private receiveWebviewMessage() {
    if (!this.mainPanel) return;

    this.mainPanel.webview.onDidReceiveMessage(
      async ({
        requestMethod,
        requestUrl,
        authOption,
        authData,
        bodyOption,
        bodyRawOption,
        bodyRawData,
        keyValueTableData,
        command,
        requestData,
      }) => {
        if (command === COMMAND.ALERT_COPY) {
          vscode.window.showInformationMessage(MESSAGE.COPY_SUCCESFUL_MESSAGE);
          return;
        }

        if (command === 'saveRequest') {
          await this.handleSaveRequest(requestData);
          return;
        }

        if (requestUrl.length === 0) {
          vscode.window.showWarningMessage(MESSAGE.WARNING_MESSAGE);
          return;
        }

        const requestObject = {
          requestMethod,
          requestUrl,
          authOption,
          authData,
          bodyOption,
          bodyRawOption,
          bodyRawData,
          keyValueTableData,
          command,
        };
        this.url = getUrl(requestUrl);
        this.method = requestMethod;
        this.headers = getHeaders(keyValueTableData, authOption, authData);

        // @ts-expect-error getBody returns flexible body type based on bodyOption parameter
        this.body = getBody(
          keyValueTableData,
          bodyOption,
          bodyRawOption,
          bodyRawData,
        );

        this.postWebviewMessage(requestObject);
      },
    );
  }

  private async postWebviewMessage(requestObject: IRequestObjectType) {
    const { userRequestHistory } = this.stateManager.getExtensionContext(
      COLLECTION.HISTORY_COLLECTION,
    );

    const axiosConfiguration = {
      url: this.url,
      method: this.method,
      headers: this.headers,
      data: this.body,
      responseType: TYPE.TEXT,
    };

    const responseObject = await generateResponseObject(axiosConfiguration);
    const requestedTime = new Date().getTime();

    if (responseObject && responseObject.type !== MESSAGE.ERROR) {
      if (!userRequestHistory) {
        await this.stateManager.addExtensionContext(
          COLLECTION.HISTORY_COLLECTION,
          {
            history: [
              {
                ...axiosConfiguration,
                requestedTime,
                favoritedTime: null,
                isUserFavorite: false,
                id: uuidv4(),
                requestObject,
              },
            ],
          },
        );
      } else {
        if (!userRequestHistory) return;

        await this.stateManager.addExtensionContext(
          COLLECTION.HISTORY_COLLECTION,
          {
            history: [
              {
                ...axiosConfiguration,
                requestedTime,
                favoritedTime: null,
                isUserFavorite: false,
                id: uuidv4(),
                requestObject,
              },
              ...userRequestHistory,
            ],
          },
        );
      }
    }

    if (this.mainPanel) {
      console.log(
        this.stateManager.getExtensionContext(COLLECTION.HISTORY_COLLECTION),
        this.stateManager.getExtensionContext(COLLECTION.FAVORITES_COLLECTION),
      );
      this.mainPanel.webview.postMessage(responseObject);
      this.sidebarWebViewPanel.postMainWebViewPanelMessage(
        this.stateManager.getExtensionContext(COLLECTION.HISTORY_COLLECTION),
        this.stateManager.getExtensionContext(COLLECTION.FAVORITES_COLLECTION),
      );
    }
  }

  private getHtmlForWebView(panel: vscode.Webview) {
    const scriptPath = vscode.Uri.joinPath(
      this.extensionUri,
      "dist",
      "bundle.js",
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

    const resetCssSrc = panel.asWebviewUri(resetCssPath);
    const mainStylesCssSrc = panel.asWebviewUri(vscodeStylesCssPath);
    const scriptSrc = panel.asWebviewUri(scriptPath);
    const nonce = getNonce();

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src ${panel.cspSource} https: data:; style-src ${panel.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${panel.cspSource} https:; font-src ${panel.cspSource}; worker-src 'self' blob:;">
          <title>REST API Tester</title>
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
          <script src="${scriptSrc}" nonce="${nonce}"></script>
        </body>
      </html>`;
  }
}

export default MainWebViewPanel;
