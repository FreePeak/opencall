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

### P2P Synchronization
- **Peer-to-Peer Sharing**: Real-time synchronization between team members
- **Local Data Storage**: All data stored locally with encrypted backup
- **Conflict Resolution**: Automatic conflict detection and resolution
- **Offline Support**: Work offline and sync when reconnected
- **Selective Sync**: Choose which collections to share with teams

### Team Collaboration
- **Real-time Updates**: See team member changes instantly
- **Version History**: Track changes with automatic versioning
- **Comments & Notes**: Add annotations to requests and collections
- **Tag Management**: Tag requests for better organization

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Connect with OpenCall

- **GitHub**: [https://github.com/opencall/opencall](https://github.com/opencall/opencall)
- **Issues**: [https://github.com/opencall/opencall/issues](https://github.com/opencall/opencall/issues)
- **Discussions**: [https://github.com/opencall/opencall/discussions](https://github.com/opencall/opencall/discussions)

## License

MIT License - see [LICENSE](LICENSE) for details.