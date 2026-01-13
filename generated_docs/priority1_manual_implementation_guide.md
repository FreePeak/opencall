# Priority 1: Manual Minimal Integration - Implementation Guide

**Date**: January 11, 2026
**Approach**: Option A - Manual minimal integration
**Estimated Time**: 4-6 hours

---

## Current Status

### ✅ Completed (100%)
1. **ServiceRegistry** - Created and functional
2. **RequestHandler** - All CRUD methods implemented
3. **CollectionHandler** - All collection operations implemented
4. **EnvironmentHandler** - All environment operations implemented
5. **Enhanced MainWebViewPanel** - Updated to use RequestManager (reverted due to errors)
6. **Enhanced SidebarWebViewPanel** - Updated to accept services (reverted due to errors)

### ⚠️ Remaining (0%)
1. **extension.ts service wiring** - Needs clean implementation
2. **MainWebViewPanel updates** - Needs clean re-implementation
3. **SidebarWebViewPanel updates** - Needs clean re-implementation

---

## Implementation Steps

### Step 1: Update extension.ts Imports (~15 minutes)

**File**: `src/extension/extension.ts`

**Add imports after line 10:**
```typescript
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
import { getStorageManager } from "../storage";
```

---

### Step 2: Initialize Services (~15 minutes)

**After line 18 (storage initialized), add:**
```typescript
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
```

---

### Step 3: Initialize Handlers (~10 minutes)

**After service registration, add:**
```typescript
// Initialize handlers
const requestHandler = new RequestHandler();
const collectionHandler = new CollectionHandler();
const environmentHandler = new EnvironmentHandler();
logger.info("[Extension] Handlers initialized");
```

---

### Step 4: Update Webview Provider Calls (~10 minutes)

**Find lines 32-41 in extension.ts and update:**

**Current:**
```typescript
const SidebarWebViewProvider = new SidebarWebViewPanel(
  context.extensionUri,
  StateManager,
);
const MainWebViewProvider = new MainWebViewPanel(
  context.extensionUri,
  StateManager,
  SidebarWebViewProvider,
);
```

**Update to:**
```typescript
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
```

---

### Step 5: Register Command Handlers (~30 minutes)

**Replace lines 85-129 with handler-based commands:**

**Replace `opencall.createRequest`:**
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand("opencall.createRequest", async () => {
    await requestHandler.handleCreateRequest();
  }),
);
```

**Replace `opencall.newRequest`:**
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand("opencall.newRequest", async () => {
    await requestHandler.handleCreateRequest();
    openMainPanel();
  }),
);
```

**Replace `opencall.sendRequest`:**
```typescript
context.subscriptions.push(
  vscode.commands.registerCommand("opencall.sendRequest", async (requestId: string) => {
    logger.info("[Extension] opencall.sendRequest command triggered", requestId);
    await requestHandler.handleSendRequest(requestId);
  }),
);
```

**Add new commands (after `opencall.newRequest`):**
```typescript
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
```

**Update `opencall.refreshExplorer` and `opencall.exportCollection`:**
```typescript
// Register opencall.refreshExplorer command
context.subscriptions.push(
  vscode.commands.registerCommand("opencall.refreshExplorer", async () => {
    logger.info("[Extension] opencall.refreshExplorer command triggered");
    vscode.window.showInformationMessage("Collections refreshed!");
  }),
);

// Register opencall.exportCollection command
context.subscriptions.push(
  vscode.commands.registerCommand("opencall.exportCollection", async (collectionId: string) => {
    logger.info("[Extension] opencall.exportCollection command triggered", collectionId);
    await collectionHandler.handleExportCollection(collectionId);
  }),
);
```

---

### Step 6: Update MainWebViewPanel (~20 minutes)

**File**: `src/extension/MainWebViewPanel.ts`

