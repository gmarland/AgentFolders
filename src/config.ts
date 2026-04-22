import * as vscode from "vscode";
import * as path from "path";

function getConfiguredValue<T>(
  key: string,
  defaultValue: T,
): T {
  const agentContextValue = vscode.workspace
    .getConfiguration("agentContext")
    .get<T>(key);

  if (agentContextValue !== undefined) {
    return agentContextValue;
  }

  const agentFoldersValue = vscode.workspace
    .getConfiguration("agentFolders")
    .get<T>(key);

  if (agentFoldersValue !== undefined) {
    return agentFoldersValue;
  }

  return vscode.workspace
    .getConfiguration("symlinkFolders")
    .get<T>(key, defaultValue);
}

export function getTargetFolder(): string {
  return getConfiguredValue("targetFolder", ".examples");
}

export function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function shouldUpdateInstructions(): boolean {
  return getConfiguredValue("updateAgentInstructions", true);
}

export function getInstructionsFile(workspaceRoot: string): string {
  const rel = getConfiguredValue("instructionsFile", "AgentContext.AGENTS.md");
  return path.join(workspaceRoot, rel);
}
