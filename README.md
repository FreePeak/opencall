# OpenCall - VSCode API Client with P2P Collaboration

A VSCode extension that provides comprehensive API testing capabilities with peer-to-peer synchronization for team collaboration.

## Features

### Core Functionality
- **REST API Client**: Full HTTP client with GET, POST, PUT, DELETE, PATCH methods
- **gRPC Client**: Native gRPC support with proto file parsing
- **Swagger/OpenAPI Client**: Import and test OpenAPI specifications
- **Request Collections**: Organize requests in collections and folders
- **Environment Variables**: Support for multiple environments with variable substitution
- **Test Scripts**: JavaScript-based test execution for responses
- **History & Favorites**: Track request history and mark favorite requests for quick access

### Team Collaboration & Management
- **Team Management**: Create teams with unlimited members
- **Role-Based Access**: Admin, Lead, and Member roles with granular permissions
  - **Admin**: Full control over team settings, member management, and roles
  - **Lead**: Can add/remove members and manage shared resources
  - **Member**: Full access to shared collections and environments
- **Full Resource Access**: All team members have complete access to shared collections and environments
- **Real-time Sync**: Automatic synchronization of changes across team members

### P2P Synchronization & Discovery
- **Local Network P2P**: Direct peer-to-peer synchronization on internal networks
- **mDNS Discovery**: Automatic peer discovery on local network without external servers
- **Real-time Updates**: Changes sync instantly among connected team members
- **Conflict Resolution**: Automatic detection and resolution of conflicting changes
- **Offline Support**: Work offline and sync when reconnected
- **Selective Sync**: Choose which collections to share with specific teams

### Import/Export Features
- **Postman v2.0 & v2.1**: Full support for Postman collection import with all request details
  - Headers, authentication, body (raw, form-data, urlencoded, GraphQL)
  - Pre-request scripts and test scripts
  - Nested folders and request organization
- **OpenAPI/Swagger**: Export and import OpenAPI specifications
- **Custom Format**: Export to OpenCall JSON format for version control and sharing

## Quick Start

1. Install the extension from VSCode Marketplace
2. Open the command palette (Cmd+Shift+P / Ctrl+Shift+P)
3. Type "OpenCall: Open API Client" to launch the client
4. Create your first request or import from Postman/Swagger

## Installation

### From VSCode Marketplace
1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "OpenCall"
4. Click Install

### From Source
```bash
git clone https://github.com/opencall/opencall.git
cd opencall
npm install
npm run compile
```

## P2P Setup

### Starting a P2P Session
1. Open OpenCall panel
2. Click "Start P2P Session" in the collaboration tab
3. Share your peer ID with team members
4. Team members can connect using your ID

### Joining a P2P Session
1. Get peer ID from session creator
2. Click "Join Session"
3. Enter the peer ID
4. Select collections to sync

## Development

See [Development Guide](docs/development.md) for detailed setup instructions.

## Architecture

See [Architecture Documentation](docs/architecture.md) for system design details.

## API Documentation

See [API Reference](docs/api.md) for extension API documentation.

## Project Roadmap

### ✅ Completed (Phase 1-2)
- Extension skeleton with VSCode integration
- Command registration system
- VSCode-compatible storage (GlobalState)
- Basic export/import functionality for collections and environments
- Extension packaging and distribution
- Default data initialization

### 🔄 Phase 3: Core Request Management (High Priority)
- [ ] Request Form UI for creation/editing
- [ ] HTTP Method Selection dropdown
- [ ] URL Input with validation and history
- [ ] Headers Editor with auto-suggest
- [ ] Body Editor (raw text, JSON, form-data, binary)
- [ ] Auth Editor (Basic, Bearer Token, API Key)
- [ ] Query Parameters Editor
- [ ] HTTP Client implementation (axios-based)
- [ ] Response Viewer with pretty-printing
- [ ] Response Headers display
- [ ] Response Timing metrics
- [ ] Status Code display with color coding
- [ ] Save/Load Request functionality
- [ ] Request History tracking
- [ ] Duplicate Request feature

### 📋 Phase 4: Collection Management (High Priority)
- [ ] Collection Tree View
- [ ] Nested Folder Support
- [ ] Drag & Drop reordering
- [ ] Collection Properties editing
- [ ] Bulk Operations
- [ ] Create new collections
- [ ] Rename/Delete collections
- [ ] Move requests between collections

### 🌍 Phase 5: Environment Management (Medium Priority)
- [ ] Environment Editor UI
- [ ] Variable Types support (string, number, boolean, JSON)
- [ ] Environment Switching
- [ ] Variable Resolution ({{variable}} substitution)
- [ ] Environment Scoping
- [ ] Secret Variables (encrypted)
- [ ] Environment Templates
- [ ] Environment Export/Import

### ✅ Phase 6: Testing & Validation (Medium Priority)
- [ ] Pre-request Scripts
- [ ] Post-response Tests
- [ ] Test Results display
- [ ] Test Assertions library
- [ ] Schema Validation (JSON Schema)
- [ ] Response Assertions
- [ ] Performance Tests

### 🚀 Phase 7: Advanced Request Features (Medium Priority)
- [ ] Request Templates
- [ ] Cookie Management
- [ ] Redirect Following
- [ ] SSL/TLS Options
- [ ] Proxy Support
- [ ] Response Export
- [ ] Response Search
- [ ] Response Comparison
- [ ] Response History

### 🔧 Phase 8: API Specification Support (Low Priority)
- [ ] OpenAPI Import
- [ ] Swagger 2.0 Import
- [ ] Schema Validation
- [ ] Auto-complete
- [ ] Interactive API Docs
- [ ] Request Generation from docs

### 🌐 Phase 9: P2P Synchronization (Future)
- Real-time peer-to-peer collaboration
- WebRTC-based synchronization
- Conflict detection and resolution
- Selective sync for collections
- Extension points already defined

## Implementation Tasks

See [Implementation Todos](docs/implementation-todos.md) for detailed task breakdown by phase.

### Current Focus Areas:
1. **Phase 1: Core Infrastructure** - Extension entry point, configuration management, storage layer
2. **Phase 2: Tree View Providers** - Explorer, history, and P2P session UI
3. **Phase 3: Request Management** - Core API testing functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Documentation

- [Development Guide](docs/development.md) - Setup and development instructions
- [Architecture](docs/architecture.md) - System design and architecture
- [API Reference](docs/api.md) - Extension API documentation
- [Implementation Todos](docs/implementation-todos.md) - Detailed task list
- [Data Models](docs/data-models.md) - Data structure documentation
- [P2P Synchronization](docs/p2p-synchronization.md) - P2P collaboration details
- [OpenCall Implementation Plan](docs/opencall-implementation-plan.md) - Overall implementation strategy

## Connect with OpenCall

- **GitHub**: [https://github.com/opencall/opencall](https://github.com/opencall/opencall)
- **Issues**: [https://github.com/opencall/opencall/issues](https://github.com/opencall/opencall/issues)
- **Discussions**: [https://github.com/opencall/opencall/discussions](https://github.com/opencall/opencall/discussions)

## License

MIT License - see [LICENSE](LICENSE) for details.