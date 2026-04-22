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
import {
  updateGitignoreFile,
  updateInstructionsFile,
} from "./instructionsManager";

const COMMAND_IDS = {
  addFolder: ["agentFolders.addFolder", "symlinkFolders.addSymlink"],
  removeFolder: ["agentFolders.removeFolder", "symlinkFolders.removeSymlink"],
  refresh: ["agentFolders.refresh", "symlinkFolders.refresh"],
  openFolderDirectory: [
    "agentFolders.openFolderDirectory",
    "symlinkFolders.openTargetFolder",
  ],
  editDescription: [
    "agentFolders.editDescription",
    "symlinkFolders.editDescription",
  ],
  revealOriginalFolder: [
    "agentFolders.revealOriginalFolder",
    "symlinkFolders.revealInFinder",
  ],
} as const;

async function syncInstructions(workspaceRoot: string): Promise<void> {
  const targetFolder = getTargetFolder();
  const targetDir = path.join(workspaceRoot, targetFolder);
  const symlinks = await listSymlinks(targetDir);
  const instructionsFile = shouldUpdateInstructions()
    ? getInstructionsFile(workspaceRoot)
    : undefined;

  await updateGitignoreFile(
    path.join(workspaceRoot, ".gitignore"),
    targetFolder,
    targetDir,
    instructionsFile,
  );

  if (!shouldUpdateInstructions()) {
    return;
  }

  await updateInstructionsFile(instructionsFile!, symlinks, targetFolder);
}

export function activate(context: vscode.ExtensionContext): void {
  const treeProvider = new SymlinkTreeProvider();

  const treeView = vscode.window.createTreeView("agentFolders", {
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

  const addFolderHandler = async (): Promise<void> => {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage("No workspace folder is open.");
      return;
    }

    const uris = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: "Select Context Folder",
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

      const description = await vscode.window.showInputBox({
        prompt: `Describe "${path.basename(symlinkPath)}" for shared context (optional)`,
        placeHolder: "e.g. JWT authentication with refresh tokens using NestJS",
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
        `Context folder added: ${path.basename(symlinkPath)} → ${sourcePath}`,
      );
    } catch (err: unknown) {
      vscode.window.showErrorMessage(
        `Failed to add context folder: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const addCommands = COMMAND_IDS.addFolder.map((commandId) =>
    vscode.commands.registerCommand(commandId, addFolderHandler),
  );

  const removeFolderHandler = async (item?: SymlinkItem): Promise<void> => {
    if (!item) {
      vscode.window.showErrorMessage(
        "Select an attached folder from the sidebar to remove.",
      );
      return;
    }

    const workspaceRoot = getWorkspaceRoot();

    const confirmed = await vscode.window.showWarningMessage(
      `Remove context folder "${item.entry.name}"? The original folder will not be affected.`,
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
        `Context folder "${item.entry.name}" removed.`,
      );
    } catch (err: unknown) {
      vscode.window.showErrorMessage(
        `Failed to remove context folder: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const removeCommands = COMMAND_IDS.removeFolder.map((commandId) =>
    vscode.commands.registerCommand(commandId, removeFolderHandler),
  );

  const refreshHandler = (): void => treeProvider.refresh();
  const refreshCommands = COMMAND_IDS.refresh.map((commandId) =>
    vscode.commands.registerCommand(commandId, refreshHandler),
  );

  const openFolderDirectoryHandler = async (): Promise<void> => {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      vscode.window.showErrorMessage("No workspace folder is open.");
      return;
    }
    const targetFolder = getTargetFolder();
    const targetUri = vscode.Uri.file(path.join(workspaceRoot, targetFolder));
    await vscode.commands.executeCommand("revealInExplorer", targetUri);
  };

  const openFolderDirectoryCommands = COMMAND_IDS.openFolderDirectory.map(
    (commandId) =>
      vscode.commands.registerCommand(commandId, openFolderDirectoryHandler),
  );

  const editDescriptionHandler = async (item?: SymlinkItem): Promise<void> => {
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
      return;
    }

    const targetDir = path.join(workspaceRoot, getTargetFolder());
    await setDescription(targetDir, item.entry.name, description);
    await syncInstructions(workspaceRoot);
    treeProvider.refresh();
  };

  const editDescriptionCommands = COMMAND_IDS.editDescription.map((commandId) =>
    vscode.commands.registerCommand(commandId, editDescriptionHandler),
  );

  const revealOriginalFolderHandler = async (
    item?: SymlinkItem,
  ): Promise<void> => {
    if (!item) {
      return;
    }
    await vscode.commands.executeCommand(
      "revealFileInOS",
      vscode.Uri.file(item.entry.realPath),
    );
  };

  const revealOriginalFolderCommands = COMMAND_IDS.revealOriginalFolder.map(
    (commandId) =>
      vscode.commands.registerCommand(commandId, revealOriginalFolderHandler),
  );

  const configChangeListener = vscode.workspace.onDidChangeConfiguration(
    (event) => {
      if (
        !event.affectsConfiguration("agentContext") &&
        !event.affectsConfiguration("agentFolders") &&
        !event.affectsConfiguration("symlinkFolders")
      ) {
        return;
      }

      refreshWatchers();
      treeProvider.refresh();
    },
  );

  context.subscriptions.push(
    treeView,
    {
      dispose: () =>
        watcherDisposables.forEach((disposable) => disposable.dispose()),
    },
    ...addCommands,
    ...removeCommands,
    ...refreshCommands,
    ...openFolderDirectoryCommands,
    ...editDescriptionCommands,
    ...revealOriginalFolderCommands,
    configChangeListener,
  );
}

export function deactivate(): void {}
