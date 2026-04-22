import * as fs from "fs";
import * as path from "path";
import { SymlinkEntry } from "./symlinkManager";

const BLOCK_START = "<!-- symlink-folders:start -->";
const BLOCK_END = "<!-- symlink-folders:end -->";
const GITIGNORE_BLOCK_START = "# agent-folders:start";
const GITIGNORE_BLOCK_END = "# agent-folders:end";

function generateBlock(symlinks: SymlinkEntry[], targetFolder: string): string {
  if (symlinks.length === 0) {
    return `${BLOCK_START}\n${BLOCK_END}\n`;
  }

  const lines = [
    BLOCK_START,
    "## Agent Context",
    "",
    `The following folders are symlinked into \`${targetFolder}/\` to provide shared project context and reference implementations.`,
    "Refer to this context for patterns and conventions used in this project when it is relevant to the task.",
    "",
  ];

  for (const s of symlinks) {
    const desc = s.description ? ` — ${s.description}` : "";
    lines.push(`- **${s.name}** (\`${targetFolder}/${s.name}\`)${desc}`);
  }

  lines.push(BLOCK_END, "");
  return lines.join("\n");
}

export async function updateInstructionsFile(
  instructionsFilePath: string,
  symlinks: SymlinkEntry[],
  targetFolder: string,
): Promise<void> {
  // Ensure parent directory exists
  await fs.promises.mkdir(path.dirname(instructionsFilePath), {
    recursive: true,
  });

  let existing = "";
  try {
    existing = await fs.promises.readFile(instructionsFilePath, "utf8");
  } catch {
    // File doesn't exist yet — start empty
  }

  const newBlock = generateBlock(symlinks, targetFolder);

  const startIdx = existing.indexOf(BLOCK_START);
  const endIdx = existing.indexOf(BLOCK_END);

  let updated: string;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Replace existing block (keep content before and after)
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + BLOCK_END.length).replace(/^\n/, "");
    updated =
      before + newBlock + (after.trimStart() ? "\n" + after.trimStart() : "");
  } else if (existing.trim().length > 0) {
    // Append to existing content
    updated = existing.trimEnd() + "\n\n" + newBlock;
  } else {
    updated = newBlock;
  }

  await fs.promises.writeFile(instructionsFilePath, updated, "utf8");
}

export async function updateGitignoreFile(
  gitignoreFilePath: string,
  targetFolder: string,
  targetDirPath: string,
  instructionsFilePath?: string,
): Promise<void> {
  let existing = "";
  try {
    existing = await fs.promises.readFile(gitignoreFilePath, "utf8");
  } catch {
    // File doesn't exist yet — start empty
  }

  const normalizedTarget = targetFolder.replace(/^\/+|\/+$/g, "");
  const normalizedInstructionsPath =
    instructionsFilePath && path.dirname(gitignoreFilePath)
      ? path
          .relative(path.dirname(gitignoreFilePath), instructionsFilePath)
          .replace(/\\/g, "/")
          .replace(/^\/+/, "")
      : "";
  let targetDirExists = false;
  try {
    const stat = await fs.promises.stat(targetDirPath);
    targetDirExists = stat.isDirectory();
  } catch {
    targetDirExists = false;
  }

  const managedEntries: string[] = [];
  if (normalizedTarget.length > 0 && targetDirExists) {
    managedEntries.push(`/${normalizedTarget}/`);
  }
  if (normalizedInstructionsPath.length > 0) {
    managedEntries.push(`/${normalizedInstructionsPath}`);
  }

  const managedBlock =
    managedEntries.length > 0
      ? `${GITIGNORE_BLOCK_START}\n${managedEntries.join("\n")}\n${GITIGNORE_BLOCK_END}\n`
      : "";

  const startIdx = existing.indexOf(GITIGNORE_BLOCK_START);
  const endIdx = existing.indexOf(GITIGNORE_BLOCK_END);

  let updated = existing;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = existing.slice(0, startIdx).trimEnd();
    const after = existing
      .slice(endIdx + GITIGNORE_BLOCK_END.length)
      .trimStart();

    updated = [before, managedBlock.trimEnd(), after]
      .filter((part) => part.length > 0)
      .join("\n\n");

    if (updated.length > 0) {
      updated = `${updated.trimEnd()}\n`;
    }
  } else if (managedBlock.length > 0) {
    updated = existing.trimEnd();
    updated =
      updated.length > 0 ? `${updated}\n\n${managedBlock}` : managedBlock;
  }

  if (updated === existing) {
    return;
  }

  if (updated.length === 0) {
    try {
      await fs.promises.unlink(gitignoreFilePath);
    } catch {
      // Nothing to remove
    }
    return;
  }

  await fs.promises.writeFile(gitignoreFilePath, updated, "utf8");
}
