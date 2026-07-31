(function () {
   const vscode = acquireVsCodeApi();

   const ICONS = {
      play: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5.2 3.3c0-.8.9-1.3 1.6-.9l7 4.7c.6.4.6 1.4 0 1.8l-7 4.7c-.7.4-1.6-.1-1.6-.9V3.3z"/></svg>',
      stop: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1.5"/></svg>',
      trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" aria-hidden="true"><path d="M3 4.5h10M6.3 4.5V3.2c0-.4.3-.7.7-.7h2c.4 0 .7.3.7.7v1.3M4.5 4.5l.6 8.3c0 .5.5 1 1 1h3.8c.5 0 1-.5 1-1l.6-8.3"/></svg>',
      check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>',
      close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>'
   };

   const formEl = document.getElementById("form");
   const formErrorEl = document.getElementById("form-error");
   const labelField = document.getElementById("field-label");
   const commandField = document.getElementById("field-command");
   const labelInput = document.getElementById("draft-label");
   const commandInput = document.getElementById("draft-command");
   const cwdInput = document.getElementById("draft-cwd");
   const backgroundInput = document.getElementById("draft-background");

   const filterRow = document.getElementById("filter-row");
   const filterInput = document.getElementById("filter");
   const filterCountEl = document.getElementById("filter-count");
   const listEl = document.getElementById("task-list");
   const noResultsEl = document.getElementById("no-results");
   const emptyEl = document.getElementById("empty");
   const emptyTitleEl = document.getElementById("empty-title");
   const emptyHintEl = document.getElementById("empty-hint");
   const emptyButtonEl = document.getElementById("empty-new");

   const persisted = vscode.getState() || {};

   const ui = {
      formOpen: Boolean(persisted.formOpen),
      filter: persisted.filter || "",
      draft: persisted.draft || {}
   };

   let model = {
      tasks: [],
      running: [],
      lastRun: {},
      noWorkspace: false,
      loaded: false
   };

   let confirmingDelete = null;
   let confirmTimer = null;

   function persist() {
      vscode.setState({
         formOpen: ui.formOpen,
         filter: ui.filter,
         draft: ui.draft
      });
   }

   function relativeTime(stamp) {
      const seconds = Math.round((Date.now() - stamp) / 1000);

      if (seconds < 45) {
         return "just now";
      }

      const minutes = Math.round(seconds / 60);

      if (minutes < 60) {
         return minutes + "m ago";
      }

      const hours = Math.round(minutes / 60);

      if (hours < 24) {
         return hours + "h ago";
      }

      return Math.round(hours / 24) + "d ago";
   }

   function iconButton(kind, icon, title) {
      const button = document.createElement("button");

      button.className = "icon-button " + kind;
      button.innerHTML = ICONS[icon];
      button.title = title;
      button.setAttribute("aria-label", title);

      return button;
   }

   function buildActions(task, isRunning) {
      const actions = document.createElement("div");
      actions.className = "task-actions";

      if (confirmingDelete === task.label) {
         const question = document.createElement("span");
         question.className = "confirm-label";
         question.textContent = "Delete?";

         const confirm = iconButton("confirm", "check", "Confirm delete");
         const cancel = iconButton("cancel", "close", "Cancel");

         confirm.addEventListener("click", () => {
            clearConfirm();
            vscode.postMessage({ type: "deleteTask", label: task.label });
         });

         cancel.addEventListener("click", () => {
            clearConfirm();
            render();
         });

         actions.appendChild(question);
         actions.appendChild(confirm);
         actions.appendChild(cancel);

         return actions;
      }

      if (isRunning) {
         const stop = iconButton("stop", "stop", "Stop " + task.label);

         stop.addEventListener("click", () => {
            vscode.postMessage({ type: "stopTask", label: task.label });
         });

         actions.appendChild(stop);
      } else {
         const run = iconButton("run", "play", "Run " + task.label);

         run.addEventListener("click", () => {
            vscode.postMessage({ type: "runTask", label: task.label });
         });

         actions.appendChild(run);
      }

      const remove = iconButton("delete", "trash", "Delete " + task.label);

      remove.addEventListener("click", () => {
         startConfirm(task.label);
      });

      actions.appendChild(remove);

      return actions;
   }

   function buildRow(task) {
      const isRunning = model.running.indexOf(task.label) !== -1;

      const item = document.createElement("li");
      item.className = "task"
         + (isRunning ? " running" : "")
         + (confirmingDelete === task.label ? " confirming" : "");
      item.tabIndex = 0;
      item.dataset.label = task.label;

      const dot = document.createElement("span");
      dot.className = "status-dot";
      item.appendChild(dot);

      const body = document.createElement("div");
      body.className = "task-body";

      const top = document.createElement("div");
      top.className = "task-top";

      const name = document.createElement("span");
      name.className = "task-name";
      name.textContent = task.label;
      top.appendChild(name);

      if (task.isBackground) {
         const badge = document.createElement("span");
         badge.className = "badge";
         badge.textContent = "bg";
         badge.title = "Background task";
         top.appendChild(badge);
      }

      const meta = document.createElement("span");
      meta.className = "task-meta";

      if (isRunning) {
         meta.textContent = "Running";
      } else if (model.lastRun[task.label]) {
         meta.textContent = relativeTime(model.lastRun[task.label]);
         meta.title = "Last run";
      }

      top.appendChild(meta);

      const command = document.createElement("code");
      command.className = "task-command";
      command.textContent = task.command;
      command.title = task.command + "\n" + (((task.options || {}).cwd) || "");

      body.appendChild(top);
      body.appendChild(command);

      item.appendChild(body);
      item.appendChild(buildActions(task, isRunning));

      item.addEventListener("dblclick", () => {
         const type = isRunning ? "stopTask" : "runTask";

         vscode.postMessage({ type: type, label: task.label });
      });

      return item;
   }

   function visibleTasks() {
      const query = ui.filter.trim().toLowerCase();

      if (query === "") {
         return model.tasks;
      }

      return model.tasks.filter(task => {
         const label = String(task.label || "").toLowerCase();
         const command = String(task.command || "").toLowerCase();

         return label.indexOf(query) !== -1 || command.indexOf(query) !== -1;
      });
   }

   function render() {
      const hasTasks = model.tasks.length > 0;
      const shown = visibleTasks();

      formEl.hidden = !ui.formOpen || model.noWorkspace;
      filterRow.hidden = !hasTasks || model.noWorkspace;
      noResultsEl.hidden = !(hasTasks && shown.length === 0);

      const isFiltering = ui.filter.trim() !== "";
      filterCountEl.textContent = isFiltering
         ? shown.length + "/" + model.tasks.length
         : String(model.tasks.length);

      listEl.textContent = "";

      shown.forEach(task => {
         listEl.appendChild(buildRow(task));
      });

      if (model.noWorkspace) {
         emptyEl.hidden = false;
         emptyTitleEl.textContent = "No folder open";
         emptyHintEl.textContent = "Open a folder to create and run its tasks.";
         emptyButtonEl.hidden = true;
      } else if (model.loaded && !hasTasks && !ui.formOpen) {
         emptyEl.hidden = false;
         emptyTitleEl.textContent = "No tasks yet";
         emptyHintEl.textContent = "Define a command once, run it any time with one click.";
         emptyButtonEl.hidden = false;
      } else {
         emptyEl.hidden = true;
      }
   }

   function startConfirm(label) {
      confirmingDelete = label;

      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(() => {
         clearConfirm();
         render();
      }, 4000);

      render();
   }

   function clearConfirm() {
      confirmingDelete = null;
      clearTimeout(confirmTimer);
   }

   function openForm(focus) {
      ui.formOpen = true;
      persist();
      render();

      if (focus) {
         labelInput.focus();
      }
   }

   function closeForm() {
      ui.formOpen = false;
      persist();
      clearFormErrors();
      render();
   }

   function clearFormErrors() {
      labelField.classList.remove("invalid");
      commandField.classList.remove("invalid");
      formErrorEl.textContent = "";
   }

   function clearDraft() {
      labelInput.value = "";
      commandInput.value = "";
      cwdInput.value = "";
      backgroundInput.checked = false;
      ui.draft = {};
      persist();
   }

   function submitForm() {
      clearFormErrors();

      const label = labelInput.value.trim();
      const command = commandInput.value.trim();
      const duplicate = model.tasks.some(task => task.label === label);

      let valid = true;

      if (label === "") {
         labelField.classList.add("invalid");
         labelField.querySelector(".field-error").textContent = "A label is required.";
         valid = false;
      } else if (duplicate) {
         labelField.classList.add("invalid");
         labelField.querySelector(".field-error").textContent = "This label is already taken.";
         valid = false;
      }

      if (command === "") {
         commandField.classList.add("invalid");
         commandField.querySelector(".field-error").textContent = "A command is required.";
         valid = false;
      }

      if (!valid) {
         return;
      }

      vscode.postMessage({
         type: "addTask",
         task: {
            label: label,
            command: command,
            cwd: cwdInput.value.trim(),
            isBackground: backgroundInput.checked
         }
      });
   }

   listEl.addEventListener("keydown", event => {
      const row = event.target.closest(".task");

      if (!row) {
         return;
      }

      if (event.key === "Enter") {
         event.preventDefault();

         const isRunning = row.classList.contains("running");

         vscode.postMessage({
            type: isRunning ? "stopTask" : "runTask",
            label: row.dataset.label
         });

         return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
         event.preventDefault();
         startConfirm(row.dataset.label);
         return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
         event.preventDefault();

         const rows = Array.from(listEl.querySelectorAll(".task"));
         const index = rows.indexOf(row);
         const nextIndex = event.key === "ArrowDown" ? index + 1 : index - 1;

         if (rows[nextIndex]) {
            rows[nextIndex].focus();
         }
      }
   });

   filterInput.addEventListener("input", () => {
      ui.filter = filterInput.value;
      persist();
      render();
   });

   [labelInput, commandInput, cwdInput].forEach(input => {
      input.addEventListener("input", () => {
         ui.draft[input.id] = input.value;
         persist();
      });

      input.addEventListener("keydown", event => {
         if (event.key === "Enter") {
            event.preventDefault();
            submitForm();
         }
      });
   });

   backgroundInput.addEventListener("change", () => {
      ui.draft[backgroundInput.id] = backgroundInput.checked;
      persist();
   });

   formEl.addEventListener("keydown", event => {
      if (event.key === "Escape") {
         closeForm();
      }
   });

   document.getElementById("form-submit").addEventListener("click", submitForm);
   document.getElementById("form-cancel").addEventListener("click", closeForm);
   document.getElementById("form-close").addEventListener("click", closeForm);
   emptyButtonEl.addEventListener("click", () => openForm(true));

   window.addEventListener("message", event => {
      const message = event.data;

      if (message.type === "state") {
         model = {
            tasks: message.tasks || [],
            running: message.running || [],
            lastRun: message.lastRun || {},
            noWorkspace: Boolean(message.noWorkspace),
            loaded: true
         };

         if (message.added) {
            clearDraft();
            closeForm();
         }

         if (confirmingDelete !== null) {
            const stillThere = model.tasks.some(task => task.label === confirmingDelete);

            if (!stillThere) {
               clearConfirm();
            }
         }

         render();
      }

      if (message.type === "formError") {
         formErrorEl.textContent = message.message;
      }

      if (message.type === "openForm") {
         openForm(true);
      }
   });

   setInterval(() => {
      const hasHistory = model.tasks.some(task => model.lastRun[task.label]);

      if (hasHistory) {
         render();
      }
   }, 30000);

   function restoreDraft() {
      Object.keys(ui.draft).forEach(id => {
         const input = document.getElementById(id);

         if (!input) {
            return;
         }

         if (input.type === "checkbox") {
            input.checked = Boolean(ui.draft[id]);
         } else {
            input.value = ui.draft[id];
         }
      });

      filterInput.value = ui.filter;
   }

   const closeButton = document.getElementById("form-close");
   closeButton.innerHTML = ICONS.close;

   restoreDraft();
   render();
   vscode.postMessage({ type: "ready" });
}());