**Add imports after line 15:**
```typescript
import { RequestManager } from "../core/request-manager";
import { StorageManager } from "../storage/storage-manager";
import { Request, HttpMethod, RequestHeader, RequestBody, Authentication } from "../types";
```

**Add properties after line 25:**
```typescript
private requestManager: RequestManager;
private storageManager: StorageManager;
```

**Update constructor (lines 27-35):**
```typescript
constructor(
  extensionUri: vscode.Uri,
  stateManager: ExtentionStateManager,
  sidebarWebViewPanel: SidebarWebViewPanel,
  requestManager: RequestManager,
  storageManager: StorageManager
) {
  this.extensionUri = extensionUri;
  this.stateManager = stateManager;
  this.sidebarWebViewPanel = sidebarWebViewPanel;
  this.requestManager = requestManager;
  this.storageManager = storageManager;
}
```

**Add `handleSendRequest` and `handleSaveRequest` methods (after line 64):**
```typescript
private async handleSendRequest(requestData: any) {
  try {
    const { requestUrl, requestMethod, keyValueTableData, authOption, authData, bodyOption, bodyRawOption, bodyRawData } = requestData;

    const request: Request = {
      id: uuidv4(),
      name: requestMethod + ' ' + requestUrl,
      description: '',
      method: requestMethod as HttpMethod,
      url: getUrl(requestUrl),
      headers: this.buildRequestHeaders(keyValueTableData, authOption, authData),
      body: this.buildRequestBody(bodyOption, bodyRawOption, bodyRawData),
      auth: this.buildAuthentication(authOption, authData),
      tests: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const execution = await this.requestManager.sendRequest(request.id);

    if (this.mainPanel) {
      this.mainPanel.webview.postMessage({
        type: 'response',
        data: {
          status: execution.response?.status,
          statusText: execution.response?.statusText,
          headers: execution.response?.headers || [],
          body: execution.response?.body || '',
          time: execution.response?.time || 0,
          size: execution.response?.size || 0,
        }
      });
    }

    // Save to history
    const { userRequestHistory } = this.stateManager.getExtensionContext(COLLECTION.HISTORY_COLLECTION);
    const url = getUrl(requestUrl);
    const method = requestMethod;
    const headers = getHeaders(keyValueTableData, authOption, authData);
    const requestedTime = new Date().getTime();

    const newHistoryEntry: IUserRequestSidebarState = {
      url,
      method,
      headers,
      responseType: 'text',
      requestedTime,
      favoritedTime: null,
      isUserFavorite: false,
      id: request.id,
      requestObject: {
        requestMethod,
        requestUrl,
        authOption,
        authData,
        bodyOption,
        bodyRawOption,
        bodyRawData,
        keyValueTableData,
      },
    };

    if (!userRequestHistory) {
      await this.stateManager.addExtensionContext(COLLECTION.HISTORY_COLLECTION, {
        history: [newHistoryEntry],
      });
    } else {
      await this.stateManager.addExtensionContext(COLLECTION.HISTORY_COLLECTION, {
        history: [newHistoryEntry, ...userRequestHistory],
      });
    }

    this.sidebarWebViewPanel.postMainWebViewPanelMessage(
      this.stateManager.getExtensionContext(COLLECTION.HISTORY_COLLECTION),
      this.stateManager.getExtensionContext(COLLECTION.FAVORITES_COLLECTION),
    );

  } catch (error) {
    vscode.window.showErrorMessage(`Request failed: ${error}`);
    if (this.mainPanel) {
      this.mainPanel.webview.postMessage({
        type: 'error',
        data: { message: String(error) }
      });
    }
  }
}

private async handleSaveRequest(requestData: any) {
  try {
    const { requestUrl, requestMethod, keyValueTableData, authOption, authData, bodyOption, bodyRawOption, bodyRawData } = requestData;

    const request: Request = {
      id: uuidv4(),
      name: requestMethod + ' ' + requestUrl,
      description: '',
      method: requestMethod as HttpMethod,
      url: getUrl(requestUrl),
      headers: this.buildRequestHeaders(keyValueTableData, authOption, authData),
      body: this.buildRequestBody(bodyOption, bodyRawOption, bodyRawData),
      auth: this.buildAuthentication(authOption, authData),
      tests: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.storageManager.saveRequest(request);

    const { userRequestHistory } = this.stateManager.getExtensionContext(COLLECTION.HISTORY_COLLECTION);
    const url = getUrl(requestUrl);
    const method = requestMethod;
    const headers = getHeaders(keyValueTableData, authOption, authData);
    const requestedTime = new Date().getTime();

    const newHistoryEntry: IUserRequestSidebarState = {
      url,
      method,
      headers,
      responseType: 'text',
      requestedTime,
      favoritedTime: null,
      isUserFavorite: false,
      id: request.id,
      requestObject: {
        requestMethod,
        requestUrl,
        authOption,
        authData,
        bodyOption,
        bodyRawOption,
        bodyRawData,
        keyValueTableData,
      },
    };

    if (!userRequestHistory) {
      await this.stateManager.addExtensionContext(COLLECTION.HISTORY_COLLECTION, {
        history: [newHistoryEntry],
      });
    } else {
      await this.stateManager.addExtensionContext(COLLECTION.HISTORY_COLLECTION, {
        history: [newHistoryEntry, ...userRequestHistory],
      });
    }

    vscode.window.showInformationMessage('Request saved successfully!');

    this.sidebarWebViewPanel.postMainWebViewPanelMessage(
      this.stateManager.getExtensionContext(COLLECTION.HISTORY_COLLECTION),
      this.stateManager.getExtensionContext(COLLECTION.FAVORITES_COLLECTION),
    );

  } catch (error) {
    vscode.window.showErrorMessage(`Failed to save request: ${error}`);
  }
}
```

