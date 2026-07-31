const vscode = require("vscode");
const tasksFile = require("./tasksFile");
const { TaskbenchViewProvider, VIEW_ID } = require("./taskbenchViewProvider");

function activate(context) {
   const provider = new TaskbenchViewProvider(context);

   const watcher = vscode.workspace.createFileSystemWatcher(
      "**/" + tasksFile.TASKS_DIR + "/" + tasksFile.TASKS_FILE
   );

   watcher.onDidChange(() => provider.sendState());
   watcher.onDidCreate(() => provider.sendState());
   watcher.onDidDelete(() => provider.sendState());

   context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(VIEW_ID, provider),

      vscode.commands.registerCommand("taskbench.newTask", () => provider.openNewTaskForm()),
      vscode.commands.registerCommand("taskbench.refresh", () => provider.sendState()),
      vscode.commands.registerCommand("taskbench.openFile", () => provider.openTaskFile()),

      vscode.tasks.onDidStartTask(event => provider.trackStart(event.execution)),
      vscode.tasks.onDidEndTask(event => provider.trackEnd(event.execution)),

      watcher
   );
}

function deactivate() {}

module.exports = { activate, deactivate };
