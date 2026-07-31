const vscode = require("vscode");
const tasksFile = require("./tasksFile");

const TASK_SOURCE = "taskbench";

function presentationFor(presentation) {
   const wanted = presentation || {};

   const reveals = {
      always: vscode.TaskRevealKind.Always,
      silent: vscode.TaskRevealKind.Silent,
      never: vscode.TaskRevealKind.Never
   };

   const panels = {
      shared: vscode.TaskPanelKind.Shared,
      dedicated: vscode.TaskPanelKind.Dedicated,
      new: vscode.TaskPanelKind.New
   };

   return {
      reveal: reveals[wanted.reveal] === undefined ? vscode.TaskRevealKind.Always : reveals[wanted.reveal],
      panel: panels[wanted.panel] === undefined ? vscode.TaskPanelKind.Dedicated : panels[wanted.panel],
      clear: wanted.clear !== false
   };
}

async function runTask(label) {
   const folders = vscode.workspace.workspaceFolders;

   if (!folders || folders.length === 0) {
      throw new Error("Open a folder before running a task.");
   }

   const entry = await tasksFile.findTask(label);
   const folder = folders[0];
   const cwd = tasksFile.resolveCwd((entry.options || {}).cwd, folder.uri.fsPath);

   const task = new vscode.Task(
      { type: "shell", label: entry.label },
      folder,
      entry.label,
      TASK_SOURCE,
      new vscode.ShellExecution(entry.command, { cwd: cwd }),
      []
   );

   task.isBackground = Boolean(entry.isBackground);
   task.presentationOptions = presentationFor(entry.presentation);

   await vscode.tasks.executeTask(task);
}

function stopTask(label) {
   const execution = vscode.tasks.taskExecutions.find(candidate =>
      candidate.task.source === TASK_SOURCE && candidate.task.name === label
   );

   if (execution) {
      execution.terminate();
   }
}

function ownsExecution(execution) {
   return execution.task.source === TASK_SOURCE;
}

module.exports = {
   TASK_SOURCE,
   runTask,
   stopTask,
   ownsExecution,
   presentationFor
};
