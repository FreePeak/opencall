import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { EnvironmentVariable } from '../types';

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateShortId(length: number = 8): string {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const seconds = Math.floor(milliseconds / 1000);
  const remainingMs = milliseconds % 1000;

  if (seconds < 60) {
    return `${seconds}s ${remainingMs}ms`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;

  return `${minutes}m ${remainingSecs}s`;
}

export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  const clonedObj = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }

  return clonedObj;
}

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
}

export function substituteVariables(
  text: string,
  variables: EnvironmentVariable[],
  additionalVars?: Record<string, string>
): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let result = text;

  // Substitute environment variables
  for (const variable of variables) {
    if (!variable.enabled) continue;

    const pattern = new RegExp(`\\{\\{\\s*${escapeRegex(variable.key)}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, variable.value);
  }

  // Substitute additional variables (e.g., built-ins, globals)
  if (additionalVars) {
    for (const [key, value] of Object.entries(additionalVars)) {
      const pattern = new RegExp(`\\{\\{\\s*${escapeRegex(key)}\\s*\\}\\}`, 'g');
      result = result.replace(pattern, value);
    }
  }

  // Handle nested variable references
  let previousResult: string;
  do {
    previousResult = result;
    result = substituteVariables(result, variables, additionalVars);
  } while (result !== previousResult);

  return result;
}

export function parseJsonSafely(jsonString: string, defaultValue: any = null): any {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
}

export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function extractVariables(text: string): string[] {
  const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = variableRegex.exec(text)) !== null) {
    variables.push(match[1].trim());
  }

  return [...new Set(variables)];
}

export function getContentType(headers: Record<string, string>): string {
  const contentTypeKey = Object.keys(headers).find(key =>
    key.toLowerCase() === 'content-type'
  );

  return contentTypeKey ? headers[contentTypeKey] : '';
}

export function isTextResponse(contentType: string): boolean {
  if (!contentType) return true;

  const textTypes = [
    'text/',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/x-www-form-urlencoded'
  ];

  return textTypes.some(type => contentType.toLowerCase().includes(type));
}

export async function showErrorMessage(
  message: string,
  ...actions: string[]
): Promise<string | undefined> {
  return await vscode.window.showErrorMessage(message, ...actions);
}

export async function showWarningMessage(
  message: string,
  ...actions: string[]
): Promise<string | undefined> {
  return Promise.resolve(vscode.window.showWarningMessage(message, ...actions));
}

export async function showInformationMessage(
  message: string,
  ...actions: string[]
): Promise<string | undefined> {
  return Promise.resolve(vscode.window.showInformationMessage(message, ...actions));
}

export function withProgress<T>(
  title: string,
  task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
): Promise<T> {
  return Promise.resolve(vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: false,
    },
    task
  ));
}