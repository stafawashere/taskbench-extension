const vscode = require("vscode");
const tasksFile = require("./tasksFile");
const taskRunner = require("./taskRunner");
const webviewContent = require("./webviewContent");

const VIEW_ID = "taskbench.view";
const LAST_RUN_KEY = "taskbench.lastRun";

class TaskbenchViewProvider {
   constructor(context) {
      this.context = context;
      this.extensionUri = context.extensionUri;
      this.view = null;
      this.running = new Set();
      this.pendingFormOpen = false;
   }

   resolveWebviewView(webviewView) {
      this.view = webviewView;

      webviewView.webview.options = {
         enableScripts: true,
         localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")]
      };

      webviewView.webview.html = webviewContent.getHtml(webviewView.webview, this.extensionUri);

      webviewView.webview.onDidReceiveMessage(message => {
         this.handleMessage(message);
      });
   }

   async handleMessage(message) {
      switch (message.type) {
         case "ready":
            await this.sendState();

            if (this.pendingFormOpen) {
               this.pendingFormOpen = false;
               this.post({ type: "openForm" });
            }
            break;

         case "refresh":
            await this.sendState();
            break;

         case "addTask":
            await this.addTask(message.task);
            break;

         case "runTask":
            await this.runTask(message.label);
            break;

         case "stopTask":
            taskRunner.stopTask(message.label);
            break;

         case "deleteTask":
            await this.deleteTask(message.label);
            break;

         case "openTaskFile":
            await this.openTaskFile();
            break;

         default:
            console.warn("Unhandled webview message", message.type);
      }
   }

   async openNewTaskForm() {
      await vscode.commands.executeCommand(VIEW_ID + ".focus");

      if (this.view) {
         this.post({ type: "openForm" });
      } else {
         this.pendingFormOpen = true;
      }
   }

   async sendState(extra) {
      const hasWorkspace = Boolean(
         vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length
      );

      let tasks = [];
      let error = null;

      if (hasWorkspace) {
         try {
            tasks = await tasksFile.listTasks();
         } catch (err) {
            error = err.message;
         }
      }

      this.post(Object.assign({
         type: "state",
         tasks: tasks,
         running: Array.from(this.running),
         lastRun: this.context.workspaceState.get(LAST_RUN_KEY, {}),
         noWorkspace: !hasWorkspace
      }, extra || {}));

      if (error) {
         vscode.window.showErrorMessage(error);
      }
   }

   async addTask(details) {
      try {
         await tasksFile.addTask(details || {});
         await this.sendState({ added: details.label });
      } catch (err) {
         this.post({ type: "formError", message: err.message });
      }
   }

   async deleteTask(label) {
      try {
         await tasksFile.removeTask(label);
         await this.sendState();
      } catch (err) {
         vscode.window.showErrorMessage(err.message);
      }
   }

   async runTask(label) {
      try {
         await taskRunner.runTask(label);
      } catch (err) {
         vscode.window.showErrorMessage(err.message);
      }
   }

   trackStart(execution) {
      if (!taskRunner.ownsExecution(execution)) {
         return;
      }

      this.running.add(execution.task.name);
      this.sendState();
   }

   async trackEnd(execution) {
      if (!taskRunner.ownsExecution(execution)) {
         return;
      }

      this.running.delete(execution.task.name);

      const stamps = Object.assign({}, this.context.workspaceState.get(LAST_RUN_KEY, {}));
      stamps[execution.task.name] = Date.now();

      await this.context.workspaceState.update(LAST_RUN_KEY, stamps);
      await this.sendState();
   }

   async openTaskFile() {
      try {
         const file = await tasksFile.ensureTaskFile();
         const document = await vscode.workspace.openTextDocument(file);

         await vscode.window.showTextDocument(document);
      } catch (err) {
         vscode.window.showErrorMessage(err.message);
      }
   }

   post(message) {
      if (this.view) {
         this.view.webview.postMessage(message);
      }
   }
}

module.exports = { TaskbenchViewProvider, VIEW_ID };
