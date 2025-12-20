// API modules for OpenCall extension
export { RestClient } from './rest-client';
export type { RestClientOptions, RequestConfig } from './rest-client';

// Re-export commonly used types
export type {
  Request,
  Response,
  RequestExecution,
  HttpMethod,
  Authentication,
  RequestHeader,
  RequestBody,
  EnvironmentVariable,
  Collection
} from '../types';