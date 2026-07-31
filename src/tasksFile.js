const vscode = require("vscode");

const TASKS_DIR = ".tasks";
const TASKS_FILE = "task.json";
const DEFAULT_CWD = "${workspaceFolder}";

const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();

function workspaceRoot() {
   const folders = vscode.workspace.workspaceFolders;

   if (!folders || folders.length === 0) {
      throw new Error("Open a folder before adding a task.");
   }

   return folders[0].uri;
}

function taskFileUri(root) {
   return vscode.Uri.joinPath(root, TASKS_DIR, TASKS_FILE);
}

async function exists(uri) {
   try {
      await vscode.workspace.fs.stat(uri);
      return true;
   } catch (err) {
      return false;
   }
}

async function ensureTaskFile() {
   const root = workspaceRoot();
   const dir = vscode.Uri.joinPath(root, TASKS_DIR);
   const file = taskFileUri(root);

   await vscode.workspace.fs.createDirectory(dir);

   if (!await exists(file)) {
      await write(file, { version: "2.0.0", tasks: [] });
   }

   return file;
}

async function read(file) {
   const bytes = await vscode.workspace.fs.readFile(file);
   const text = decoder.decode(bytes).trim();

   if (text === "") {
      return { version: "2.0.0", tasks: [] };
   }

   const parsed = JSON.parse(text);

   if (!Array.isArray(parsed.tasks)) {
      parsed.tasks = [];
   }

   return parsed;
}

async function write(file, contents) {
   const text = JSON.stringify(contents, null, 4) + "\n";

   await vscode.workspace.fs.writeFile(file, encoder.encode(text));
}

function buildEntry(details) {
   const entry = {
      label: details.label,
      type: "shell",
      command: details.command,
      options: {
         cwd: details.cwd || DEFAULT_CWD
      }
   };

   if (details.isBackground) {
      entry.isBackground = true;
   }

   entry.problemMatcher = [];
   entry.presentation = {
      reveal: "always",
      panel: "dedicated",
      clear: true
   };

   return entry;
}

async function addTask(details) {
   const label = String(details.label || "").trim();
   const command = String(details.command || "").trim();

   if (label === "") {
      throw new Error("A task needs a label.");
   }

   if (command === "") {
      throw new Error("A task needs a command.");
   }

   const file = await ensureTaskFile();
   const contents = await read(file);

   const taken = contents.tasks.some(task => task.label === label);

   if (taken) {
      throw new Error('A task labelled "' + label + '" already exists.');
   }

   contents.tasks.push(buildEntry({
      label: label,
      command: command,
      cwd: String(details.cwd || "").trim(),
      isBackground: Boolean(details.isBackground)
   }));

   await write(file, contents);

   return contents.tasks;
}

async function removeTask(label) {
   const file = await ensureTaskFile();
   const contents = await read(file);
   const index = contents.tasks.findIndex(task => task.label === label);

   if (index === -1) {
      throw new Error('No task labelled "' + label + '".');
   }

   contents.tasks.splice(index, 1);

   await write(file, contents);

   return contents.tasks;
}

function resolveCwd(cwd, rootPath) {
   const raw = String(cwd || DEFAULT_CWD);

   return raw.split(DEFAULT_CWD).join(rootPath);
}

async function findTask(label) {
   const tasks = await listTasks();
   const entry = tasks.find(task => task.label === label);

   if (!entry) {
      throw new Error('No task labelled "' + label + '".');
   }

   return entry;
}

async function listTasks() {
   const root = workspaceRoot();
   const file = taskFileUri(root);

   if (!await exists(file)) {
      return [];
   }

   const contents = await read(file);

   return contents.tasks;
}

module.exports = {
   TASKS_DIR,
   TASKS_FILE,
   DEFAULT_CWD,
   workspaceRoot,
   taskFileUri,
   ensureTaskFile,
   addTask,
   removeTask,
   listTasks,
   findTask,
   resolveCwd,
   buildEntry,
   read,
   write
};
