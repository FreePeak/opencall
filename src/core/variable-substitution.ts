import { EnvironmentVariable } from '../types';
import { logger } from '../utils/logger';
import { escapeRegex, isValidJSON, parseJsonSafely } from '../utils/helpers';

export interface SubstitutionContext {
  environmentVariables?: EnvironmentVariable[];
  globalVariables?: Record<string, any>;
  collectionVariables?: Record<string, any>;
  builtInVariables?: Record<string, () => string>;
}

export interface SubstitutionOptions {
  maxDepth?: number;
  strictMode?: boolean;
  preserveUnknown?: boolean;
}

export interface SubstitutionResult {
  result: string;
  substitutions: VariableSubstitutionItem[];
  errors: SubstitutionError[];
}

export interface VariableSubstitutionItem {
  original: string;
  variable: string;
  value: string;
  start: number;
  end: number;
}

export interface SubstitutionError {
  type: 'UNDEFINED_VARIABLE' | 'CIRCULAR_REFERENCE' | 'INVALID_JSON' | 'UNKNOWN_ERROR';
  message: string;
  variable?: string;
  position?: number;
}

export class VariableSubstitution {
  private options: SubstitutionOptions;

  constructor(options: SubstitutionOptions = {}) {
    this.options = {
      maxDepth: 10,
      strictMode: false,
      preserveUnknown: true,
      ...options
    };
  }

  substitute(
    input: any,
    context: SubstitutionContext
  ): SubstitutionResult {
    if (typeof input === 'string') {
      return this.substituteString(input, context);
    } else if (typeof input === 'object' && input !== null) {
      return this.substituteObject(input, context);
    }

    return {
      result: input,
      substitutions: [],
      errors: []
    };
  }

  private substituteString(
    input: string,
    context: SubstitutionContext
  ): SubstitutionResult {
    const substitutions: VariableSubstitutionItem[] = [];
    const errors: SubstitutionError[] = [];
    let result = input;
    let depth = 0;

    // Track visited variables to detect circular references
    const visited = new Set<string>();

    const substituteOnce = () => {
      const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
      let match;
      let hasSubstitution = false;

      while ((match = variableRegex.exec(result)) !== null) {
        const [fullMatch, variableExpression] = match;
        const start = match.index;
        const end = start + fullMatch.length;

        try {
          const { value, variable } = this.resolveVariable(
            variableExpression.trim(),
            context,
            visited
          );

          substitutions.push({
            original: fullMatch,
            variable,
            value,
            start,
            end
          });

          result = result.substring(0, start) + value + result.substring(end);
          hasSubstitution = true;

          // Reset regex to continue from the start
          variableRegex.lastIndex = 0;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({
            type: this.getErrorType(error),
            message: errorMessage,
            variable: variableExpression.trim(),
            position: start
          });

          if (this.options.strictMode) {
            throw error;
          }

          if (!this.options.preserveUnknown) {
            result = result.substring(0, start) + '' + result.substring(end);
          }
        }
      }

      return hasSubstitution;
    };

    // Perform substitutions iteratively to handle nested variables
    while (depth < this.options.maxDepth!) {
      visited.clear();
      if (!substituteOnce()) {
        break;
      }
      depth++;
    }

    if (depth >= this.options.maxDepth!) {
      errors.push({
        type: 'CIRCULAR_REFERENCE',
        message: `Maximum substitution depth (${this.options.maxDepth}) exceeded`,
        position: undefined
      });
    }

    return { result, substitutions, errors };
  }

  private substituteObject(
    input: any,
    context: SubstitutionContext
  ): SubstitutionResult {
    const allSubstitutions: VariableSubstitutionItem[] = [];
    const allErrors: SubstitutionError[] = [];

    const substituteValue = (value: any, path: string = ''): any => {
      if (typeof value === 'string') {
        const result = this.substituteString(value, context);
        allSubstitutions.push(...result.substitutions);
        allErrors.push(...result.errors);
        return result.result;
      } else if (Array.isArray(value)) {
        return value.map((item, index) => substituteValue(item, `${path}[${index}]`));
      } else if (typeof value === 'object' && value !== null) {
        const result: any = {};
        for (const [key, val] of Object.entries(value)) {
          result[key] = substituteValue(val, path ? `${path}.${key}` : key);
        }
        return result;
      }
      return value;
    };

    const result = substituteValue(input);

    return {
      result,
      substitutions: allSubstitutions,
      errors: allErrors
    };
  }

  private resolveVariable(
    expression: string,
    context: SubstitutionContext,
    visited: Set<string>
  ): { value: string; variable: string } {
    // Check for circular reference
    if (visited.has(expression)) {
      throw new Error(`Circular reference detected: ${expression}`);
    }
    visited.add(expression);

    try {
      // Handle function calls and complex expressions
      if (expression.includes('(') && expression.includes(')')) {
        return this.resolveFunctionCall(expression, context, visited);
      }

      // Handle object property access (e.g., object.property)
      if (expression.includes('.')) {
        return this.resolvePropertyAccess(expression, context, visited);
      }

      // Handle simple variable lookup
      return this.resolveSimpleVariable(expression, context);

    } finally {
      visited.delete(expression);
    }
  }