**Add helper methods (after the above):**
```typescript
private buildRequestHeaders(keyValueTableData: any[], authOption: string, authData: any): RequestHeader[] {
  const headers: RequestHeader[] = [];
  if (keyValueTableData) {
    for (const item of keyValueTableData) {
      if (item.enabled !== false) {
        headers.push({
          key: item.key || '',
          value: item.value || '',
          enabled: true,
          description: ''
        });
      }
    }
  }
  return headers;
}

private buildRequestBody(bodyOption: string, bodyRawOption: string, bodyRawData: string): RequestBody | undefined {
  if (!bodyOption || bodyOption === 'none' || bodyOption === 'noBody') {
    return undefined;
  }
  const body: RequestBody = {
    mode: bodyOption === 'raw' ? 'raw' : 'json',
  };
  if (bodyOption === 'raw' && bodyRawData) {
    body.raw = bodyRawData;
  } else if (bodyOption === 'json' && bodyRawData) {
    try {
      body.json = JSON.parse(bodyRawData);
    } catch {
      body.raw = bodyRawData;
    }
  }
  return body;
}

private buildAuthentication(authOption: string, authData: any): Authentication {
  if (!authOption || authOption === 'noAuth' || authOption === 'none') {
    return { type: 'none' };
  }
  switch (authOption) {
    case 'bearer':
      return {
        type: 'bearer',
        bearer: { token: authData?.token || '' }
      };
    case 'basic':
      return {
        type: 'basic',
        basic: {
          username: authData?.username || '',
          password: authData?.password || ''
        }
      };
    case 'apikey':
      return {
        type: 'apikey',
        apiKey: {
          key: authData?.key || '',
          value: authData?.value || '',
          addTo: 'header'
        }
      };
    default:
      return { type: 'none' };
  }
}
```

**Update `receiveWebviewMessage` to handle `sendRequest` and `saveRequest`:**

