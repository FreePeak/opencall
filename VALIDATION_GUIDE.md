# OpenCall Extension - Validation & Testing Guide

This guide provides step-by-step instructions for validating the OpenCall VSCode extension after TypeScript fixes and service integration.

---

## Prerequisites

Before starting validation:

```bash
# Ensure all dependencies are installed
npm install

# Build the extension
npm run build

# Verify no TypeScript errors
npm run compile
```

**Expected Result:**
- ✅ No TypeScript compilation errors
- ✅ Extension builds successfully (out/extension.js created)
- ✅ Webview bundles created (dist/bundle.js, dist/sidebar.js)

---

## Launch Extension in Debug Mode

### Method 1: VSCode Debug (Recommended)

1. Open the project in VSCode
2. Press `F5` or go to **Run > Start Debugging**
3. A new "Extension Development Host" VSCode window will open
4. This window has the OpenCall extension loaded for testing

### Method 2: Manual Launch

```bash
# Package the extension
npm run package

# Install the extension manually
code --install-extension opencall.vsix
```

---

## Validation Checklist

### ✅ 1. Extension Activation

**Test:** Open the Extension Development Host window

**Expected Result:**
- ✅ No errors in Debug Console
- ✅ Log message: `[Extension] Activating OpenCall extension...`
- ✅ Log message: `[Extension] Storage manager initialized successfully`
- ✅ Log message: `[Extension] Request manager initialized`
- ✅ Log message: `[Extension] Collection manager initialized`
- ✅ Log message: `[Extension] Environment manager initialized`
- ✅ OpenCall icon appears in Activity Bar (left sidebar)

**Commands to Check Logs:**
```bash
# In Debug Console (View > Debug Console)
# Look for [Extension] log messages
```

**Evidence:**
```
src/extension/extension.ts:23 - Extension activation
ACTUAL: Extension activates without errors | EXPECTED: Clean activation with service initialization logs
```

---

### ✅ 2. Open OpenCall Main Panel

**Test Steps:**
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `OpenCall: Open API Client`
3. Press Enter

**Alternative:** Press `Cmd+Shift+A` (Mac) or `Ctrl+Shift+A` (Windows/Linux)

**Expected Result:**
- ✅ Main panel opens in editor area
- ✅ Shows OpenCall UI with request form
- ✅ No errors in Debug Console
- ✅ Sidebar panel shows history/favorites (initially empty)

**Evidence:**
```
src/extension/extension.ts:127 - Command registration
ACTUAL: opencall.open command registered | EXPECTED: Main panel opens
```

---

### ✅ 3. Create a Request

**Test Steps:**
1. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
2. Type: `OpenCall: Create Request`
3. Enter request name when prompted (e.g., "Test GET Request")
4. Press Enter

**Expected Result:**
- ✅ Input box appears asking for request name
- ✅ After entering name, request is created
- ✅ Success message: "Request created: Test GET Request"
- ✅ Log message: `[RequestHandler] Creating new request`
- ✅ Request appears in history/sidebar

**Evidence:**
```
src/extension/handlers/request-handler.ts:25 - handleCreateRequest
ACTUAL: Request created via handler | EXPECTED: Request saved to storage
```

---

### ✅ 4. Send a Request (Manual Test)

**Test Steps:**
1. Open OpenCall main panel (`opencall.open`)
2. Enter URL: `https://jsonplaceholder.typicode.com/todos/1`
3. Select method: `GET`
4. Click "Send" button (or press `Cmd+Enter` / `Ctrl+Enter`)

**Expected Result:**
- ✅ Request is sent
- ✅ Response appears in response pane
- ✅ Status code displayed (200 OK)
- ✅ Response body shows JSON data
- ✅ Request is saved to history
- ✅ Log message: `[RequestHandler] Sending request`

**Evidence:**
```
src/extension/MainWebViewPanel.ts:320 - handleSendRequest
ACTUAL: Request sent via RequestManager | EXPECTED: Response received and displayed
```

---

### ✅ 5. Create a Collection

**Test Steps:**
1. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
2. Type: `OpenCall: Create Collection`
3. Enter collection name: "My API Tests"
4. Enter description (optional): "Test collection"
5. Press Enter

**Expected Result:**
- ✅ Input box appears for collection name
- ✅ Input box appears for description
- ✅ Success message: "Collection created: My API Tests"
- ✅ Log message: `[CollectionHandler] Creating new collection`
- ✅ Collection appears in sidebar

