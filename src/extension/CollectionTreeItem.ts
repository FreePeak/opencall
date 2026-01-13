import * as vscode from 'vscode';
import { Collection, Request } from '../types';

export class CollectionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly item: Collection | Request,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: 'collection' | 'folder' | 'request'
  ) {
    super(item.name, collapsibleState);

    this.tooltip = item.description || item.name;
    this.contextValue = itemType;

    // Set icon based on type
    this.iconPath = this.getIcon();

    // For requests, add method badge
    if (this.isRequest(item)) {
      this.description = item.method;
      this.command = {
        command: 'opencall.sendRequest',
        title: 'Send Request',
        arguments: [item.id]
      };
    }
  }

  private isRequest(item: Collection | Request): item is Request {
    return 'method' in item;
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.itemType) {
      case 'collection':
        return new vscode.ThemeIcon('library');
      case 'folder':
        return new vscode.ThemeIcon('folder');
      case 'request':
        return this.getRequestIcon();
      default:
        return new vscode.ThemeIcon('file');
    }
  }

  private getRequestIcon(): vscode.ThemeIcon {
    if (this.isRequest(this.item)) {
      switch (this.item.method) {
        case 'GET':
          return new vscode.ThemeIcon('arrow-down', new vscode.ThemeColor('charts.green'));
        case 'POST':
          return new vscode.ThemeIcon('add', new vscode.ThemeColor('charts.blue'));
        case 'PUT':
          return new vscode.ThemeIcon('edit', new vscode.ThemeColor('charts.orange'));
        case 'DELETE':
          return new vscode.ThemeIcon('trash', new vscode.ThemeColor('charts.red'));
        case 'PATCH':
          return new vscode.ThemeIcon('symbol-event', new vscode.ThemeColor('charts.yellow'));
        case 'HEAD':
          return new vscode.ThemeIcon('symbol-method', new vscode.ThemeColor('charts.purple'));
        case 'OPTIONS':
          return new vscode.ThemeIcon('symbol-interface', new vscode.ThemeColor('charts.purple'));
        default:
          return new vscode.ThemeIcon('symbol-method');
      }
    }
    return new vscode.ThemeIcon('symbol-method');
  }
}