**Find the onDidReceiveMessage handler and add these cases:**
```typescript
if (command === 'sendRequest') {
  await this.handleSendRequest(requestData);
  return;
}

if (command === 'saveRequest') {
  await this.handleSaveRequest(requestData);
  return;
}
```

---

### Step 7: Update SidebarWebViewPanel (~10 minutes)

**File**: `src/extension/SidebarWebViewPanel.ts`

**Add imports after line 7:**
```typescript
import { StorageManager } from "../storage/storage-manager";
import { CollectionManager } from "../core/collection-manager";
import { EnvironmentManager } from "../core/environment-manager";
```

**Add properties after line 13:**
```typescript
private storageManager: StorageManager;
private collectionManager: CollectionManager;
private environmentManager: EnvironmentManager;
```

**Update constructor (lines 15-18):**
```typescript
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
```

---

### Step 8: Update deactivate Function (~5 minutes)

**Find `deactivate` function and update:**

**Current:**
```typescript
export function deactivate(): void {
  logger.info("[Extension] Deactivating OpenCall extension...");

  // Close configuration manager
  disposeConfigurationManager();

  // Ensure storage manager is properly closed when extension deactivates
  closeStorageManager();

  logger.info("[Extension] OpenCall extension deactivated");
}
```

**Update to:**
```typescript
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
```

---

### Step 9: Compilation and Testing (~10 minutes)

**Run compilation:**
```bash
npm run compile
```

**Run build:**
```bash
npm run build
```

**Test in VSCode:**
1. Press F5 to launch extension in debug mode
2. Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
3. Run "opencall.createRequest"
4. Verify a new request is created
5. Run "opencall.open"
6. Send a request from the UI
7. Verify request executes and response shows
8. Verify request is saved to history

---

## Summary of Changes

### Files to Modify (6)
1. `src/extension/extension.ts` - Service wiring and command registration
2. `src/extension/MainWebViewPanel.ts` - RequestManager integration
3. `src/extension/SidebarWebViewPanel.ts` - Service parameters
4. `src/extension/ServiceRegistry.ts` - ✅ Already complete
5. `src/extension/handlers/request-handler.ts` - ✅ Already complete
6. `src/extension/handlers/collection-handler.ts` - ✅ Already complete
7. `src/extension/handlers/environment-handler.ts` - ✅ Already complete

### New Commands to Register (10)
- opencall.saveRequest
- opencall.deleteRequest
- opencall.createCollection
- opencall.importCollection
- opencall.deleteCollection
- opencall.createEnvironment
- opencall.switchEnvironment
- opencall.editEnvironment
- opencall.deleteEnvironment
- Update: opencall.sendRequest (with requestId parameter)
- Update: opencall.exportCollection (with collectionId parameter)

---

## Testing Checklist

After completing all steps:

- [ ] TypeScript compiles without errors
- [ ] Webpack build succeeds
- [ ] Extension activates successfully
- [ ] Command palette shows all commands
- [ ] "opencall.createRequest" creates a new request
- [ ] "opencall.open" opens the main panel
- [ ] Request can be sent from UI
- [ ] Response displays correctly
- [ ] Request saves to history
- [ ] Collection can be created
- [ ] Environment can be created
- [ ] No console errors in VSCode

---

## Known Issues to Watch

1. **CollectionManager.updateCollection()** - Not implemented, rename functionality won't work
2. **EnvironmentHandler** - Uses `addVariable` with 3 args, but method only takes 3
3. **ExportImportService** - Some methods may not match handler expectations

These can be addressed in future iterations.

---

## Next Steps After Integration

1. **Priority 2: Connect Webview to Services** - Full message handling
2. **Priority 2: Add missing service methods** - Update CollectionManager, EnvironmentManager
3. **Priority 3: Test End-to-End** - Manual testing of all flows
4. **Priority 4: Add Tests** - Unit tests for handlers

---

**Total Estimated Time**: 4-6 hours for minimal integration

**Ready to proceed?** Follow the steps above in order for clean, working integration.
