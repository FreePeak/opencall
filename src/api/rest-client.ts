import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  RawAxiosRequestHeaders
} from 'axios';
import { Request, Response, HttpMethod, RequestExecution, Authentication } from '../types';
import { logger } from '../utils/logger';
import { generateId, formatBytes, formatDuration, substituteVariables } from '../utils/helpers';
import { EnvironmentVariable } from '../types';

export interface RestClientOptions {
  timeout?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
  validateSSL?: boolean;
  sendCookies?: boolean;
  storeCookies?: boolean;
}

export interface RequestConfig {
  request: Request;
  environment?: EnvironmentVariable[];
  additionalVars?: Record<string, string>;
  options?: RestClientOptions;
}

export class RestClient {
  private axiosInstance: AxiosInstance;
  private cookieJar: Map<string, string> = new Map();
  private options: RestClientOptions;

  constructor(options: RestClientOptions = {}) {
    this.options = {
      timeout: 30000,
      followRedirects: true,
      maxRedirects: 10,
      validateSSL: true,
      sendCookies: true,
      storeCookies: true,
      ...options
    };

    this.axiosInstance = axios.create({
      timeout: this.options.timeout,
      maxRedirects: this.options.maxRedirects,
      validateStatus: () => true, // Don't throw on HTTP errors
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug(`Sending ${config.method?.toUpperCase()} request to ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const duration = response.config.metadata?.endTime
          ? response.config.metadata.endTime - response.config.metadata.startTime
          : 0;

        logger.debug(
          `Received ${response.status} response in ${formatDuration(duration)}`
        );
        return response;
      },
      (error) => {
        logger.error('Response interceptor error', error);
        return Promise.reject(error);
      }
    );
  }

  async sendRequest(config: RequestConfig): Promise<RequestExecution> {
    const execution: RequestExecution = {
      id: generateId(),
      requestId: config.request.id,
      status: 'pending',
      startTime: new Date()
    };

    try {
      execution.status = 'running';
      const axiosConfig = await this.buildAxiosConfig(config);
      const response = await this.axiosInstance.request(axiosConfig);

      execution.endTime = new Date();
      execution.response = this.convertResponse(response, config.request.id);
      execution.status = 'completed';

      logger.info(
        `Request completed successfully: ${config.request.method} ${config.request.url}`
      );

    } catch (error) {
      execution.endTime = new Date();
      execution.status = 'failed';
      execution.error = this.handleError(error);

      logger.error(
        `Request failed: ${config.request.method} ${config.request.url}`,
        execution.error
      );
    }

    return execution;
  }

  private async buildAxiosConfig(config: RequestConfig): Promise<AxiosRequestConfig> {
    const { request, environment, additionalVars } = config;

    // Substitute variables in URL
    const url = substituteVariables(request.url, environment || [], additionalVars);

    // Build headers
    const headers = await this.buildHeaders(request, environment, additionalVars);

    // Build request body
    const data = await this.buildRequestBody(request, environment, additionalVars);

    // Build query parameters
    const params = this.buildQueryParams(url, environment, additionalVars);

    // Build authentication
    const auth = await this.buildAuthentication(request.auth, environment, additionalVars);

    const axiosConfig: AxiosRequestConfig = {
      method: request.method.toLowerCase() as any,
      url,
      headers,
      data,
      params,
      validateStatus: () => true,
      maxRedirects: this.options.followRedirects ? this.options.maxRedirects : 0,
    };

    // Add metadata for timing
    axiosConfig.metadata = {
      startTime: Date.now()
    };

    // SSL validation
    if (!this.options.validateSSL) {
      axiosConfig.httpsAgent = new (require('https').Agent)({
        rejectUnauthorized: false
      });
    }

    return axiosConfig;
  }

  private async buildHeaders(
    request: Request,
    environment?: EnvironmentVariable[],
    additionalVars?: Record<string, string>
  ): Promise<RawAxiosRequestHeaders> {
    const headers: RawAxiosRequestHeaders = {};

    // Add default headers
    headers['User-Agent'] = 'OpenCall/1.0.0';

    // Add request headers
    if (request.headers) {
      for (const header of request.headers) {
        if (header.enabled) {
          const key = substituteVariables(header.key, environment || [], additionalVars);
          const value = substituteVariables(header.value, environment || [], additionalVars);
          headers[key] = value;
        }
      }
    }

    // Add content-type based on body mode
    if (request.body) {
      const contentType = this.getContentTypeFromBody(request.body);
      if (contentType && !headers['Content-Type']) {
        headers['Content-Type'] = contentType;
      }
    }

    // Add authentication headers
    const authHeaders = await this.getAuthHeaders(request.auth, environment, additionalVars);
    Object.assign(headers, authHeaders);

    // Add cookies if enabled
    if (this.options.sendCookies) {
      const cookieHeader = this.buildCookieHeader(request.url);
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }
    }

    return headers;
  }

  private async buildRequestBody(
    request: Request,
    environment?: EnvironmentVariable[],
    additionalVars?: Record<string, string>
  ): Promise<any> {
    if (!request.body) {
      return undefined;
    }

    switch (request.body.mode) {
      case 'raw':
        return substituteVariables(request.body.raw || '', environment || [], additionalVars);

      case 'json':
        return request.body.json;

      case 'form':
        if (request.body.form) {
          const formData = new URLSearchParams();
          for (const entry of request.body.form) {
            if (entry.enabled) {
              const key = substituteVariables(entry.key, environment || [], additionalVars);
              const value = substituteVariables(entry.value, environment || [], additionalVars);
              formData.append(key, value);
            }
          }
          return formData.toString();
        }
        return undefined;

      case 'binary':
        // Binary data should be handled separately
        return undefined;

      case 'graphql':
        if (request.body.graphql) {
          return {
            query: substituteVariables(request.body.graphql.query, environment || [], additionalVars),
            variables: request.body.graphql.variables
          };
        }
        return undefined;

      default:
        return undefined;
    }
  }

  private buildQueryParams(
    url: string,
    environment?: EnvironmentVariable[],
    additionalVars?: Record<string, string>
  ): Record<string, string> {
    try {
      const urlObj = new URL(url);
      const params: Record<string, string> = {};

      urlObj.searchParams.forEach((value, key) => {
        params[key] = substituteVariables(value, environment || [], additionalVars);
      });

      return params;
    } catch {
      return {};
    }
  }

  private async buildAuthentication(
    auth?: Authentication,
    environment?: EnvironmentVariable[],
    additionalVars?: Record<string, string>
  ): Promise<any> {
    if (!auth || auth.type === 'none') {
      return undefined;
    }

    switch (auth.type) {
      case 'basic':
        if (auth.basic) {
          return {
            username: substituteVariables(auth.basic.username, environment || [], additionalVars),
            password: substituteVariables(auth.basic.password, environment || [], additionalVars)
          };
        }
        break;

      case 'bearer':
        if (auth.bearer) {
          return {
            token: substituteVariables(auth.bearer.token, environment || [], additionalVars)
          };
        }
        break;
    }

    return undefined;
  }

  private async getAuthHeaders(
    auth?: Authentication,
    environment?: EnvironmentVariable[],
    additionalVars?: Record<string, string>
  ): Promise<RawAxiosRequestHeaders> {
    const headers: RawAxiosRequestHeaders = {};

    if (!auth || auth.type === 'none') {
      return headers;
    }

    switch (auth.type) {
      case 'bearer':
        if (auth.bearer) {
          const token = substituteVariables(auth.bearer.token, environment || [], additionalVars);
          headers['Authorization'] = `Bearer ${token}`;
        }
        break;

      case 'apikey':
        if (auth.apiKey) {
          const key = substituteVariables(auth.apiKey.key, environment || [], additionalVars);
          const value = substituteVariables(auth.apiKey.value, environment || [], additionalVars);
          const keyName = auth.apiKey.keyName || 'X-API-Key';

          if (auth.apiKey.addTo === 'header') {
            headers[keyName] = value;
          }
          // Query parameter handling would be done in buildQueryParams
        }
        break;

      case 'oauth2':
        if (auth.oauth2?.accessToken) {
          const token = substituteVariables(auth.oauth2.accessToken, environment || [], additionalVars);
          headers['Authorization'] = `Bearer ${token}`;
        }
        break;
    }

    return headers;
  }

  private getContentTypeFromBody(body: any): string | undefined {
    switch (body.mode) {
      case 'json':
        return 'application/json';
      case 'form':
        return 'application/x-www-form-urlencoded';
      case 'graphql':
        return 'application/json';
      case 'binary':
        return 'application/octet-stream';
      default:
        return undefined;
    }
  }

  private buildCookieHeader(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      const cookies: string[] = [];

      this.cookieJar.forEach((value, key) => {
        // Basic cookie matching - in a real implementation, this would be more sophisticated
        cookies.push(`${key}=${value}`);
      });

      return cookies.length > 0 ? cookies.join('; ') : undefined;
    } catch {
      return undefined;
    }
  }

  private convertResponse(axiosResponse: AxiosResponse, requestId: string): Response {
    const duration = axiosResponse.config.metadata?.endTime
      ? axiosResponse.config.metadata.endTime - axiosResponse.config.metadata.startTime
      : 0;

    const headers: Record<string, string> = {};
    Object.entries(axiosResponse.headers).forEach(([key, value]) => {
      headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
    });

    // Extract cookies from response
    this.extractCookies(axiosResponse.headers['set-cookie'] || []);

    return {
      id: generateId(),
      requestId,
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
      headers: Object.entries(headers).map(([key, value]) => ({ key, value })),
      body: typeof axiosResponse.data === 'string'
        ? axiosResponse.data
        : JSON.stringify(axiosResponse.data, null, 2),
      size: this.calculateResponseSize(axiosResponse),
      time: duration,
      cookies: [], // Would be populated by extractCookies
      createdAt: new Date()
    };
  }

  private extractCookies(setCookieHeaders: string[]): void {
    if (!this.options.storeCookies || !setCookieHeaders) {
      return;
    }

    for (const cookieHeader of setCookieHeaders) {
      try {
        const [cookiePair] = cookieHeader.split(';');
        const [name, value] = cookiePair.split('=');

        if (name && value) {
          this.cookieJar.set(name.trim(), value.trim());
        }
      } catch (error) {
        logger.warn('Failed to parse cookie', cookieHeader);
      }
    }
  }

  private calculateResponseSize(response: AxiosResponse): number {
    let size = 0;

    // Headers size
    Object.entries(response.headers).forEach(([key, value]) => {
      size += key.length + String(value).length + 4; // ": " + "\r\n"
    });

    // Body size
    if (response.data) {
      if (typeof response.data === 'string') {
        size += response.data.length;
      } else {
        size += JSON.stringify(response.data).length;
      }
    }

    return size;
  }

  private handleError(error: any): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // Server responded with error status
        return `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
      } else if (axiosError.request) {
        // Network error
        if (axiosError.code === 'ECONNABORTED') {
          return 'Request timeout';
        } else if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
          return 'Network connection failed';
        } else {
          return 'Network error';
        }
      } else {
        // Request configuration error
        return axiosError.message;
      }
    }

    return error?.message || 'Unknown error occurred';
  }

  setOptions(options: Partial<RestClientOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getCookieJar(): Map<string, string> {
    return new Map(this.cookieJar);
  }

  clearCookies(): void {
    this.cookieJar.clear();
  }
}