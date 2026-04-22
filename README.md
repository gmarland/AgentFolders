# Agent Context

`Agent Context` is a VS Code extension for attaching external reference folders to your current workspace without copying them into the repo.

It creates symlinks inside a configurable workspace folder such as `.examples/`, keeps a sidebar list of attached folders, and can update a dedicated generated instructions file so coding agents and other collaborators know those references exist.

## Why This Exists

Teams often have useful reference implementations that live outside the current repository:

- old services
- internal starter projects
- experimental branches checked out elsewhere
- pattern libraries or sample apps

This extension lets you attach those folders to the active workspace as symlinks so they are visible to tooling and easy to reference, while leaving the original folders in place.

## What It Does

- Adds a dedicated `Agent Context` icon to the VS Code Activity Bar
- Shows all attached folders in a sidebar view
- Lets you add a folder from anywhere on disk
- Lets you remove an attached folder without touching the original source folder
- Stores optional descriptions for each attached folder
- Automatically maintains a managed block in `.gitignore` for the configured target folder when it exists
- Can automatically maintain a block in a dedicated generated instructions file listing the available examples

## How It Works

When you attach a folder, the extension:

1. Creates a symlink inside the configured target folder in your workspace
2. Stores metadata in a sidecar file named `.symlinks.json`
3. Updates `.gitignore` with a managed marker block that ignores the target folder and generated instructions file
4. Optionally updates `AgentContext.AGENTS.md` or another configured instructions file with a generated section listing the attached examples

The generated instructions block is wrapped with markers so it can be updated safely:

```md
<!-- symlink-folders:start -->
...
<!-- symlink-folders:end -->
```

## Sidebar Workflow

Open the `Agent Context` icon in the Activity Bar to manage attached folders.

Available actions:

- `Add Context Folder`: choose a folder on disk and attach it
- `Refresh`: reload the sidebar
- `Open Agent Context Directory`: reveal the workspace folder that contains the symlinks
- `Remove Context Folder`: detach a folder from the workspace
- `Edit Description`: update the text shown for that example
- `Reveal Original Folder`: open the original folder location in the OS file manager

## Configuration

This extension contributes the following settings:

### `agentContext.targetFolder`

- Default: `.examples`
- The folder inside the workspace where symlinks are created

### `agentContext.updateAgentInstructions`

- Default: `true`
- Enables automatic updates to the shared instructions file when folders are added or removed

### `agentContext.instructionsFile`

- Default: `AgentContext.AGENTS.md`
- Relative path to the generated instructions file to update

## Example

If your workspace is:

```text
/projects/current-app
```

and you attach:

```text
/projects/reference-apps/nest-auth-example
```

the extension can create:

```text
/projects/current-app/.examples/nest-auth-example
```

That symlink points to the original folder, so you can inspect it from the current workspace without duplicating files.

## Development

### Requirements

- Node.js
- npm
- VS Code 1.85 or newer

### Install dependencies

```bash
npm install
```

### Build

```bash
npm run compile
```

### Watch during development

```bash
npm run watch
```

### Lint

```bash
npm run lint
```

### Run the extension

Open this project in VS Code and launch the extension host from the debugger.

## Project Structure

- `src/extension.ts`: extension activation and command registration
- `src/symlinkManager.ts`: symlink creation, removal, listing, and metadata storage
- `src/instructionsManager.ts`: generated instructions block management
- `src/config.ts`: workspace configuration access
- `src/symlinkTreeProvider.ts`: sidebar tree view data provider

## Current Limitations

- The attached folder name is derived from the source folder basename
- The metadata sidecar file is stored inside the target folder
- The instructions sync currently appends or replaces only the managed marker block in the generated instructions file

## Intended Use

This project is particularly useful when you want coding agents, AI tools, or other collaborators to have visibility into approved example implementations without vendoring those examples into the repository.

It is a workspace convenience tool, not a packaging or dependency management system.
