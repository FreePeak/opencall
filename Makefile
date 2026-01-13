.PHONY: help build package install reinstall clean dev watch install-all install-vscode install-cursor install-antigravity uninstall-all uninstall-vscode uninstall-cursor uninstall-antigravity reinstall-all

# Variables
EXTENSION_ID := opencall
VSIX_FILE := opencall.vsix
VSCODE_EXTENSIONS_DIR := ~/.vscode/extensions
CURSOR_EXTENSIONS_DIR := ~/.cursor/extensions
ANTIGRAVITY_EXTENSIONS_DIR := ~/.antigravity/extensions
PACKAGE_NAME := opencall
PUBLISHER := opencall

# Editor binaries
CODE_BIN := code
CURSOR_BIN := cursor
ANTIGRAVITY_BIN := antigravity

help:
	@echo "OpenCall Extension Build & Install Commands"
	@echo "============================================"
	@echo ""
	@echo "Build & Package:"
	@echo "  make build          - Build extension and webview bundles"
	@echo "  make package        - Build and create VSIX package"
	@echo "  make clean          - Remove build artifacts"
	@echo ""
	@echo "Install to Single Editor:"
	@echo "  make install-vscode      - Install to VS Code only"
	@echo "  make install-cursor      - Install to Cursor only"
	@echo "  make install-antigravity - Install to Antigravity only"
	@echo ""
	@echo "Install to All Editors:"
	@echo "  make install-all    - Install to VS Code, Cursor, and Antigravity"
	@echo "  make reinstall-all  - Clean uninstall and reinstall to all editors"
	@echo ""
	@echo "Uninstall:"
	@echo "  make uninstall-vscode      - Remove from VS Code"
	@echo "  make uninstall-cursor      - Remove from Cursor"
	@echo "  make uninstall-antigravity - Remove from Antigravity"
	@echo "  make uninstall-all         - Remove from all editors"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Development mode (watch & build)"
	@echo "  make watch-dev      - Watch files and rebuild on changes"
	@echo "  make lint           - Run linter"
	@echo "  make lint-fix       - Fix linting errors"
	@echo ""
	@echo "Legacy Commands (VS Code only):"
	@echo "  make install        - Install to VS Code (same as install-vscode)"
	@echo "  make reinstall      - Reinstall to VS Code (same as reinstall-vscode)"
	@echo "  make uninstall      - Uninstall from VS Code (same as uninstall-vscode)"
	@echo ""
	@echo "Quick start:"
	@echo "  make reinstall-all  - Build and install to all editors"
	@echo ""

# Build extension and webview
build:
	@echo "🔨 Building OpenCall extension..."
	@npm run build
	@echo "✅ Build completed successfully"

# Create VSIX package
package: build
	@echo "📦 Creating VSIX package..."
	@npm run package
	@echo "✅ Package created: $(VSIX_FILE)"

# Install extension to VS Code
install-vscode: package
	@echo "📥 Installing extension to VS Code..."
	@$(CODE_BIN) --install-extension $(VSIX_FILE)
	@echo "✅ Extension installed to VS Code successfully"

# Install extension to Cursor
install-cursor: package
	@echo "📥 Installing extension to Cursor..."
	@$(CURSOR_BIN) --install-extension $(VSIX_FILE)
	@echo "✅ Extension installed to Cursor successfully"

# Install extension to Antigravity
install-antigravity: package
	@echo "📥 Installing extension to Antigravity..."
	@$(ANTIGRAVITY_BIN) --install-extension $(VSIX_FILE)
	@echo "✅ Extension installed to Antigravity successfully"

# Install to all editors
install-all: package
	@echo "📥 Installing extension to all editors..."
	@$(MAKE) install-vscode || echo "⚠️  VS Code installation failed (may not be installed)"
	@$(MAKE) install-cursor || echo "⚠️  Cursor installation failed (may not be installed)"
	@$(MAKE) install-antigravity || echo "⚠️  Antigravity installation failed (may not be installed)"
	@echo "✅ Installation to all available editors completed"

# Legacy command for backwards compatibility (VS Code only)
install: install-vscode

# Uninstall from VS Code
uninstall-vscode:
	@echo "🗑️  Uninstalling OpenCall extension from VS Code..."
	@$(CODE_BIN) --uninstall-extension $(PUBLISHER).$(EXTENSION_ID) 2>/dev/null || true
	@echo "✅ Extension uninstalled from VS Code"

# Uninstall from Cursor
uninstall-cursor:
	@echo "🗑️  Uninstalling OpenCall extension from Cursor..."
	@$(CURSOR_BIN) --uninstall-extension $(PUBLISHER).$(EXTENSION_ID) 2>/dev/null || true
	@echo "✅ Extension uninstalled from Cursor"

# Uninstall from Antigravity
uninstall-antigravity:
	@echo "🗑️  Uninstalling OpenCall extension from Antigravity..."
	@$(ANTIGRAVITY_BIN) --uninstall-extension $(PUBLISHER).$(EXTENSION_ID) 2>/dev/null || true
	@echo "✅ Extension uninstalled from Antigravity"

