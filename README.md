# Agent Context

Give your AI coding tools access to your best reference code — without copying anything into your repo.

---

## Why this exists

Modern AI tools like GitHub Copilot, Cursor, and ChatGPT are only as good as the context they can see.

But your most valuable code usually lives somewhere else:

- previous services  
- internal starter projects  
- architecture patterns  
- experimental repos  

Agent Context lets you attach those projects directly to your workspace — so both **you and your AI tools can use them immediately**.

---

## What it does

- Attach external folders as **live references**
- Expose them inside your workspace via symlinks
- Keep your repo clean (no copying, no vendoring)
- Maintain a shared instructions file for humans and AI
- Provide a sidebar to manage all attached context

---

## Built for AI-assisted development

Agent Context turns your past work into **usable AI context**.

When you attach folders, it can generate a shared instructions block that:

- Lists available reference projects  
- Describes what each one is useful for  
- Helps AI tools generate better, more consistent code  

---

## Example

You’re working on:

/projects/current-app

You attach:

/projects/reference-apps/nest-auth-example

Agent Context creates:

/projects/current-app/.examples/nest-auth-example

Now:

- Browse it directly in VS Code  
- Reference it in prompts  
- Let AI tools use it as context  

Example prompt:

"Implement authentication similar to the nest-auth-example in .examples"

---

## Features

- Activity Bar icon + sidebar view  
- Add folders from anywhere on disk  
- Remove folders safely (no impact on originals)  
- Store descriptions for each reference  
- Auto-managed `.gitignore` block  
- Generated instructions file for team + AI awareness  
- Fast, lightweight, zero-copy workflow  

---

## How it works

When you attach a folder, the extension:

1. Creates a symlink inside a workspace folder (default: `.examples/`)  
2. Stores metadata in `.symlinks.json`  
3. Updates `.gitignore` with a managed block  
4. Optionally updates an instructions file  

The generated instructions section is safely wrapped:

<!-- symlink-folders:start -->
...
<!-- symlink-folders:end -->

---

## Sidebar workflow

Open **Agent Context** from the Activity Bar.

Available actions:

- Add Agent Folder  
- Refresh  
- Open Context Folder  
- Remove Agent Folder  
- Edit Description  
- Reveal Original Folder  

---

## Configuration

### agentFolders.targetFolder

- Default: `.examples`  

### agentFolders.updateAgentInstructions

- Default: `true`  

### agentFolders.instructionsFile

- Default: `AgentContext.AGENTS.md`  

---

## Intended use

Agent Context is ideal when:

- You reuse patterns across projects  
- You want AI tools to follow real examples  
- You want to avoid copying code into repos  
- You want teams aligned on reference implementations  

---

## Installation

1. Open VS Code  
2. Go to Extensions  
3. Search for **Agent Context**  
4. Click Install  

Or install via `.vsix`:

code --install-extension agent-context.vsix

---

## Development

### Requirements

- Node.js  
- npm  
- VS Code 1.85+  

### Install dependencies

npm install

### Build

npm run compile

### Watch mode

npm run watch

### Lint

npm run lint

### Run extension

Open the project in VS Code and launch the Extension Host via debugger.

---

## License

MIT
