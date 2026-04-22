import * as fs from 'fs';
import * as path from 'path';
import { SymlinkEntry } from './symlinkManager';

const BLOCK_START = '<!-- symlink-folders:start -->';
const BLOCK_END = '<!-- symlink-folders:end -->';

function generateBlock(symlinks: SymlinkEntry[], targetFolder: string): string {
  if (symlinks.length === 0) {
    return `${BLOCK_START}\n${BLOCK_END}\n`;
  }

  const lines = [
    BLOCK_START,
    '## Example Folders',
    '',
    `The following folders are symlinked into \`${targetFolder}/\` to provide reference implementations.`,
    `When writing code, refer to these examples for patterns and conventions used in this project.`,
    '',
  ];

  for (const s of symlinks) {
    const desc = s.description ? ` — ${s.description}` : '';
    lines.push(`- **${s.name}** (\`${targetFolder}/${s.name}\`)${desc}`);
  }

  lines.push(BLOCK_END, '');
  return lines.join('\n');
}

export async function updateInstructionsFile(
  instructionsFilePath: string,
  symlinks: SymlinkEntry[],
  targetFolder: string
): Promise<void> {
  // Ensure parent directory exists
  await fs.promises.mkdir(path.dirname(instructionsFilePath), { recursive: true });

  let existing = '';
  try {
    existing = await fs.promises.readFile(instructionsFilePath, 'utf8');
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
    const after = existing.slice(endIdx + BLOCK_END.length).replace(/^\n/, '');
    updated = before + newBlock + (after.trimStart() ? '\n' + after.trimStart() : '');
  } else if (existing.trim().length > 0) {
    // Append to existing content
    updated = existing.trimEnd() + '\n\n' + newBlock;
  } else {
    updated = newBlock;
  }

  await fs.promises.writeFile(instructionsFilePath, updated, 'utf8');
}
