import * as vscode from "vscode";
import * as path from "path";

export function getTargetFolder(): string {
  return vscode.workspace
    .getConfiguration("symlinkFolders")
    .get<string>("targetFolder", ".examples");
}

export function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function shouldUpdateInstructions(): boolean {
  return vscode.workspace
    .getConfiguration("symlinkFolders")
    .get<boolean>("updateAgentInstructions", true);
}

export function getInstructionsFile(workspaceRoot: string): string {
  const rel = vscode.workspace
    .getConfiguration("symlinkFolders")
    .get<string>("instructionsFile", ".github/copilot-instructions.md");
  return path.join(workspaceRoot, rel);
}
