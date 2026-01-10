.PHONY: help build package install reinstall clean dev watch

# Variables
EXTENSION_ID := opencall
VSIX_FILE := opencall.vsix
VSCODE_EXTENSIONS_DIR := ~/.vscode/extensions
PACKAGE_NAME := opencall
PUBLISHER := opencall

help:
	@echo "OpenCall Extension Build & Install Commands"
	@echo "============================================"
	@echo ""
	@echo "Available targets:"
	@echo "  make build          - Build extension and webview bundles"
	@echo "  make package        - Build and create VSIX package"
	@echo "  make install        - Install the VSIX package to VS Code"
	@echo "  make reinstall      - Clean uninstall and force reinstall"
	@echo "  make uninstall      - Remove extension from VS Code"
	@echo "  make clean          - Remove build artifacts"
	@echo "  make dev            - Development mode (watch & build)"
	@echo "  make watch-dev      - Watch files and rebuild on changes"
	@echo "  make lint           - Run linter"
	@echo "  make lint-fix       - Fix linting errors"
	@echo ""
	@echo "Quick start:"
	@echo "  make build && make reinstall"
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
install: package
	@echo "📥 Installing extension to VS Code..."
	@code --install-extension $(VSIX_FILE)
	@echo "✅ Extension installed successfully"

# Force uninstall
uninstall:
	@echo "🗑️  Uninstalling OpenCall extension..."
	@code --uninstall-extension $(PUBLISHER).$(EXTENSION_ID) 2>/dev/null || true
	@echo "✅ Extension uninstalled"

# Force reinstall (uninstall + install)
reinstall: uninstall package install
	@echo "✅ Extension reinstalled successfully"

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
version:
	@code --version

# List installed VS Code extensions
extensions:
	@code --list-extensions | grep -i opencall || echo "OpenCall not installed"

# Open VS Code with the project
open:
	@code .

# Install dependencies
install-deps:
	@echo "📚 Installing dependencies..."
	@npm install
	@echo "✅ Dependencies installed"
