# Taskbench

A VS Code extension that keeps your project's shell commands in the Explorer sidebar. You save a command once, and after that it's one click to run.

## Using it

Open the Taskbench view in the Explorer sidebar. Click `+` (or run `Taskbench: New Task` from the Command Palette) and give the task a label and a command. The working directory and the "Background task" checkbox are optional. To run a task, press its play button or double-click the row.

Tasks run through VS Code's own task system, each in its own terminal panel, so the output shows up where you'd expect it. While a task is running its dot pulses green and the play button turns into a stop button. Double-clicking a running task stops it too. When it finishes, the row shows how long ago it last ran. Those times are kept in VS Code's workspace storage, not in the task file.

Check "Background task" for commands that don't exit on their own, like dev servers and watchers. That sets `isBackground` on the task and puts a `bg` tag on the row.

The filter box at the top matches against both the label and the command, which helps once the list gets long. Deleting a task asks you to confirm first.

## The task file

Tasks are saved in `.tasks/task.json` at the root of the first workspace folder. It's a plain file in the project, so you can commit it and everyone working on the repo gets the same tasks. A task made with the form looks like this:

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
            },
            "problemMatcher": [],
            "presentation": {
                "reveal": "always",
                "panel": "dedicated",
                "clear": true
            }
        }
    ]
}
```

The format copies VS Code's `tasks.json`, but it's a separate file, so these tasks don't show up in VS Code's Run Task menu. Taskbench only reads some of the fields: `label`, `command`, `options.cwd`, `isBackground` and `presentation` (`reveal`, `panel` and `clear`). Every task runs as a shell command whatever `type` says, and `${workspaceFolder}` is the only variable that gets filled in inside `cwd`.

`Taskbench: Open task.json` opens the file for editing by hand. The view watches it and updates when you save. The form won't let you reuse a label, because the label is how the view tells tasks apart.

## Commands

| Command | What it does |
| --- | --- |
| `Taskbench: New Task` | Opens the form for a new task |
| `Taskbench: Refresh` | Reloads the list from disk |
| `Taskbench: Open task.json` | Opens the task file, creating it first if it doesn't exist |

All three are also buttons in the view's title bar.

## Running it from source

It needs VS Code 1.75 or newer and has no npm dependencies. Open this folder in VS Code and press F5. That opens a second VS Code window with Taskbench loaded.

Changes are listed in [CHANGELOG.md](CHANGELOG.md). It's MIT licensed.