  private resolveSimpleVariable(
    variable: string,
    context: SubstitutionContext
  ): { value: string; variable: string } {
    // Check built-in variables first
    if (context.builtInVariables?.[variable]) {
      return {
        value: context.builtInVariables[variable](),
        variable
      };
    }

    // Check environment variables
    const envVar = context.environmentVariables?.find(v => v.key === variable && v.enabled);
    if (envVar) {
      return {
        value: this.castVariableValue(envVar.value, envVar.type),
        variable
      };
    }

    // Check collection variables
    if (context.collectionVariables?.[variable] !== undefined) {
      return {
        value: String(context.collectionVariables[variable]),
        variable
      };
    }

    // Check global variables
    if (context.globalVariables?.[variable] !== undefined) {
      return {
        value: String(context.globalVariables[variable]),
        variable
      };
    }

    throw new Error(`Undefined variable: ${variable}`);
  }

  private resolvePropertyAccess(
    expression: string,
    context: SubstitutionContext,
    visited: Set<string>
  ): { value: string; variable: string } {
    const parts = expression.split('.');
    const [rootVar, ...properties] = parts;

    // Resolve root variable
    const { value: rootValue } = this.resolveVariable(rootVar, context, visited);

    // Access nested properties
    let currentValue = rootValue;
    if (typeof currentValue === 'string' && isValidJSON(currentValue)) {
      currentValue = parseJsonSafely(currentValue);
    }

    if (typeof currentValue !== 'object' || currentValue === null) {
      throw new Error(`Cannot access properties of non-object: ${rootVar}`);
    }

    for (const property of properties) {
      if (currentValue && typeof currentValue === 'object' && property in currentValue) {
        currentValue = (currentValue as any)[property];
      } else {
        throw new Error(`Property '${property}' not found in ${rootVar}`);
      }
    }

    return {
      value: String(currentValue),
      variable: expression
    };
  }

  private resolveFunctionCall(
    expression: string,
    context: SubstitutionContext,
    visited: Set<string>
  ): { value: string; variable: string } {
    // Parse function call: functionName(arg1, arg2, ...)
    const functionMatch = expression.match(/^(\w+)\((.*)\)$/);
    if (!functionMatch) {
      throw new Error(`Invalid function call syntax: ${expression}`);
    }

    const [, functionName, argsString] = functionMatch;
    const args = this.parseArguments(argsString);

    // Handle built-in function calls
    switch (functionName.toLowerCase()) {
      case 'timestamp':
        return { value: Date.now().toString(), variable: expression };
      case 'guid':
      case 'uuid':
        return { value: this.generateUUID(), variable: expression };
      case 'randomint':
        const min = args[0] ? parseInt(args[0]) : 0;
        const max = args[1] ? parseInt(args[1]) : 1000000;
        return { value: Math.floor(Math.random() * (max - min) + min).toString(), variable: expression };
      case 'toupper':
      case 'uppercase':
        if (args.length !== 1) throw new Error(`toUpperCase() requires exactly one argument`);
        return {
          value: this.resolveVariable(args[0], context, visited).value.toUpperCase(),
          variable: expression
        };
      case 'tolower':
      case 'lowercase':
        if (args.length !== 1) throw new Error(`toLowerCase() requires exactly one argument`);
        return {
          value: this.resolveVariable(args[0], context, visited).value.toLowerCase(),
          variable: expression
        };
      case 'replace':
        if (args.length !== 3) throw new Error(`replace() requires exactly three arguments`);
        const originalValue = this.resolveVariable(args[0], context, visited).value;
        const searchValue = args[1];
        const replaceValue = args[2];
        return {
          value: originalValue.replace(new RegExp(escapeRegex(searchValue), 'g'), replaceValue),
          variable: expression
        };
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  private parseArguments(argsString: string): string[] {
    if (!argsString.trim()) {
      return [];
    }

    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let escapeNext = false;

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];

      if (escapeNext) {
        current += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
        continue;
      }

      if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = '';
        continue;
      }

      if (char === ',' && !inQuotes) {
        args.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }

  private castVariableValue(value: string, type: string): string {
    switch (type) {
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? value : num.toString();
      case 'boolean':
        return value.toLowerCase() === 'true' ? 'true' : 'false';
      case 'json':
        if (isValidJSON(value)) {
          const parsed = parseJsonSafely(value);
          return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        }
        return value;
      default:
        return value;
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private getErrorType(error: any): SubstitutionError['type'] {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('Undefined variable')) {
      return 'UNDEFINED_VARIABLE';
    } else if (message.includes('Circular reference')) {
      return 'CIRCULAR_REFERENCE';
    } else if (message.includes('JSON')) {
      return 'INVALID_JSON';
    } else {
      return 'UNKNOWN_ERROR';
    }
  }

  extractVariables(text: string): string[] {
    const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(text)) !== null) {
      const variableExpression = match[1].trim();
      if (!variables.includes(variableExpression)) {
        variables.push(variableExpression);
      }
    }

    return variables;
  }

  validateVariable(name: string): ValidationResult {
    const errors: string[] = [];

    if (!name.trim()) {
      errors.push('Variable name cannot be empty');
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      errors.push('Variable name must start with a letter or underscore and contain only letters, numbers, and underscores');
    }

    // Check for reserved keywords
    const reservedKeywords = ['true', 'false', 'null', 'undefined', 'this', 'new', 'function'];
    if (reservedKeywords.includes(name.toLowerCase())) {
      errors.push(`"${name}" is a reserved keyword`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Default instance for convenience
export const variableSubstitution = new VariableSubstitution();