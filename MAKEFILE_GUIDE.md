# OpenCall Makefile Usage Guide

## Overview
A convenient Makefile has been created to automate building, packaging, and installing the OpenCall extension.

## Quick Commands

### Most Common
```bash
# Full rebuild and reinstall
make reinstall

# Just build (no package/install)
make build

# Quick rebuild and reinstall
make quick-reinstall
```

### Package Management
```bash
# Build → Create VSIX package
make package

# Install VSIX to VS Code
make install

# Uninstall from VS Code
make uninstall

# Force uninstall + reinstall
make reinstall
```

### Development
```bash
# Watch files and rebuild on changes
make watch-dev

# Clean build artifacts
make clean

# Run linter
make lint

# Fix linting issues
make lint-fix

# Full build with linting
make full-build
```

### Information
```bash
# Show all available commands
make help

# Check VS Code version
make version

# List installed extensions (filter by opencall)
make extensions

# Open project in VS Code
make open
```

## How It Works

### Build Process
1. **make build** → Compiles TypeScript + builds webview bundle
   - Runs `npm run build:extension` (esbuild)
   - Runs `npm run build:webview` (webpack)

2. **make package** → Creates VSIX installation file
   - Runs `npm run build` first
   - Runs `npm run package` to create `opencall.vsix`

3. **make install** → Installs extension to VS Code
   - Uses `code --install-extension opencall.vsix`
   - Requires VS Code command-line tools

4. **make reinstall** → Complete reinstallation
   - Uninstalls previous version
   - Packages fresh build
   - Installs new version

## Installation Steps

### Option 1: Using Makefile (Recommended)
```bash
cd /Users/linh.doan/work/harvey/freepeak/opencall

# Full rebuild and reinstall
make reinstall
```

### Option 2: Manual Step-by-Step
```bash
# Build
make build

# Create package
make package

# Uninstall old version
make uninstall

# Install new version
make install
```

### Option 3: Direct Command
```bash
# Quick one-liner
make build && make package && make uninstall && make install
```

## What Gets Installed

The `opencall.vsix` file contains:
- Extension code (compiled from `src/`)
- Webview bundles (React app from `webview/`)
- All dependencies
- Configuration and package.json
- Media files and documentation

Size: ~44 MB (includes node_modules for distribution)

## Typical Development Workflow

```bash
# 1. Start development - watch for changes
make watch-dev

# In another terminal...

# 2. When ready to test in VS Code
make quick-reinstall

# 3. Check if it's installed
make extensions

# 4. Open VS Code
make open
```

## Troubleshooting

### Command not found: code
Install VS Code command-line tools:
```bash
# Open VS Code, then press Cmd+Shift+P
# Type: Install 'code' command in PATH
```

### Extension won't install
```bash
# Force uninstall first
make uninstall

# Then reinstall
make install
```

### Build errors
```bash
# Clean and rebuild
make clean
make full-build
```

### Check extension status
```bash
# List all installed extensions containing 'opencall'
make extensions

# Check VS Code version compatibility
make version
```

## File Structure

The Makefile recognizes:
- **$(VSIX_FILE)** = `opencall.vsix` (installation package)
- **$(EXTENSION_ID)** = `opencall` (VS Code identifier)
- **$(PUBLISHER)** = `opencall` (publisher name)

## Advanced Usage

### Watch + Auto-Reinstall (Development)
```bash
# Terminal 1: Watch files
make watch-dev

# Terminal 2: When ready
make quick-reinstall
```

### CI/CD Pipeline
```bash
# Clean build from scratch
make clean
make full-build
make package
```

### Debugging
```bash
# Check what's in the VSIX
cd out/extension
ls -la
```

## Makefile Targets Summary

| Command | Purpose | Calls |
|---------|---------|-------|
| help | Show this guide | - |
| build | Build extension & webview | npm run build |
| package | Create VSIX | npm run package |
| install | Install to VS Code | code --install-extension |
| reinstall | Force fresh install | uninstall → package → install |
| uninstall | Remove extension | code --uninstall-extension |
| clean | Remove artifacts | npm run clean + rm VSIX |
| dev | Clean + build | clean → build |
| watch-dev | Watch & rebuild | npm run watch |
| lint | Check code quality | npm run lint |
| lint-fix | Fix issues | npm run lint:fix |
| full-build | Clean lint build | clean → lint → build |
| quick-reinstall | Fast dev cycle | build → reinstall |
| version | Show VS Code version | code --version |
| extensions | List installed | code --list-extensions |
| open | Open in VS Code | code . |
| install-deps | Install npm packages | npm install |