**Evidence:**
```
src/extension/handlers/collection-handler.ts:27 - handleCreateCollection
ACTUAL: Collection created via handler | EXPECTED: Collection saved to storage
```

---

### ✅ 6. Export a Collection

**Test Steps:**
1. Create a collection first (step 5)
2. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
3. Type: `OpenCall: Export Collection`
4. Select the collection to export
5. Choose export format (OpenCall JSON, Postman, OpenAPI)
6. Choose save location

**Expected Result:**
- ✅ Quick pick shows available collections
- ✅ Quick pick shows export formats
- ✅ File save dialog appears
- ✅ Collection exported successfully
- ✅ Success message shown
- ✅ Log message: `[CollectionHandler] Exporting collection`

**Evidence:**
```
src/extension/handlers/collection-handler.ts:83 - handleExportCollection
ACTUAL: Collection exported | EXPECTED: File created with collection data
```

---

### ✅ 7. Import a Collection

**Test Steps:**
1. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
2. Type: `OpenCall: Import Collection`
3. Select import format (Postman or OpenCall)
4. Choose file to import
5. Confirm import

**Expected Result:**
- ✅ Quick pick shows import format options
- ✅ File open dialog appears
- ✅ Collection imported successfully
- ✅ Success message shown
- ✅ Imported collection appears in sidebar
- ✅ Log message: `[CollectionHandler] Importing collection`

**Evidence:**
```
src/extension/handlers/collection-handler.ts:53 - handleImportCollection
ACTUAL: Collection imported | EXPECTED: Collection added to storage
```

---

### ✅ 8. Create an Environment

**Test Steps:**
1. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
2. Type: `OpenCall: Create Environment`
3. Enter environment name: "Development"
4. Press Enter

**Expected Result:**
- ✅ Input box appears for environment name
- ✅ Success message: "Environment created: Development"
- ✅ Log message: `[EnvironmentHandler] Creating new environment`
- ✅ Environment appears in environment list

**Evidence:**
```
src/extension/handlers/environment-handler.ts:25 - handleCreateEnvironment
ACTUAL: Environment created | EXPECTED: Environment saved to storage
```

---

### ✅ 9. Edit Environment (Add Variable)

**Test Steps:**
1. Create an environment first (step 8)
2. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
3. Type: `OpenCall: Edit Environment`
4. Select the environment
5. Choose "Add Variable"
6. Enter variable key: "API_URL"
7. Enter variable value: "https://api.example.com"

**Expected Result:**
- ✅ Quick pick shows available environments
- ✅ Quick pick shows edit options (Add Variable, Remove Variable, Rename)
- ✅ Input boxes appear for key and value
- ✅ Success message: "Variable 'API_URL' added"
- ✅ Log message: `[EnvironmentHandler] Added variable API_URL`

**Evidence:**
```
src/extension/handlers/environment-handler.ts:139 - addVariable
src/core/environment-manager.ts:206 - addVariable method
ACTUAL: Variable added with 3 parameters (environmentId, key, variable) | EXPECTED: Variable saved to environment
```

---

### ✅ 10. Switch Environment

**Test Steps:**
1. Create multiple environments (repeat step 8)
2. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
3. Type: `OpenCall: Switch Environment`
4. Select an environment from the list

**Expected Result:**
- ✅ Quick pick shows available environments
- ✅ Selected environment becomes active
- ✅ Success message: "Switched to environment: [name]"
- ✅ Log message: `[EnvironmentHandler] Switching environment`

**Evidence:**
```
src/extension/handlers/environment-handler.ts:105 - handleSwitchEnvironment
ACTUAL: Environment switched | EXPECTED: Active environment updated
```

---

### ✅ 11. Delete an Environment

**Test Steps:**
1. Create an environment (step 8)
2. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
3. Type: `OpenCall: Delete Environment`
4. Select the environment to delete
5. Confirm deletion

**Expected Result:**
- ✅ Quick pick shows available environments
- ✅ Confirmation dialog appears
- ✅ Success message: "Environment deleted: [name]"
- ✅ Environment removed from list
- ✅ Log message: `[EnvironmentHandler] Deleting environment`

**Evidence:**
```
src/extension/handlers/environment-handler.ts:195 - handleDeleteEnvironment
ACTUAL: Environment deleted | EXPECTED: Environment removed from storage
```

---

### ✅ 12. Delete a Collection

**Test Steps:**
1. Create a collection (step 5)
2. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
3. Type: `OpenCall: Delete Collection`
4. Select the collection to delete
5. Confirm deletion

