/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import * as vscode from 'vscode';
import { Environment, EnvironmentVariable } from '../types';
import { logger } from '../utils/logger';
import { generateId, substituteVariables, extractVariables } from '../utils/helpers';

export interface EnvironmentManagerOptions {
  maxEnvironments?: number;
  maxVariablesPerEnvironment?: number;
}

export interface BuiltInVariables {
  $randomInt: () => string;
  $randomUuid: () => string;
  $timestamp: () => string;
  $guid: () => string;
}

export class EnvironmentManager {
  private environments: Map<string, Environment> = new Map();
  private activeEnvironmentId: string | null = null;
  private options: EnvironmentManagerOptions;
  private builtInVariables: BuiltInVariables;

  // Events
  private _onEnvironmentCreated = new vscode.EventEmitter<Environment>();
  private _onEnvironmentUpdated = new vscode.EventEmitter<Environment>();
  private _onEnvironmentDeleted = new vscode.EventEmitter<string>();
  private _onEnvironmentActivated = new vscode.EventEmitter<Environment>();

  constructor(options: EnvironmentManagerOptions = {}) {
    this.options = {
      maxEnvironments: 50,
      maxVariablesPerEnvironment: 1000,
      ...options
    };

    this.builtInVariables = {
      $randomInt: () => Math.floor(Math.random() * 1000000).toString(),
      $randomUuid: () => generateId(),
      $timestamp: () => Date.now().toString(),
      $guid: () => generateId()
    };
  }

  get onEnvironmentCreated(): vscode.Event<Environment> {
    return this._onEnvironmentCreated.event;
  }

  get onEnvironmentUpdated(): vscode.Event<Environment> {
    return this._onEnvironmentUpdated.event;
  }

  get onEnvironmentDeleted(): vscode.Event<string> {
    return this._onEnvironmentDeleted.event;
  }

  get onEnvironmentActivated(): vscode.Event<Environment> {
    return this._onEnvironmentActivated.event;
  }

  async createEnvironment(
    name: string,
    variables: EnvironmentVariable[] = []
  ): Promise<Environment> {
    if (this.environments.size >= this.options.maxEnvironments!) {
      throw new Error(`Maximum number of environments (${this.options.maxEnvironments}) reached`);
    }

    if (variables.length > this.options.maxVariablesPerEnvironment!) {
      throw new Error(`Maximum variables per environment (${this.options.maxVariablesPerEnvironment}) reached`);
    }

    const environment: Environment = {
      id: generateId(),
      name,
      variables,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.environments.set(environment.id, environment);
    await this.saveEnvironment(environment);

    logger.info(`Created environment: ${name} (${environment.id})`);
    this._onEnvironmentCreated.fire(environment);

    return environment;
  }

  async updateEnvironment(
    environmentId: string,
    updates: Partial<Environment>
  ): Promise<Environment | null> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      logger.warn(`Environment not found: ${environmentId}`);
      return null;
    }

    if (updates.variables && updates.variables.length > this.options.maxVariablesPerEnvironment!) {
      throw new Error(`Maximum variables per environment (${this.options.maxVariablesPerEnvironment}) reached`);
    }

    const updatedEnvironment = { ...environment, ...updates, updatedAt: new Date() };
    this.environments.set(environmentId, updatedEnvironment);
    await this.saveEnvironment(updatedEnvironment);

    logger.info(`Updated environment: ${updatedEnvironment.name}`);
    this._onEnvironmentUpdated.fire(updatedEnvironment);

