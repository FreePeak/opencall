# OpenCall - Quick Validation Reference

## One-Command Validation

```bash
# Build and verify everything in one go
npm run compile && npm run build && echo "✅ Build successful!"
```

---

## Launch Extension for Testing

### Option 1: VSCode Debug (Fastest)
1. Press `F5` in VSCode
2. Wait for Extension Development Host to open

### Option 2: Package & Install
```bash
npm run package && code --install-extension opencall.vsix
```

---

## Quick Test Sequence (5 minutes)

Execute these commands in order in the Extension Development Host:

| Step | Keybinding | Command | Expected |
|------|------------|---------|----------|
| 1 | `Cmd+Shift+A` | Open API Client | Main panel opens |
| 2 | `Cmd+Shift+P` → type `opencall create request` | Create Request | Input box appears |
| 3 | `Cmd+Shift+P` → type `opencall create collection` | Create Collection | Collection created |
| 4 | `Cmd+Shift+P` → type `opencall create environment` | Create Environment | Environment created |
| 5 | `Cmd+Shift+P` → type `opencall edit environment` | Edit Environment | Add variable dialog |
| 6 | `Cmd+Shift+P` → type `opencall switch environment` | Switch Environment | Environment switched |

---

## Test Request (Simple GET)

1. Open OpenCall: `Cmd+Shift+A`
2. Enter URL: `https://jsonplaceholder.typicode.com/todos/1`
3. Method: `GET`
4. Press `Cmd+Enter` (or click Send)
5. **Expected:** JSON response with status 200

---

## Debug Console Check

**View → Debug Console** should show:

```
✅ [Extension] Activating OpenCall extension...
✅ [Extension] Storage manager initialized successfully
✅ [Extension] Request manager initialized
✅ [Extension] Collection manager initialized
✅ [Extension] Environment manager initialized
✅ [Extension] All services registered in ServiceRegistry
✅ [Extension] OpenCall extension activated successfully
```

---

## Verification Checklist

```bash
# Check build outputs exist
ls out/extension.js          # Should be ~575KB
ls dist/bundle.js            # Should be ~1.58MB  
ls dist/sidebar.js           # Should be ~233KB

# Check no TypeScript errors
npm run compile              # Should exit with no errors

# Check lint (optional)
npm run lint                 # Should pass or show warnings only
```

---

## All Available Commands

| Command | What it does |
|---------|--------------|
| `opencall.open` | Open main API client panel |
| `opencall.newRequest` | Create and open new request |
| `opencall.createRequest` | Create a request |
| `opencall.sendRequest` | Send HTTP request |
| `opencall.saveRequest` | Save request to storage |
| `opencall.deleteRequest` | Delete a request |
| `opencall.duplicateRequest` | Clone a request |
| `opencall.createCollection` | Create new collection |
| `opencall.importCollection` | Import Postman/OpenCall collection |
| `opencall.exportCollection` | Export collection to file |
| `opencall.deleteCollection` | Delete a collection |
| `opencall.createEnvironment` | Create new environment |
| `opencall.switchEnvironment` | Switch active environment |
| `opencall.editEnvironment` | Edit environment variables |
| `opencall.deleteEnvironment` | Delete an environment |
| `opencall.refreshExplorer` | Refresh collections view |

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension won't activate | Run `npm run build` then restart (Cmd+R) |
| Commands not in palette | Check package.json, restart host |
| TypeScript errors | Run `npm run compile` to see details |
| Old build cached | Run `npm run clean && npm run build` |

---

## File Evidence for Fixes

```
✅ src/extension.ts - DELETED (duplicate removed)
✅ src/extension/MainWebViewPanel.ts:27-35 - Updated constructor (5 params)
✅ src/core/environment-manager.ts:206-209 - Added key parameter to addVariable
```

---

## Performance Benchmarks

- Extension activation: < 500ms
- Simple GET request: < 2s
- Memory usage: < 100MB
- Build time: < 10s

---

## Ready to Commit?

```bash
# Check git status
git status

# Stage changes
git add -A

# Commit
git commit -m "fix: resolve TypeScript errors and complete service integration"

# Push
git push origin <branch>
```

---

## Next Phase: Priority 1 Integration Complete

After validation passes, proceed to:
1. **Priority 2**: Full webview-service integration
2. **Priority 3**: End-to-end feature testing
3. **Priority 4**: Unit test coverage

---

**Need detailed steps?** See [VALIDATION_GUIDE.md](./VALIDATION_GUIDE.md)