# Uninstall from all editors
uninstall-all:
	@echo "🗑️  Uninstalling OpenCall extension from all editors..."
	@$(MAKE) uninstall-vscode || true
	@$(MAKE) uninstall-cursor || true
	@$(MAKE) uninstall-antigravity || true
	@echo "✅ Extension uninstalled from all editors"

# Legacy command for backwards compatibility (VS Code only)
uninstall: uninstall-vscode

# Reinstall to VS Code only
reinstall-vscode: uninstall-vscode package install-vscode
	@echo "✅ Extension reinstalled to VS Code successfully"

# Reinstall to Cursor only
reinstall-cursor: uninstall-cursor package install-cursor
	@echo "✅ Extension reinstalled to Cursor successfully"

# Reinstall to Antigravity only
reinstall-antigravity: uninstall-antigravity package install-antigravity
	@echo "✅ Extension reinstalled to Antigravity successfully"

# Reinstall to all editors
reinstall-all: uninstall-all package install-all
	@echo "✅ Extension reinstalled to all editors successfully"

# Legacy command for backwards compatibility (VS Code only)
reinstall: reinstall-vscode

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	@npm run clean
	@rm -f $(VSIX_FILE)
	@echo "✅ Clean completed"

# Development build
dev: clean build
	@echo "✅ Development build completed"

# Watch and rebuild
watch-dev:
	@echo "👀 Watching for changes..."
	@npm run watch

# Lint code
lint:
	@echo "🔍 Linting TypeScript code..."
	@npm run lint

# Fix linting errors
lint-fix:
	@echo "✏️  Fixing linting errors..."
	@npm run lint:fix
	@echo "✅ Linting fixed"

# Full development workflow (clean, lint, build)
full-build: clean lint build
	@echo "✅ Full build completed"

# Quick build and reinstall (for rapid development)
quick-reinstall: build reinstall
	@echo "✅ Quick reinstall completed"

# Show VS Code version
version-vscode:
	@echo "VS Code version:"
	@$(CODE_BIN) --version

# Show Cursor version
version-cursor:
	@echo "Cursor version:"
	@$(CURSOR_BIN) --version

# Show Antigravity version
version-antigravity:
	@echo "Antigravity version:"
	@$(ANTIGRAVITY_BIN) --version

# Show all editor versions
version-all:
	@$(MAKE) version-vscode || echo "VS Code: Not installed"
	@echo ""
	@$(MAKE) version-cursor || echo "Cursor: Not installed"
	@echo ""
	@$(MAKE) version-antigravity || echo "Antigravity: Not installed"

# Legacy command (VS Code only)
version: version-vscode

# List installed VS Code extensions
extensions-vscode:
	@echo "VS Code extensions:"
	@$(CODE_BIN) --list-extensions | grep -i opencall || echo "OpenCall not installed in VS Code"

# List installed Cursor extensions
extensions-cursor:
	@echo "Cursor extensions:"
	@$(CURSOR_BIN) --list-extensions | grep -i opencall || echo "OpenCall not installed in Cursor"

# List installed Antigravity extensions
extensions-antigravity:
	@echo "Antigravity extensions:"
	@$(ANTIGRAVITY_BIN) --list-extensions | grep -i opencall || echo "OpenCall not installed in Antigravity"

# List extensions in all editors
extensions-all:
	@$(MAKE) extensions-vscode || true
	@echo ""
	@$(MAKE) extensions-cursor || true
	@echo ""
	@$(MAKE) extensions-antigravity || true

# Legacy command (VS Code only)
extensions: extensions-vscode

# Open VS Code with the project
open-vscode:
	@$(CODE_BIN) .

# Open Cursor with the project
open-cursor:
	@$(CURSOR_BIN) .

# Open Antigravity with the project
open-antigravity:
	@$(ANTIGRAVITY_BIN) .

# Legacy command (VS Code)
open: open-vscode

# Install dependencies
install-deps:
	@echo "📚 Installing dependencies..."
	@npm install
	@echo "✅ Dependencies installed"

# Check which editors are installed
check-editors:
	@echo "Checking installed editors..."
	@echo ""
	@which $(CODE_BIN) >/dev/null 2>&1 && echo "✅ VS Code: $(shell which $(CODE_BIN))" || echo "❌ VS Code: Not found"
	@which $(CURSOR_BIN) >/dev/null 2>&1 && echo "✅ Cursor: $(shell which $(CURSOR_BIN))" || echo "❌ Cursor: Not found"
	@which $(ANTIGRAVITY_BIN) >/dev/null 2>&1 && echo "✅ Antigravity: $(shell which $(ANTIGRAVITY_BIN))" || echo "❌ Antigravity: Not found"
	@echo ""

# Show complete status
status: check-editors
	@echo "Extension Status:"
	@echo ""
	@$(MAKE) extensions-all 2>/dev/null || true
	@echo ""
	@ls -lh $(VSIX_FILE) 2>/dev/null || echo "VSIX package: Not built yet"