**Expected Result:**
- ✅ Quick pick shows available collections
- ✅ Confirmation dialog appears
- ✅ Success message: "Collection deleted: [name]"
- ✅ Collection removed from sidebar
- ✅ Log message: `[CollectionHandler] Deleting collection`

**Evidence:**
```
src/extension/handlers/collection-handler.ts:140 - handleDeleteCollection
ACTUAL: Collection deleted | EXPECTED: Collection removed from storage
```

---

## Quick Validation Commands

Run these commands in the Extension Development Host VSCode window to quickly test all features:

```bash
# 1. Open main panel
Cmd+Shift+A (or Ctrl+Shift+A)

# 2. Open Command Palette for each test
Cmd+Shift+P (or Ctrl+Shift+P)

# Then type these commands one by one:
# - OpenCall: Create Request
# - OpenCall: Create Collection
# - OpenCall: Create Environment
# - OpenCall: Edit Environment
# - OpenCall: Switch Environment
# - OpenCall: Export Collection
# - OpenCall: Import Collection
# - OpenCall: Delete Environment
# - OpenCall: Delete Collection
```

---

## Debug Console Log Verification

Expected log sequence during normal operation:

```log
[Extension] Activating OpenCall extension...
[Extension] Storage manager initialized successfully
[Extension] Request manager initialized
[Extension] Collection manager initialized
[Extension] Environment manager initialized
[Extension] Team manager initialized
[Extension] P2P sync service initialized
[Extension] Local discovery service initialized
[Extension] All services registered in ServiceRegistry
[Extension] Handlers initialized
[Extension] Registered command: opencall.open
[Extension] Registered command: opencall.newRequest
[Extension] Registered command: opencall.createRequest
... (more commands)
[Extension] OpenCall extension activated successfully
```

---

## Automated Testing

To run automated tests (if available):

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- out/test/extension.test.js
```

---

## Common Issues & Troubleshooting

### Issue 1: Extension doesn't activate
**Solution:**
1. Check Debug Console for errors
2. Verify `out/extension.js` exists
3. Run `npm run build` again
4. Restart Extension Development Host (Cmd+R / Ctrl+R)

### Issue 2: Commands not showing in Command Palette
**Solution:**
1. Check `package.json` contributes.commands section
2. Verify command registration in extension.ts
3. Restart Extension Development Host

### Issue 3: Services not initialized
**Solution:**
1. Check ServiceRegistry is properly initialized
2. Verify all managers are created before handlers
3. Check logs for service initialization errors

### Issue 4: Storage errors
**Solution:**
1. Check VSCode globalState is accessible
2. Verify storage manager initialization
3. Clear extension storage: Developer: Reload Window

---

## Build & Package Verification

### Verify Build Output

```bash
# Check compiled files exist
ls -lh out/extension.js
ls -lh dist/bundle.js
ls -lh dist/sidebar.js

# Check file sizes
# extension.js should be ~575KB
# bundle.js should be ~1.58MB
# sidebar.js should be ~233KB
```

### Package Extension

```bash
# Create VSIX package
npm run package

# Verify package created
ls -lh opencall.vsix

# Install locally
code --install-extension opencall.vsix

# Uninstall
code --uninstall-extension opencall.opencall
```

---

## Performance Checks

### Extension Activation Time
- Should activate in < 500ms
- Check Debug Console for timing

### Request Response Time
- Simple GET request should complete in < 2s
- Check network tab in DevTools

### Memory Usage
- Extension should use < 100MB memory
- Check via VSCode Developer: Show Running Extensions

---

## Next Steps After Validation

1. ✅ All tests pass → Ready to commit changes
2. ⚠️ Some tests fail → Fix issues and re-validate
3. 🔄 Performance issues → Profile and optimize

---

## Commit Changes (After Successful Validation)

```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "fix: resolve TypeScript errors and complete service integration

- Remove duplicate src/extension.ts file
- Update MainWebViewPanel to accept requestManager and storageManager
- Fix EnvironmentManager.addVariable to accept key parameter
- All handlers properly wired to extension commands
- Extension builds and activates successfully

Fixes #[issue-number]"

# Push to remote (if ready)
git push origin <branch-name>
```

---

## Summary

This validation guide covers:
- ✅ Extension activation verification
- ✅ All command functionality testing
- ✅ Service integration verification
- ✅ Debug logging validation
- ✅ Build and package verification
- ✅ Performance checks
- ✅ Troubleshooting common issues

Complete all checklist items to ensure the extension is working correctly before moving to the next development phase.
