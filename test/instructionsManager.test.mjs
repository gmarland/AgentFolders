import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { updateGitignoreFile } from "../out/instructionsManager.js";

const BLOCK_START = "# agent-folders:start";
const BLOCK_END = "# agent-folders:end";

async function withTempDir(run) {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "agent-folders-test-"),
  );
  try {
    await run(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("adds managed block when target folder exists", async () => {
  await withTempDir(async (tempDir) => {
    const gitignorePath = path.join(tempDir, ".gitignore");
    const targetFolder = ".examples";
    const targetDirPath = path.join(tempDir, targetFolder);
    const instructionsFilePath = path.join(tempDir, "AgentContext.AGENTS.md");

    await fs.mkdir(targetDirPath, { recursive: true });

    await updateGitignoreFile(
      gitignorePath,
      targetFolder,
      targetDirPath,
      instructionsFilePath,
    );

    const content = await fs.readFile(gitignorePath, "utf8");
    assert.equal(
      content,
      `${BLOCK_START}\n/.examples/\n/AgentContext.AGENTS.md\n${BLOCK_END}\n`,
      "Expected .gitignore to contain only the managed block",
    );
  });
});

test("appends managed block while preserving existing rules", async () => {
  await withTempDir(async (tempDir) => {
    const gitignorePath = path.join(tempDir, ".gitignore");
    const targetFolder = ".examples";
    const targetDirPath = path.join(tempDir, targetFolder);
    const instructionsFilePath = path.join(tempDir, "AgentContext.AGENTS.md");

    await fs.writeFile(gitignorePath, "node_modules/\nout/\n", "utf8");
    await fs.mkdir(targetDirPath, { recursive: true });

    await updateGitignoreFile(
      gitignorePath,
      targetFolder,
      targetDirPath,
      instructionsFilePath,
    );

    const content = await fs.readFile(gitignorePath, "utf8");
    assert.equal(
      content,
      "node_modules/\nout/\n\n# agent-folders:start\n/.examples/\n/AgentContext.AGENTS.md\n# agent-folders:end\n",
      "Expected existing .gitignore rules to remain and managed block to append",
    );
  });
});

test("removes only the folder ignore entry when target folder is absent", async () => {
  await withTempDir(async (tempDir) => {
    const gitignorePath = path.join(tempDir, ".gitignore");
    const targetFolder = ".examples";
    const targetDirPath = path.join(tempDir, targetFolder);
    const instructionsFilePath = path.join(tempDir, "AgentContext.AGENTS.md");

    await fs.writeFile(
      gitignorePath,
      "node_modules/\n\n# agent-folders:start\n/.examples/\n/AgentContext.AGENTS.md\n# agent-folders:end\n\nout/\n",
      "utf8",
    );

    await updateGitignoreFile(
      gitignorePath,
      targetFolder,
      targetDirPath,
      instructionsFilePath,
    );

    const content = await fs.readFile(gitignorePath, "utf8");
    assert.equal(
      content,
      "node_modules/\n\n# agent-folders:start\n/AgentContext.AGENTS.md\n# agent-folders:end\n\nout/\n",
      "Expected only the folder entry in the managed block to be removed",
    );
  });
});

test("preserves the instructions file ignore entry when only the folder disappears", async () => {
  await withTempDir(async (tempDir) => {
    const gitignorePath = path.join(tempDir, ".gitignore");
    const targetFolder = ".examples";
    const targetDirPath = path.join(tempDir, targetFolder);
    const instructionsFilePath = path.join(tempDir, "AgentContext.AGENTS.md");

    await fs.mkdir(targetDirPath, { recursive: true });
    await updateGitignoreFile(
      gitignorePath,
      targetFolder,
      targetDirPath,
      instructionsFilePath,
    );

    await fs.rm(targetDirPath, { recursive: true, force: true });
    await updateGitignoreFile(
      gitignorePath,
      targetFolder,
      targetDirPath,
      instructionsFilePath,
    );

    const content = await fs.readFile(gitignorePath, "utf8");
    assert.equal(
      content,
      `${BLOCK_START}\n/AgentContext.AGENTS.md\n${BLOCK_END}\n`,
      "Expected .gitignore to keep ignoring the generated instructions file",
    );
  });
});

test("supports ignoring a nested generated instructions file", async () => {
  await withTempDir(async (tempDir) => {
    const gitignorePath = path.join(tempDir, ".gitignore");
    const targetFolder = ".examples";
    const targetDirPath = path.join(tempDir, targetFolder);
    const instructionsFilePath = path.join(
      tempDir,
      ".agent",
      "AgentContext.AGENTS.md",
    );

    await fs.mkdir(targetDirPath, { recursive: true });
    await updateGitignoreFile(
      gitignorePath,
      targetFolder,
      targetDirPath,
      instructionsFilePath,
    );

    const content = await fs.readFile(gitignorePath, "utf8");
    assert.equal(
      content,
      `${BLOCK_START}\n/.examples/\n/.agent/AgentContext.AGENTS.md\n${BLOCK_END}\n`,
      "Expected nested generated instructions file to be ignored relative to the workspace root",
    );
  });
});
