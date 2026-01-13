import * as vscode from 'vscode';
import { Environment, EnvironmentVariable } from '../../types';
import ServiceRegistry from '../ServiceRegistry';
import { logger } from '../../utils/logger';

/**
 * Environment Handler
 * Handles all environment-related operations
 */
export class EnvironmentHandler {
  private environmentManager;

  constructor() {
    const registry = ServiceRegistry.getInstance();
    this.environmentManager = registry.getEnvironmentManager();
  }

  /**
   * Create a new environment
   */
  async handleCreateEnvironment(): Promise<void> {
    try {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter environment name',
        placeHolder: 'My Environment',
      });

      if (!name) {
        return;
      }

      await this.environmentManager.createEnvironment(name, []);
      vscode.window.showInformationMessage(`Environment "${name}" created successfully!`);
      logger.info(`[EnvironmentHandler] Created environment: ${name}`);

    } catch (error) {
      logger.error('[EnvironmentHandler] Failed to create environment', error);
      vscode.window.showErrorMessage(`Failed to create environment: ${error}`);
    }
  }

  /**
   * Switch to a different environment
   */
  async handleSwitchEnvironment(environmentId: string): Promise<void> {
    try {
      await this.environmentManager.activateEnvironment(environmentId);

      const activeEnv = this.environmentManager.getActiveEnvironment();

      vscode.window.showInformationMessage(`Switched to environment: ${activeEnv?.name || 'None'}`);
      logger.info(`[EnvironmentHandler] Switched to environment: ${environmentId}`);

    } catch (error) {
      logger.error('[EnvironmentHandler] Failed to switch environment', error);
      vscode.window.showErrorMessage(`Failed to switch environment: ${error}`);
    }
  }

  /**
   * Edit an environment
   */
  async handleEditEnvironment(environmentId: string): Promise<void> {
    try {
      const environment = this.environmentManager.getEnvironment(environmentId);

      if (!environment) {
        vscode.window.showErrorMessage('Environment not found');
        return;
      }

      const action = await vscode.window.showQuickPick(
        ['Add Variable', 'Remove Variable', 'Rename Environment'],
        { placeHolder: 'What would you like to do?' }
      );

      if (!action) {
        return;
      }

      switch (action) {
        case 'Add Variable':
          await this.addVariable(environmentId);
          break;
        case 'Rename Environment':
          await this.renameEnvironment(environmentId);
          break;
        case 'Remove Variable':
          await this.removeVariable(environmentId);
          break;
      }

    } catch (error) {
      logger.error('[EnvironmentHandler] Failed to edit environment', error);
      vscode.window.showErrorMessage(`Failed to edit environment: ${error}`);
    }
  }

  /**
   * Delete an environment
   */
  async handleDeleteEnvironment(environmentId: string): Promise<void> {
    try {
      const environment = this.environmentManager.getEnvironment(environmentId);

      if (!environment) {
        vscode.window.showErrorMessage('Environment not found');
        return;
      }

      if (environment.isActive) {
        vscode.window.showWarningMessage('Cannot delete active environment. Switch to a different environment first.');
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete environment "${environment.name}"?`,
        'Delete',
        'Cancel'
      );

      if (confirm !== 'Delete') {
        return;
      }

      await this.environmentManager.deleteEnvironment(environmentId);
      vscode.window.showInformationMessage('Environment deleted successfully!');
      logger.info(`[EnvironmentHandler] Deleted environment: ${environmentId}`);

    } catch (error) {
      logger.error('[EnvironmentHandler] Failed to delete environment', error);
      vscode.window.showErrorMessage(`Failed to delete environment: ${error}`);
    }
  }

  /**
   * Add a variable to an environment
   */
  private async addVariable(environmentId: string): Promise<void> {
    const key = await vscode.window.showInputBox({
      prompt: 'Enter variable key',
      placeHolder: 'API_BASE_URL',
    });

    if (!key) {
      return;
    }

    const value = await vscode.window.showInputBox({
      prompt: 'Enter variable value',
      placeHolder: 'https://api.example.com',
      password: true,
    });

    if (!value) {
      return;
    }

    const variable: Omit<EnvironmentVariable, 'key'> = {
      value,
      type: 'string',
      enabled: true,
      description: '',
      secret: false,
    };

    await this.environmentManager.addVariable(environmentId, key, variable);
    vscode.window.showInformationMessage(`Variable "${key}" added`);
    logger.info(`[EnvironmentHandler] Added variable ${key} to environment ${environmentId}`);
  }

  /**
   * Remove a variable from an environment
   */
  private async removeVariable(environmentId: string): Promise<void> {
    const environment = this.environmentManager.getEnvironment(environmentId);

    if (!environment || environment.variables.length === 0) {
      vscode.window.showInformationMessage('No variables to remove');
      return;
    }

    const selected = await vscode.window.showQuickPick(
      environment.variables.map(v => ({
        label: `${v.key}: ${v.secret ? '***' : v.value}`,
        description: v.description || '',
        variable: v,
      })),
      { placeHolder: 'Select a variable to remove' }
    );

    if (!selected) {
      return;
    }

    await this.environmentManager.deleteVariable(environmentId, selected.variable.key);
    vscode.window.showInformationMessage(`Variable "${selected.variable.key}" removed`);
    logger.info(`[EnvironmentHandler] Removed variable ${selected.variable.key} from environment ${environmentId}`);
  }

  /**
   * Rename an environment
   */
  private async renameEnvironment(environmentId: string): Promise<void> {
    const environment = this.environmentManager.getEnvironment(environmentId);

    if (!environment) {
      vscode.window.showErrorMessage('Environment not found');
      return;
    }

    const name = await vscode.window.showInputBox({
      prompt: 'Enter new environment name',
      placeHolder: environment.name,
    });

    if (!name || name === environment.name) {
      return;
    }

    await this.environmentManager.updateEnvironment(environmentId, { name });
    vscode.window.showInformationMessage('Environment renamed successfully!');
    logger.info(`[EnvironmentHandler] Renamed environment: ${environmentId}`);
  }
}

export default EnvironmentHandler;
