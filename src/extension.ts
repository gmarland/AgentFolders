import * as vscode from "vscode";
import * as path from "path";
import { SymlinkTreeProvider, SymlinkItem } from "./symlinkTreeProvider";
import {
  addSymlink,
  removeSymlink,
  listSymlinks,
  setDescription,
} from "./symlinkManager";
import {
  getTargetFolder,
  getWorkspaceRoot,
  shouldUpdateInstructions,
  getInstructionsFile,
} from "./config";
import { updateInstructionsFile } from "./instructionsManager";

async function syncInstructions(workspaceRoot: string): Promise<void> {
  if (!shouldUpdateInstructions()) {
    return;
  }
  const targetFolder = getTargetFolder();
  const targetDir = path.join(workspaceRoot, targetFolder);
  const symlinks = await listSymlinks(targetDir);
  const instructionsFile = getInstructionsFile(workspaceRoot);
  await updateInstructionsFile(instructionsFile, symlinks, targetFolder);
}

export function activate(context: vscode.ExtensionContext): void {
  const treeProvider = new SymlinkTreeProvider();

  const treeView = vscode.window.createTreeView("symlinkFolders", {
    treeDataProvider: treeProvider,
    showCollapseAll: false,
  });

  let watcherDisposables: vscode.Disposable[] = [];

  const refreshWatchers = (): void => {
    watcherDisposables.forEach((disposable) => disposable.dispose());
    watcherDisposables = [];

    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      return;
    }

    const watcherPattern = new vscode.RelativePattern(
      workspaceRoot,
      `${getTargetFolder()}/**`,
    );
    const watcher = vscode.workspace.createFileSystemWatcher(watcherPattern);

    watcherDisposables.push(
      watcher,
      watcher.onDidCreate(() => treeProvider.refresh()),
      watcher.onDidDelete(() => treeProvider.refresh()),
      watcher.onDidChange(() => treeProvider.refresh()),
    );
  };

  refreshWatchers();

  const addCommand = vscode.commands.registerCommand(
    "symlinkFolders.addSymlink",
    async () => {
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }

      const uris = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: "Select Folder to Symlink",
      });

      if (!uris || uris.length === 0) {
        return;
      }

      const sourcePath = uris[0].fsPath;
      const targetFolder = getTargetFolder();

      try {
        const symlinkPath = await addSymlink(
          sourcePath,
          workspaceRoot,
          targetFolder,
        );

        // Prompt for an optional description
        const description = await vscode.window.showInputBox({
          prompt: `Describe "${path.basename(symlinkPath)}" for the AI agent (optional)`,
          placeHolder:
            "e.g. JWT authentication with refresh tokens using NestJS",
        });

        if (description) {
          const targetDir = path.join(workspaceRoot, targetFolder);
          await setDescription(
            targetDir,
            path.basename(symlinkPath),
            description,
          );
        }

        await syncInstructions(workspaceRoot);
        treeProvider.refresh();
        vscode.window.showInformationMessage(
          `Symlink created: ${path.basename(symlinkPath)} → ${sourcePath}`,
        );
      } catch (err: unknown) {
        vscode.window.showErrorMessage(
          `Failed to create symlink: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );

  const removeCommand = vscode.commands.registerCommand(
    "symlinkFolders.removeSymlink",
    async (item?: SymlinkItem) => {
      if (!item) {
        vscode.window.showErrorMessage(
          "Select a symlink from the tree to remove.",
        );
        return;
      }

      const workspaceRoot = getWorkspaceRoot();

      const confirmed = await vscode.window.showWarningMessage(
        `Remove symlink "${item.entry.name}"? The original folder will not be affected.`,
        { modal: true },
        "Remove",
      );

      if (confirmed !== "Remove") {
        return;
      }

      try {
        await removeSymlink(item.entry.symlinkPath);
        await syncInstructions(workspaceRoot!);
        treeProvider.refresh();
        vscode.window.showInformationMessage(
          `Symlink "${item.entry.name}" removed.`,
        );
      } catch (err: unknown) {
        vscode.window.showErrorMessage(
          `Failed to remove symlink: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
  );

  const refreshCommand = vscode.commands.registerCommand(
    "symlinkFolders.refresh",
    () => treeProvider.refresh(),
  );

  const openTargetCommand = vscode.commands.registerCommand(
    "symlinkFolders.openTargetFolder",
    async () => {
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        vscode.window.showErrorMessage("No workspace folder is open.");
        return;
      }
      const targetFolder = getTargetFolder();
      const targetUri = vscode.Uri.file(path.join(workspaceRoot, targetFolder));
      await vscode.commands.executeCommand("revealInExplorer", targetUri);
    },
  );

  const editDescriptionCommand = vscode.commands.registerCommand(
    "symlinkFolders.editDescription",
    async (item?: SymlinkItem) => {
      if (!item) {
        return;
      }
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        return;
      }

      const description = await vscode.window.showInputBox({
        prompt: `Update description for "${item.entry.name}"`,
        value: item.entry.description ?? "",
        placeHolder: "e.g. JWT authentication with refresh tokens using NestJS",
      });

      if (description === undefined) {
        return; // cancelled
      }

      const targetDir = path.join(workspaceRoot, getTargetFolder());
      await setDescription(targetDir, item.entry.name, description);
      await syncInstructions(workspaceRoot);
      treeProvider.refresh();
    },
  );

  const revealCommand = vscode.commands.registerCommand(
    "symlinkFolders.revealInFinder",
    async (item?: SymlinkItem) => {
      if (!item) {
        return;
      }
      await vscode.commands.executeCommand(
        "revealFileInOS",
        vscode.Uri.file(item.entry.realPath),
      );
    },
  );

  const configChangeListener = vscode.workspace.onDidChangeConfiguration(
    (event) => {
      if (!event.affectsConfiguration("symlinkFolders")) {
        return;
      }

      refreshWatchers();
      treeProvider.refresh();
    },
  );

  context.subscriptions.push(
    treeView,
    { dispose: () => watcherDisposables.forEach((disposable) => disposable.dispose()) },
    addCommand,
    removeCommand,
    refreshCommand,
    openTargetCommand,
    editDescriptionCommand,
    revealCommand,
    configChangeListener,
  );
}

export function deactivate(): void {}
