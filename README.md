# OpenCall - VSCode API Client with P2P Collaboration

A VSCode extension that provides comprehensive API testing capabilities with peer-to-peer synchronization for team collaboration.

## Features

### ✅ Working Features

- **REST API Client**: Full HTTP client with GET/POST/PUT/PATCH/DELETE methods
- **Request Collections**: Organize requests in collections with nested folders (Postman-like)
- **Collection Tree View**: Sidebar tree view with icons for collections, folders, and requests
- **Request History**: Automatic tracking of all sent requests
- **Favorites**: Mark requests as favorites for quick access
- **Environment Variables**: Multiple environments with variable substitution in requests
- **Import Collections**: Postman v2.0/v2.1 with full auth, headers, body, scripts support
- **Export Collections**: Export collections to OpenCall or Postman format
- **Configuration Management**: Customizable timeout, proxy, SSL settings

### ⚠️ Partially Implemented

- **OpenAPI/Swagger**: Basic import structure exists (needs testing)

### ❌ Not Yet Implemented

- **gRPC Client**: Planned but not implemented
- **Team Collaboration**: Type definitions only, no UI or storage integration
- **P2P Synchronization**: Skeleton code only, no networking implementation
- **GraphQL Support**: Not implemented
- **Test Scripts**: Postman test scripts are imported but not executed
- **Pre-request Scripts**: Scripts imported but not executed

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Extension
```bash
make build              # Build extension + webview
npm run compile         # TypeScript compilation only
npm run watch           # Watch mode for development
```

### 3. Install to Editors
```bash
# Install to all editors (VS Code, Cursor, Antigravity)
make install-all

# Or install to specific editor
make install-vscode
make install-cursor
make install-antigravity
```

### 4. Development Workflow
```bash
# Recommended: Reinstall after making changes
make reinstall-all      # Uninstall → package → install all

# Or for specific editor
make reinstall-vscode
make reinstall-cursor
make reinstall-antigravity
```

---

## Makefile Commands Reference

### Build Commands

| Command | Description |
|---------|-------------|
| `make build` | Build extension and webview bundles |
| `make compile` | Compile TypeScript only |
| `make watch` | Watch mode for development |
| `make build:extension` | Build extension bundle only |
| `make build:webview` | Build webview bundle only |
| `make watch:webview` | Watch webview changes |
| `make clean` | Remove build artifacts (out/, dist/) |

### Package Commands

| Command | Description |
|---------|-------------|
| `make package` | Build + create VSIX package |
| `make clean-package` | Remove old VSIX and package new one |

### Installation Commands

| Command | Description |
|---------|-------------|
| `make install-vscode` | Install to VS Code only |
| `make install-cursor` | Install to Cursor only |
| `make install-antigravity` | Install to Antigravity only |
| `make install-all` | Install to all available editors |

### Reinstallation Commands (Recommended for Testing)

| Command | Description |
|---------|-------------|
| `make reinstall-vscode` | Uninstall → package → install (VS Code) |
| `make reinstall-cursor` | Uninstall → package → install (Cursor) |
| `make reinstall-antigravity` | Uninstall → package → install (Antigravity) |
| `make reinstall-all` | Uninstall all → package → install all |

### Uninstallation Commands

| Command | Description |
|---------|-------------|
| `make uninstall-vscode` | Uninstall from VS Code |
| `make uninstall-cursor` | Uninstall from Cursor |
| `make uninstall-antigravity` | Uninstall from Antigravity |
| `make uninstall-all` | Uninstall from all editors |

### Status & Information Commands

| Command | Description |
|---------|-------------|
| `make status` | Show complete status (editors + extensions + VSIX) |
| `make check-editors` | Check which editors are installed |
| `make extensions-all` | List OpenCall in all editors |
| `make version-all` | Show all editor versions |

### Linting Commands

| Command | Description |
|---------|-------------|
| `make lint` | Run ESLint on codebase |
| `make lint-fix` | Auto-fix linting issues |

### Testing Commands

| Command | Description |
|---------|-------------|
| `make test` | Run test suite |
| `make test-watch` | Run tests in watch mode |

---

## Development Workflow

### Making Changes

1. **Edit code** in `src/` or `webview/`
2. **Check TypeScript**: `npm run compile`
3. **Build**: `make build`
4. **Reinstall**: `make reinstall-all`
5. **Test** in VS Code, Cursor, or Antigravity
6. **Verify status**: `make status`

### Typical Development Session

