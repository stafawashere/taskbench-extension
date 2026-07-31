# Taskbench

A workbench for project tasks. Create, run and manage shell commands from the Explorer sidebar without leaving your editor.

## Features

- **One-click runs** — save a command once, run it any time from the sidebar
- **Live status** — running tasks show a pulsing indicator and can be stopped in place
- **Background tasks** — mark long-running servers and watchers so VS Code treats them accordingly
- **Filtering** — narrow the list instantly when a project accumulates tasks
- **Plain JSON storage** — tasks live in `.tasks/task.json` in your workspace, using the standard VS Code task schema, so they can be committed and shared with your team

## Usage

1. Open the **Taskbench** view in the Explorer sidebar.
2. Click the **+** button (or run `Taskbench: New Task`) and give the task a label and a command.
3. Press the play button to run it. Running tasks can be stopped with the stop button, or by double-clicking the row.

Tasks execute through the built-in VS Code task system, so output appears in the regular terminal panel.

### Task file

Tasks are stored in `.tasks/task.json` at the workspace root:

```json
{
   "version": "2.0.0",
   "tasks": [
      {
         "label": "build",
         "type": "shell",
         "command": "npm run build",
         "options": {
            "cwd": "${workspaceFolder}"
         }
      }
   ]
}
```

Edit the file directly with `Taskbench: Open task.json` — the view picks up changes automatically.

## Commands

| Command | Description |
| --- | --- |
| `Taskbench: New Task` | Open the inline form to create a task |
| `Taskbench: Refresh` | Reload the task list from disk |
| `Taskbench: Open task.json` | Open the task file for direct editing |

## Requirements

VS Code 1.75 or later. No other dependencies.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).
