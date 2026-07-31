const vscode = require("vscode");

function makeNonce() {
   const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
   let nonce = "";

   for (let index = 0; index < 32; index++) {
      nonce += chars.charAt(Math.floor(Math.random() * chars.length));
   }

   return nonce;
}

function getHtml(webview, extensionUri) {
   const nonce = makeNonce();

   const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "main.css")
   );
   const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "main.js")
   );

   const csp = [
      "default-src 'none'",
      "style-src " + webview.cspSource,
      "script-src 'nonce-" + nonce + "'"
   ].join("; ");

   return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${styleUri}">
<title>Taskbench</title>
</head>
<body>

<div class="scroll">

   <div class="form" id="form" hidden>
      <div class="form-header">
         <span class="form-title">New task</span>
         <button class="icon-button" id="form-close" title="Close" aria-label="Close"></button>
      </div>

      <div class="field" id="field-label">
         <label for="draft-label">Label</label>
         <input type="text" id="draft-label" placeholder="build" spellcheck="false">
         <div class="field-error"></div>
      </div>

      <div class="field" id="field-command">
         <label for="draft-command">Command</label>
         <input type="text" id="draft-command" placeholder="npm run build" spellcheck="false">
         <div class="field-error"></div>
      </div>

      <div class="field">
         <label for="draft-cwd">Working directory <span class="optional">(optional)</span></label>
         <input type="text" id="draft-cwd" placeholder="\${workspaceFolder}" spellcheck="false">
      </div>

      <label class="check-field">
         <input type="checkbox" id="draft-background">
         <span>Background task</span>
      </label>

      <div class="form-error" id="form-error"></div>

      <div class="form-actions">
         <button class="button primary" id="form-submit">Create Task</button>
         <button class="button" id="form-cancel">Cancel</button>
      </div>
   </div>

   <div class="filter" id="filter-row" hidden>
      <div class="filter-box">
         <svg class="filter-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            stroke-width="1.3" stroke-linecap="round" aria-hidden="true">
            <circle cx="7" cy="7" r="4.2"/>
            <path d="M10.2 10.2L13.5 13.5"/>
         </svg>
         <input type="text" id="filter" placeholder="Filter tasks" spellcheck="false"
            aria-label="Filter tasks">
         <span class="filter-count" id="filter-count"></span>
      </div>
   </div>

   <ul class="task-list" id="task-list" aria-label="Tasks"></ul>

   <div class="no-results" id="no-results" hidden>No matching tasks</div>

   <div class="empty" id="empty" hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
         <path d="M4 5.5h11"/>
         <path d="M4 11h8"/>
         <path d="M4 16.5h5"/>
         <path d="M15 12.6c0-.9 1-1.5 1.8-1l5 3c.8.5.8 1.6 0 2.1l-5 3c-.8.5-1.8-.1-1.8-1v-6.1z"/>
      </svg>
      <div class="empty-title" id="empty-title">No tasks yet</div>
      <div class="empty-hint" id="empty-hint"></div>
      <button class="button primary" id="empty-new">Create a Task</button>
   </div>

</div>

<script nonce="${nonce}" src="${scriptUri}"></script>

</body>
</html>`;
}

module.exports = { getHtml };
