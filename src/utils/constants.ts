// Constants for OpenCall extension

export const EXTENSION_ID = 'opencall.opencall';

export const COMMANDS = {
  // Core commands
  OPEN: 'opencall.open',
  CREATE_REQUEST: 'opencall.createRequest',
  SEND_REQUEST: 'opencall.sendRequest',
  SAVE_REQUEST: 'opencall.saveRequest',
  DELETE_REQUEST: 'opencall.deleteRequest',

  // Collection commands
  CREATE_COLLECTION: 'opencall.createCollection',
  CREATE_FOLDER: 'opencall.createFolder',
  DELETE_COLLECTION: 'opencall.deleteCollection',
  RENAME_COLLECTION: 'opencall.renameCollection',
  EXPORT_COLLECTION: 'opencall.exportCollection',
  IMPORT_COLLECTION: 'opencall.importCollection',

  // Environment commands
  CREATE_ENVIRONMENT: 'opencall.createEnvironment',
  SWITCH_ENVIRONMENT: 'opencall.switchEnvironment',
  MANAGE_ENVIRONMENTS: 'opencall.manageEnvironments',

  // P2P commands
  START_P2P_SESSION: 'opencall.startP2PSession',
  JOIN_P2P_SESSION: 'opencall.joinP2PSession',
  STOP_P2P_SESSION: 'opencall.stopP2PSession',

  // gRPC commands
  LOAD_PROTO_FILE: 'opencall.loadProtoFile',

  // OpenAPI commands
  GENERATE_FROM_OPENAPI: 'opencall.generateFromOpenAPI',

  // UI commands
  REFRESH_EXPLORER: 'opencall.refreshExplorer',
  TOGGLE_SIDEBAR: 'opencall.toggleSidebar',
} as const;

export const VIEWS = {
  EXPLORER: 'opencall-explorer',
  HISTORY: 'opencall-history',
  P2P_SESSION: 'opencall-p2p',
} as const;

export const VIEW_CONTAINERS = {
  ACTIVITY_BAR: 'opencall',
} as const;

export const CONTEXT_KEYS = {
  ENABLED: 'opencall:enabled',
  P2P_ENABLED: 'opencall:p2p-enabled',
  HAS_SELECTION: 'opencall:hasSelection',
  IS_REQUEST: 'opencall:isRequest',
  IS_COLLECTION: 'opencall:isCollection',
  IS_FOLDER: 'opencall:isFolder',
} as const;

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS',
} as const;

export const AUTH_TYPES = {
  NONE: 'none',
  BEARER: 'bearer',
  BASIC: 'basic',
  APIKEY: 'apikey',
  OAUTH2: 'oauth2',
} as const;

export const BODY_MODES = {
  RAW: 'raw',
  JSON: 'json',
  FORM: 'form',
  BINARY: 'binary',
  GRAPHQL: 'graphql',
} as const;

export const RESPONSE_VIEW_MODES = {
  PRETTY: 'pretty',
  RAW: 'raw',
  PREVIEW: 'preview',
} as const;

export const THEMES = {
  AUTO: 'auto',
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export const DEFAULT_CONFIG = {
  general: {
    theme: THEMES.AUTO as const,
    autoSave: true,
  },
  request: {
    timeout: 30000,
    followRedirects: true,
    maxRedirects: 10,
    validateSSL: true,
    sendCookies: true,
    storeCookies: true,
  },
  ui: {
    sidebarWidth: 400,
    responseViewMode: RESPONSE_VIEW_MODES.PRETTY as const,
    showLineNumbers: true,
  },
  p2p: {
    enabled: false,
    autoConnect: false,
    discoveryMethods: ['webrtc', 'mdns'],
    signalingServer: '',
  },
  security: {
    encryptLocalData: true,
    sessionTimeout: 3600000,
    maskSecrets: true,
  },
  performance: {
    batchSize: 100,
    compressionEnabled: true,
    deltaSyncEnabled: true,
  },
} as const;

export const MIMETYPES = {
  JSON: 'application/json',
  XML: 'application/xml',
  HTML: 'text/html',
  TEXT: 'text/plain',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART_FORM: 'multipart/form-data',
  BINARY: 'application/octet-stream',
  GRAPHQL: 'application/graphql',
} as const;

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;