    return updatedEnvironment;
  }

  async deleteEnvironment(environmentId: string): Promise<boolean> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      logger.warn(`Environment not found: ${environmentId}`);
      return false;
    }

    // If this was the active environment, deactivate it
    if (this.activeEnvironmentId === environmentId) {
      await this.deactivateEnvironment();
    }

    this.environments.delete(environmentId);
    await this.deleteEnvironmentData(environmentId);

    logger.info(`Deleted environment: ${environment.name}`);
    this._onEnvironmentDeleted.fire(environmentId);

    return true;
  }

  async activateEnvironment(environmentId: string): Promise<boolean> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      logger.warn(`Environment not found: ${environmentId}`);
      return false;
    }

    // Deactivate current active environment
    if (this.activeEnvironmentId) {
      const currentActive = this.environments.get(this.activeEnvironmentId);
      if (currentActive) {
        currentActive.isActive = false;
        await this.saveEnvironment(currentActive);
      }
    }

    // Activate new environment
    environment.isActive = true;
    this.activeEnvironmentId = environmentId;
    await this.saveEnvironment(environment);

    logger.info(`Activated environment: ${environment.name}`);
    this._onEnvironmentActivated.fire(environment);

    return true;
  }

  async deactivateEnvironment(): Promise<boolean> {
    if (!this.activeEnvironmentId) {
      return false;
    }

    const currentActive = this.environments.get(this.activeEnvironmentId);
    if (currentActive) {
      currentActive.isActive = false;
      await this.saveEnvironment(currentActive);
    }

    const deactivatedId = this.activeEnvironmentId;
    this.activeEnvironmentId = null;

    logger.info(`Deactivated environment`);
    return true;
  }

  getActiveEnvironment(): Environment | null {
    if (!this.activeEnvironmentId) {
      return null;
    }
    return this.environments.get(this.activeEnvironmentId) || null;
  }

  getEnvironment(environmentId: string): Environment | null {
    return this.environments.get(environmentId) || null;
  }

  getAllEnvironments(): Environment[] {
    return Array.from(this.environments.values());
  }

  getVariable(environmentId: string, key: string): EnvironmentVariable | null {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      return null;
    }

    return environment.variables.find(v => v.key === key) || null;
  }

  async addVariable(
    environmentId: string,
    variable: Omit<EnvironmentVariable, 'key'>
  ): Promise<EnvironmentVariable | null> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      logger.warn(`Environment not found: ${environmentId}`);
      return null;
    }

    if (environment.variables.length >= this.options.maxVariablesPerEnvironment!) {
      throw new Error(`Maximum variables per environment reached`);
    }

    const newVariable: EnvironmentVariable = {
      key: generateId(), // Will be replaced with actual key
      ...variable
    };

    environment.variables.push(newVariable);
    environment.updatedAt = new Date();
    await this.saveEnvironment(environment);

    logger.info(`Added variable ${newVariable.key} to environment ${environment.name}`);
    return newVariable;
  }

  async updateVariable(
    environmentId: string,
    key: string,
    updates: Partial<EnvironmentVariable>
  ): Promise<EnvironmentVariable | null> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      logger.warn(`Environment not found: ${environmentId}`);
      return null;
    }

    const variableIndex = environment.variables.findIndex(v => v.key === key);
    if (variableIndex === -1) {
      logger.warn(`Variable not found: ${key} in environment ${environment.name}`);
      return null;
    }

    const updatedVariable = { ...environment.variables[variableIndex], ...updates };
    environment.variables[variableIndex] = updatedVariable;
    environment.updatedAt = new Date();
    await this.saveEnvironment(environment);

    logger.info(`Updated variable ${key} in environment ${environment.name}`);
    return updatedVariable;
  }

  async deleteVariable(environmentId: string, key: string): Promise<boolean> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      logger.warn(`Environment not found: ${environmentId}`);
      return false;
    }

    const variableIndex = environment.variables.findIndex(v => v.key === key);
    if (variableIndex === -1) {
      logger.warn(`Variable not found: ${key} in environment ${environment.name}`);
      return false;
    }

    environment.variables.splice(variableIndex, 1);
    environment.updatedAt = new Date();
    await this.saveEnvironment(environment);

    logger.info(`Deleted variable ${key} from environment ${environment.name}`);
    return true;
  }

  substituteVariables(
    text: string,
    environmentId?: string,
    additionalVars?: Record<string, string>
  ): string {
    let environmentVars: EnvironmentVariable[] = [];

    if (environmentId) {
      const environment = this.environments.get(environmentId);
      if (environment) {
        environmentVars = environment.variables.filter(v => v.enabled);
      }
    }

    // Add built-in variables
    const builtInVars: Record<string, string> = {};
    for (const [key, generator] of Object.entries(this.builtInVariables)) {
      builtInVars[key] = generator();
    }

    const allAdditionalVars = { ...builtInVars, ...additionalVars };

    return substituteVariables(text, environmentVars, allAdditionalVars);
  }

  extractVariables(text: string): string[] {
    return extractVariables(text);
  }

  duplicateEnvironment(
    environmentId: string,
    newName: string
  ): Environment | null {
    const original = this.environments.get(environmentId);
    if (!original) {
      logger.warn(`Environment not found: ${environmentId}`);
      return null;
    }

    const duplicated: Environment = {
      id: generateId(),
      name: newName,
      variables: original.variables.map(v => ({ ...v })),
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.environments.set(duplicated.id, duplicated);
    this.saveEnvironment(duplicated);

    logger.info(`Duplicated environment: ${original.name} -> ${newName}`);
    return duplicated;
  }

  searchVariables(environmentId: string, query: string): EnvironmentVariable[] {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    return environment.variables.filter(variable =>
      variable.key.toLowerCase().includes(lowerQuery) ||
      (variable.description?.toLowerCase().includes(lowerQuery))
    );
  }

  getVariableUsage(text: string, environmentId?: string): VariableUsage[] {
    const extractedVars = this.extractVariables(text);
    const usage: VariableUsage[] = [];

    for (const varName of extractedVars) {
      let found = false;
      const isBuiltIn = Object.keys(this.builtInVariables).includes(varName);

      if (!isBuiltIn && environmentId) {
        const environment = this.environments.get(environmentId);
        if (environment) {
          found = environment.variables.some(v => v.key === varName && v.enabled);
        }
      }

      usage.push({
        name: varName,
        found,
        isBuiltIn,
        resolved: isBuiltIn ? this.builtInVariables[varName as keyof BuiltInVariables]() : undefined
      });
    }

    return usage;
  }

  exportEnvironment(environmentId: string): ExportedEnvironment | null {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      return null;
    }

    return {
      name: environment.name,
      values: environment.variables.map(v => ({
        key: v.key,
        value: v.value,
        type: v.type,
        description: v.description,
        enabled: v.enabled
      })),
      _postman_variable_scope: 'environment'
    };
  }

  async importEnvironment(data: ExportedEnvironment): Promise<Environment> {
    const variables: EnvironmentVariable[] = data.values.map(v => ({
      key: v.key,
      value: v.value,
      type: (v.type || 'string') as 'string' | 'number' | 'boolean' | 'json',
      description: v.description,
      enabled: v.enabled !== false,
      secret: false
    }));

    return await this.createEnvironment(data.name, variables);
  }

  private async saveEnvironment(environment: Environment): Promise<void> {
    try {
      // TODO: Implement with storage layer
      logger.debug('saveEnvironment: will be implemented with storage layer');
    } catch (error) {
      logger.error('Failed to save environment', error);
    }
  }

  private async deleteEnvironmentData(environmentId: string): Promise<void> {
    try {
      // TODO: Implement with storage layer
      logger.debug('deleteEnvironmentData: will be implemented with storage layer');
    } catch (error) {
      logger.error('Failed to delete environment data', error);
    }
  }

  async loadEnvironments(): Promise<void> {
    try {
      // TODO: Implement with storage layer
      logger.debug('loadEnvironments: will be implemented with storage layer');
    } catch (error) {
      logger.error('Failed to load environments', error);
    }
  }

  getEnvironmentSummary(): EnvironmentSummary {
    const environments = this.getAllEnvironments();
    const active = this.getActiveEnvironment();

    return {
      totalEnvironments: environments.length,
      activeEnvironmentId: this.activeEnvironmentId,
      activeEnvironmentName: active?.name || null,
      totalVariables: environments.reduce((sum, env) => sum + env.variables.length, 0),
      enabledVariables: environments.reduce((sum, env) =>
        sum + env.variables.filter(v => v.enabled).length, 0
      ),
      secretVariables: environments.reduce((sum, env) =>
        sum + env.variables.filter(v => v.secret).length, 0
      )
    };
  }
}

export interface VariableUsage {
  name: string;
  found: boolean;
  isBuiltIn: boolean;
  resolved?: string;
}

export interface ExportedEnvironment {
  name: string;
  values: Array<{
    key: string;
    value: string;
    type?: string;
    description?: string;
    enabled?: boolean;
  }>;
  _postman_variable_scope: string;
}

export interface EnvironmentSummary {
  totalEnvironments: number;
  activeEnvironmentId: string | null;
  activeEnvironmentName: string | null;
  totalVariables: number;
  enabledVariables: number;
  secretVariables: number;
}