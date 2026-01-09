/* eslint-disable @typescript-eslint/no-explicit-any */
// Core data types for OpenCall extension

export interface OpenCallConfig {
  general: {
    theme: 'auto' | 'light' | 'dark';
    autoSave: boolean;
  };
  request: {
    timeout: number;
    followRedirects: boolean;
    maxRedirects: number;
    validateSSL: boolean;
    sendCookies: boolean;
    storeCookies: boolean;
  };
  ui: {
    sidebarWidth: number;
    responseViewMode: 'pretty' | 'raw' | 'preview';
    showLineNumbers: boolean;
  };
  p2p: {
    enabled: boolean;
    autoConnect: boolean;
    discoveryMethods: string[];
    signalingServer: string;
  };
  security: {
    encryptLocalData: boolean;
    sessionTimeout: number;
    maskSecrets: boolean;
  };
  performance: {
    batchSize: number;
    compressionEnabled: boolean;
    deltaSyncEnabled: boolean;
  };
}

export interface Request {
  id: string;
  name: string;
  description?: string;
  method: HttpMethod;
  url: string;
  headers?: RequestHeader[];
  body?: RequestBody;
  auth?: Authentication;
  tests?: TestScript[];
  collectionId?: string;
  folderId?: string;
  tags?: string[];
  params?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  lastSentAt?: Date;
}

export interface RequestHeader {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface RequestBody {
  mode: BodyMode;
  raw?: string;
  json?: any;
  form?: FormDataEntry[];
  binary?: BinaryData[];
  graphql?: GraphQLQuery;
}

export type BodyMode = 'raw' | 'json' | 'form' | 'binary' | 'graphql';

export interface FormDataEntry {
  key: string;
  value: string;
  type: 'text' | 'file';
  enabled: boolean;
  description?: string;
}

export interface BinaryData {
  key: string;
  filename: string;
  content: ArrayBuffer | string;
  contentType?: string;
}

export interface GraphQLQuery {
  query: string;
  variables?: any;
}

export interface Authentication {
  type: AuthType;
  bearer?: BearerAuth;
  basic?: BasicAuth;
  apiKey?: ApiKeyAuth;
  oauth2?: OAuth2Auth;
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2';

export interface BearerAuth {
  token: string;
}

export interface BasicAuth {
  username: string;
  password: string;
}

export interface ApiKeyAuth {
  key: string;
  value: string;
  addTo: 'header' | 'query';
  keyName?: string;
}

export interface OAuth2Auth {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenUrl?: string;
  authUrl?: string;
  redirectUrl?: string;
  scope?: string[];
}

export interface Response {
  id: string;
  requestId: string;
  status: number;
  statusText: string;
  headers: ResponseHeader[];
  body: string;
  size: number;
  time: number;
  cookies: Cookie[];
  createdAt: Date;
}

export interface ResponseHeader {
  key: string;
  value: string;
}

export interface Cookie {
  id: string;
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  createdAt: Date;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  items: (Collection | Request)[];
  auth?: Authentication;
  variables?: EnvironmentVariable[];
  scripts?: CollectionScripts;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionScripts {
  preRequest?: TestScript;
  postResponse?: TestScript;
}

export interface Folder extends Collection {
  type: 'folder';
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  type: 'string' | 'boolean' | 'number' | 'json';
  enabled: boolean;
  description?: string;
  secret?: boolean;
}

export interface TestScript {
  id: string;
  name: string;
  script: string;
  type: 'pre-request' | 'post-response';
  enabled: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface RequestExecution {
  id: string;
  requestId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  response?: Response;
  error?: string;
  testResults?: TestResult[];
}

export interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  message?: string;
  executionTime: number;
}