```bash
# Start watch mode in one terminal
make watch

# In another terminal, reinstall when ready to test
make reinstall-all

# Check installation status
make status

# Open VS Code and press F5 to launch Extension Development Host
code .
```

### Before Committing

```bash
# Ensure clean build
npm run compile        # 0 errors
make lint              # No linting errors
make build             # Successful build
make reinstall-all     # Test installation
```

---

## Troubleshooting

### Extension Not Appearing

```bash
# Check if editors are installed
make check-editors

# Check if extension is installed
make extensions-all

# Try reinstalling
make reinstall-all

# Check status
make status
```

### Build Errors

```bash
# Clean and rebuild
make clean
npm install
make build
```

### TypeScript Errors

```bash
# Check for errors
npm run compile

# If errors persist, check:
# - src/types/*.ts (type definitions)
# - tsconfig.json (TypeScript config)
```

---

## Project Structure

```
opencall/
├── src/
│   ├── extension/          # VSCode extension code
│   │   ├── extension.ts    # Main entry point
│   │   ├── handlers/       # Command handlers
│   │   ├── CollectionTreeProvider.ts
│   │   └── CollectionTreeItem.ts
│   ├── core/               # Business logic
│   │   ├── collection-manager.ts
│   │   ├── request-manager.ts
│   │   └── environment-manager.ts
│   ├── storage/            # Persistence layer
│   ├── api/                # API clients (REST, gRPC)
│   ├── types/              # TypeScript types
│   └── utils/              # Utilities
├── webview/                # React UI
│   ├── features/           # Feature components
│   ├── pages/              # Page components
│   └── shared/             # Shared UI utilities
├── out/                    # Compiled extension
├── dist/                   # Bundled webview
├── docs/                   # Documentation
│   ├── TODO.md             # Development roadmap
│   ├── PHASE1_WEEK1_PLAN.md
│   ├── VALIDATION_GUIDE.md
│   └── ...
├── Makefile                # Build commands
├── package.json            # Extension manifest
└── README.md               # This file
```

---

## Documentation

### Development Documentation
- **[docs/TODO.md](docs/TODO.md)** - Current development roadmap and task list
- **[docs/PHASE1_WEEK1_PLAN.md](docs/PHASE1_WEEK1_PLAN.md)** - Detailed Week 1 implementation plan
- **[docs/NEXT_STEPS.md](docs/NEXT_STEPS.md)** - Overall project roadmap (all phases)
- **[docs/development.md](docs/development.md)** - Development setup guide
- **[docs/architecture.md](docs/architecture.md)** - System architecture

### Testing & Validation
- **[docs/VALIDATION_GUIDE.md](docs/VALIDATION_GUIDE.md)** - Comprehensive testing procedures
- **[docs/QUICK_VALIDATION.md](docs/QUICK_VALIDATION.md)** - 5-minute validation guide

### Makefile & Installation
- **[docs/MAKEFILE_MULTI_EDITOR_GUIDE.md](docs/MAKEFILE_MULTI_EDITOR_GUIDE.md)** - Complete Makefile usage guide

### Technical Documentation
- **[docs/api.md](docs/api.md)** - Extension API reference
- **[docs/data-models.md](docs/data-models.md)** - Data structure documentation
- **[docs/p2p-synchronization.md](docs/p2p-synchronization.md)** - P2P collaboration details

### Guidelines
- **[AGENTS.md](AGENTS.md)** - AI coding agent guidelines for this project

---

## Current Status

**Phase:** 1 - Collection Management  
**Week:** 1 - Collection Tree View & Structure  
**Day:** 2 - Collection Manager Enhancements  

**Build Status:**
- ✅ TypeScript: 0 errors
- ✅ Extension bundle: 582.9 KB
- ✅ Webview bundle: 1.58 MB
- ✅ Installed in: VS Code, Cursor, Antigravity

See [docs/TODO.md](docs/TODO.md) for detailed task breakdown.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run compile` and `make lint`
5. Test with `make reinstall-all`
6. Submit a pull request

---

## Connect with OpenCall

- **GitHub**: [https://github.com/opencall/opencall](https://github.com/opencall/opencall)
- **Issues**: [https://github.com/opencall/opencall/issues](https://github.com/opencall/opencall/issues)
- **Discussions**: [https://github.com/opencall/opencall/discussions](https://github.com/opencall/opencall/discussions)

---

## License

MIT License - see [LICENSE](LICENSE) for details.
