/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { OpenCallConfig } from '../types';
import { DEFAULT_CONFIG } from '../utils/constants';
import { logger } from '../utils/logger';

/**
 * Configuration Manager for OpenCall extension
 * Handles reading and caching VSCode configuration settings
 */
export class ConfigurationManager {
  private cachedConfig: OpenCallConfig | null = null;
  private configChangeListener: vscode.Disposable | null = null;

  constructor() {
    this.initializeConfigWatcher();
  }

  /**
   * Initialize the configuration change watcher
   */
  private initializeConfigWatcher(): void {
    this.configChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
      // Check if any opencall configuration changed
      const opencallConfigChanged = Object.keys(DEFAULT_CONFIG).some((key) => {
        return e.affectsConfiguration(`opencall.${key}`);
      });

      if (opencallConfigChanged) {
        logger.info('Configuration changed, invalidating cache');
        this.cachedConfig = null;
      }
    });
  }

  /**
   * Get the full configuration object
   */
  getConfig(): OpenCallConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    this.cachedConfig = {
      general: this.getGeneralConfig(),
      request: this.getRequestConfig(),
      ui: this.getUIConfig(),
      p2p: this.getP2PConfig(),
      security: this.getSecurityConfig(),
      performance: this.getPerformanceConfig(),
    };

    return this.cachedConfig;
  }

  /**
   * Get a specific configuration value by key
   * Supports dot notation for nested values (e.g., 'request.timeout')
   */
  get<T = any>(key: string): T {
    const config = vscode.workspace.getConfiguration('opencall');
    return config.get<T>(key, getDefaultConfigValue(key));
  }

  /**
   * Get general configuration
   */
  private getGeneralConfig(): OpenCallConfig['general'] {
    const config = vscode.workspace.getConfiguration('opencall.general');

    return {
      theme: config.get<'auto' | 'light' | 'dark'>('theme', DEFAULT_CONFIG.general.theme),
      autoSave: config.get<boolean>('autoSave', DEFAULT_CONFIG.general.autoSave),
    };
  }

  /**
   * Get request configuration
   */
  private getRequestConfig(): OpenCallConfig['request'] {
    const config = vscode.workspace.getConfiguration('opencall.request');

    return {
      timeout: config.get<number>('timeout', DEFAULT_CONFIG.request.timeout),
      followRedirects: config.get<boolean>('followRedirects', DEFAULT_CONFIG.request.followRedirects),
      maxRedirects: config.get<number>('maxRedirects', DEFAULT_CONFIG.request.maxRedirects),
      validateSSL: config.get<boolean>('validateSSL', DEFAULT_CONFIG.request.validateSSL),
      sendCookies: config.get<boolean>('sendCookies', DEFAULT_CONFIG.request.sendCookies),
      storeCookies: config.get<boolean>('storeCookies', DEFAULT_CONFIG.request.storeCookies),
    };
  }

  /**
   * Get UI configuration
   */
  private getUIConfig(): OpenCallConfig['ui'] {
    const config = vscode.workspace.getConfiguration('opencall.ui');

    return {
      sidebarWidth: config.get<number>('sidebarWidth', DEFAULT_CONFIG.ui.sidebarWidth),
      responseViewMode: config.get<'pretty' | 'raw' | 'preview'>(
        'responseViewMode',
        DEFAULT_CONFIG.ui.responseViewMode
      ),
      showLineNumbers: config.get<boolean>('showLineNumbers', DEFAULT_CONFIG.ui.showLineNumbers),
    };
  }

  /**
   * Get P2P configuration
   */
  private getP2PConfig(): OpenCallConfig['p2p'] {
    const config = vscode.workspace.getConfiguration('opencall.p2p');

    return {
      enabled: config.get<boolean>('enabled', DEFAULT_CONFIG.p2p.enabled),
      autoConnect: config.get<boolean>('autoConnect', DEFAULT_CONFIG.p2p.autoConnect),
      discoveryMethods: config.get<string[]>(
        'discoveryMethods',
        DEFAULT_CONFIG.p2p.discoveryMethods
      ),
      signalingServer: config.get<string>('signalingServer', DEFAULT_CONFIG.p2p.signalingServer),
    };
  }

  /**
   * Get security configuration
   */
  private getSecurityConfig(): OpenCallConfig['security'] {
    const config = vscode.workspace.getConfiguration('opencall.security');

    return {
      encryptLocalData: config.get<boolean>(
        'encryptLocalData',
        DEFAULT_CONFIG.security.encryptLocalData
      ),
      sessionTimeout: config.get<number>('sessionTimeout', DEFAULT_CONFIG.security.sessionTimeout),
      maskSecrets: config.get<boolean>('maskSecrets', DEFAULT_CONFIG.security.maskSecrets),
    };
  }

  /**
   * Get performance configuration
   */
  private getPerformanceConfig(): OpenCallConfig['performance'] {
    const config = vscode.workspace.getConfiguration('opencall.performance');

    return {
      batchSize: config.get<number>('batchSize', DEFAULT_CONFIG.performance.batchSize),
      compressionEnabled: config.get<boolean>(
        'compressionEnabled',
        DEFAULT_CONFIG.performance.compressionEnabled
      ),
      deltaSyncEnabled: config.get<boolean>(
        'deltaSyncEnabled',
        DEFAULT_CONFIG.performance.deltaSyncEnabled
      ),
    };
  }

  /**
   * Update a configuration value
   */
  async update(key: string, value: any): Promise<void> {
    const config = vscode.workspace.getConfiguration('opencall');
    await config.update(key, value, vscode.ConfigurationTarget.Global);
    this.cachedConfig = null; // Invalidate cache
  }

  /**
   * Get the target (scope) for a configuration key
   */
  getConfigTarget(key: string): vscode.ConfigurationTarget {
    const config = vscode.workspace.getConfiguration('opencall');
    const inspection = config.inspect(key);

    if (inspection?.workspaceFolderValue !== undefined) {
      return vscode.ConfigurationTarget.WorkspaceFolder;
    } else if (inspection?.workspaceValue !== undefined) {
      return vscode.ConfigurationTarget.Workspace;
    } else {
      return vscode.ConfigurationTarget.Global;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.configChangeListener) {
      this.configChangeListener.dispose();
      this.configChangeListener = null;
    }
  }
}

/**
 * Get default value for a configuration key
 * Supports dot notation for nested values
 */
function getDefaultConfigValue(key: string): any {
  const keys = key.split('.');
  let value: any = DEFAULT_CONFIG;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }

  return value;
}

// Global configuration manager instance
let configurationManagerInstance: ConfigurationManager | null = null;

/**
 * Get the global configuration manager instance
 */
export function getConfigurationManager(): ConfigurationManager {
  if (!configurationManagerInstance) {
    configurationManagerInstance = new ConfigurationManager();
  }
  return configurationManagerInstance;
}

/**
 * Dispose of the configuration manager
 */
export function disposeConfigurationManager(): void {
  if (configurationManagerInstance) {
    configurationManagerInstance.dispose();
    configurationManagerInstance = null;
  }
}
