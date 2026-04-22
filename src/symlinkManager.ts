import * as fs from "fs";
import * as path from "path";

export interface SymlinkEntry {
  name: string;
  symlinkPath: string;
  realPath: string;
  description?: string;
}

interface SidecarData {
  [name: string]: { realPath: string; description?: string };
}

const SIDECAR_FILE = '.symlinks.json';

async function readSidecar(targetDir: string): Promise<SidecarData> {
  try {
    const raw = await fs.promises.readFile(path.join(targetDir, SIDECAR_FILE), 'utf8');
    return JSON.parse(raw) as SidecarData;
  } catch {
    return {};
  }
}

async function writeSidecar(targetDir: string, data: SidecarData): Promise<void> {
  await fs.promises.writeFile(
    path.join(targetDir, SIDECAR_FILE),
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

export async function setDescription(
  targetDir: string,
  name: string,
  description: string
): Promise<void> {
  const data = await readSidecar(targetDir);
  data[name] = { ...data[name], description };
  await writeSidecar(targetDir, data);
}

export async function ensureTargetDir(targetDir: string): Promise<void> {
  await fs.promises.mkdir(targetDir, { recursive: true });
}

export async function addSymlink(
  sourcePath: string,
  workspaceRoot: string,
  targetFolder: string,
): Promise<string> {
  const targetDir = path.join(workspaceRoot, targetFolder);
  await ensureTargetDir(targetDir);

  const name = path.basename(sourcePath);
  const symlinkPath = path.join(targetDir, name);

  try {
    await fs.promises.lstat(symlinkPath);
    throw new Error(
      `A symlink named "${name}" already exists in ${targetFolder}`,
    );
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  await fs.promises.symlink(sourcePath, symlinkPath, "junction");

  // Record in sidecar
  const data = await readSidecar(targetDir);
  data[name] = { realPath: sourcePath };
  await writeSidecar(targetDir, data);

  return symlinkPath;
}

export async function removeSymlink(symlinkPath: string): Promise<void> {
  const stat = await fs.promises.lstat(symlinkPath);
  if (!stat.isSymbolicLink()) {
    throw new Error(`Path is not a symlink: ${symlinkPath}`);
  }
  await fs.promises.unlink(symlinkPath);

  // Remove from sidecar
  const targetDir = path.dirname(symlinkPath);
  const name = path.basename(symlinkPath);
  const data = await readSidecar(targetDir);
  delete data[name];
  await writeSidecar(targetDir, data);
}

export async function listSymlinks(targetDir: string): Promise<SymlinkEntry[]> {
  try {
    await fs.promises.access(targetDir);
  } catch {
    return [];
  }

  const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });
  const symlinks: SymlinkEntry[] = [];

  for (const entry of entries) {
    const fullPath = path.join(targetDir, entry.name);
    const stat = await fs.promises.lstat(fullPath);
    if (stat.isSymbolicLink()) {
      let realPath: string;
      try {
        realPath = await fs.promises.readlink(fullPath);
      } catch {
        realPath = "(unresolvable)";
      }
      symlinks.push({ name: entry.name, symlinkPath: fullPath, realPath });
    }
  }

  // Enrich with descriptions from sidecar
  const sidecar = await readSidecar(targetDir);
  for (const s of symlinks) {
    s.description = sidecar[s.name]?.description;
  }

  return symlinks;
}
