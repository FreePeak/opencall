/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: any;
}

export class Logger {
  private outputChannel: vscode.OutputChannel;
  private currentLogLevel: LogLevel;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 1000;

  constructor(outputChannelName: string = 'OpenCall') {
    this.outputChannel = vscode.window.createOutputChannel(outputChannelName);
    this.currentLogLevel = LogLevel.INFO;
  }

  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
    this.info(`Log level set to ${LogLevel[level]}`);
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;

    this.log(LogLevel.ERROR, message, errorData);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.currentLogLevel) {
      return;
    }

    const timestamp = new Date();
    const logEntry: LogEntry = {
      level,
      message,
      timestamp,
      data
    };

    this.addToHistory(logEntry);
    this.writeToOutputChannel(logEntry);

    if (level >= LogLevel.ERROR) {
      this.showErrorMessage(logEntry);
    }
  }

  private addToHistory(logEntry: LogEntry): void {
    this.logHistory.push(logEntry);

    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  private writeToOutputChannel(logEntry: LogEntry): void {
    const levelName = LogLevel[logEntry.level].padEnd(5);
    const timestamp = logEntry.timestamp.toISOString();
    const logLine = `[${timestamp}] ${levelName} ${logEntry.message}`;

    this.outputChannel.appendLine(logLine);

    if (logEntry.data) {
      this.outputChannel.appendLine(this.formatData(logEntry.data));
      this.outputChannel.appendLine('');
    }
  }

  private formatData(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return String(data);
    }
  }

  private showErrorMessage(logEntry: LogEntry): void {
    const message = `OpenCall Error: ${logEntry.message}`;
    const action = 'Show Details';

    vscode.window.showErrorMessage(message, action).then((selection) => {
      if (selection === action) {
        this.showOutputChannel();
      }
    });
  }

  showOutputChannel(): void {
    this.outputChannel.show();
  }

  hideOutputChannel(): void {
    this.outputChannel.hide();
  }

  getLogHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  clearHistory(): void {
    this.logHistory = [];
    this.outputChannel.clear();
    this.info('Log history cleared');
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

export const logger = new Logger();