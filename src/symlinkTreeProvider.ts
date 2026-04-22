import * as vscode from "vscode";
import * as path from "path";
import { listSymlinks, SymlinkEntry } from "./symlinkManager";
import { getTargetFolder, getWorkspaceRoot } from "./config";

export class SymlinkItem extends vscode.TreeItem {
  constructor(public readonly entry: SymlinkEntry) {
    super(entry.name, vscode.TreeItemCollapsibleState.None);
    this.description = entry.description ?? entry.realPath;
    this.tooltip = entry.description
      ? `${entry.name} → ${entry.realPath}\n${entry.description}`
      : `${entry.name} → ${entry.realPath}`;
    this.contextValue = "agentContextItem";
    this.iconPath = new vscode.ThemeIcon("file-symlink-directory");
    this.resourceUri = vscode.Uri.file(entry.symlinkPath);
  }
}

export class SymlinkTreeProvider implements vscode.TreeDataProvider<SymlinkItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    SymlinkItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SymlinkItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<SymlinkItem[]> {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      return [];
    }

    const targetFolder = getTargetFolder();
    const targetDir = path.join(workspaceRoot, targetFolder);
    const entries = await listSymlinks(targetDir);

    if (entries.length === 0) {
      return [];
    }

    return entries.map((entry) => new SymlinkItem(entry));
  }
}
