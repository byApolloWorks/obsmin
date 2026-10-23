(() => {
  "use strict";

  const projectPathEl = document.getElementById("projectPath");
  const outPathEl = document.getElementById("outPath");
  const presetOptionsEl = document.getElementById("presetOptions");
  const doctorBtn = document.getElementById("doctorBtn");
  const runBtn = document.getElementById("runBtn");
  const doctorResultEl = document.getElementById("doctorResult");
  const logEl = document.getElementById("log");

  const modal = document.getElementById("browseModal");
  const modalTitleEl = document.getElementById("modalTitle");
  const browsePathEl = document.getElementById("browsePath");
  const browseShortcutsEl = document.getElementById("browseShortcuts");
  const browseListEl = document.getElementById("browseList");
  const browseUpBtn = document.getElementById("browseUp");
  const browseCloseBtn = document.getElementById("browseClose");
  const browseNativeBtn = document.getElementById("browseNativeBtn");
  const browseCancelBtn = document.getElementById("browseCancel");
  const browseSelectBtn = document.getElementById("browseSelect");
  const browseBtn = document.getElementById("browseBtn");
  const browseOutBtn = document.getElementById("browseOutBtn");

  let selectedPreset = "medium";
  let browseCurrent = "";
  let selectedSubdir = null;

  function logLine(text, kind) {
    if (logEl.querySelector(".log-empty")) {
      logEl.innerHTML = "";
    }
    const line = document.createElement("p");
    line.className = "log-line" + (kind ? ` is-${kind}` : "");
    line.textContent = text;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  async function loadPresets() {
    const res = await fetch("/api/presets");
    const presets = await res.json();
    presetOptionsEl.innerHTML = "";
    for (const [key, preset] of Object.entries(presets)) {
      const label = document.createElement("label");
      label.className = "preset-option" + (key === selectedPreset ? " is-selected" : "");
      label.innerHTML = `
        <input type="radio" name="preset" value="${key}" ${key === selectedPreset ? "checked" : ""} />
        <span class="preset-option-body">
          <span class="preset-option-label">${preset.label}</span>
          <span class="preset-option-desc">${preset.description}</span>
        </span>
      `;
      label.querySelector("input").addEventListener("change", () => {
        selectedPreset = key;
        document.querySelectorAll(".preset-option").forEach((el) => el.classList.remove("is-selected"));
        label.classList.add("is-selected");
      });
      presetOptionsEl.appendChild(label);
    }
  }

  async function runDoctor() {
    doctorResultEl.hidden = false;
    doctorResultEl.innerHTML = "Checking...";
    const res = await fetch("/api/doctor");
    const report = await res.json();
    doctorResultEl.innerHTML = "";
    for (const r of report.results) {
      const row = document.createElement("div");
      row.className = "doctor-row";
      const status = r.ok ? "ok" : r.required ? "missing" : "optional";
      row.innerHTML = `<span>${r.name}</span><span class="status-${status}">${r.ok ? "ok" : r.required ? "missing" : "optional"}</span>`;
      doctorResultEl.appendChild(row);
    }
    if (report.platformHint) {
      const hint = document.createElement("div");
      hint.style.marginTop = "8px";
      hint.style.color = "var(--text-muted)";
      hint.textContent = report.platformHint;
      doctorResultEl.appendChild(hint);
    }
  }

  function runObsmin() {
    const projectPath = projectPathEl.value.trim();
    if (!projectPath) {
      logLine("Choose a project folder first.", "error");
      return;
    }
    runBtn.disabled = true;
    logEl.innerHTML = "";
    logLine(`Starting on ${projectPath} (preset: ${selectedPreset})`, "muted");

    fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectPath,
        outDir: outPathEl.value.trim() || undefined,
        preset: selectedPreset
      })
    }).then((res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      function pump() {
        reader.read().then(({ done, value }) => {
          if (done) {
            runBtn.disabled = false;
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop();
          for (const part of parts) {
            const line = part.replace(/^data: /, "");
            if (!line) continue;
            try {
              const event = JSON.parse(line);
              handleEvent(event);
            } catch (err) {
              /* ignore malformed chunk */
            }
          }
          pump();
        });
      }
      pump();
    }).catch((err) => {
      logLine(`Request failed: ${err.message}`, "error");
      runBtn.disabled = false;
    });
  }

  function handleEvent(event) {
    if (event.stage === "result") {
      if (event.status === "error") {
        logLine(`Failed: ${event.message}`, "error");
      } else {
        logLine(event.message, "done");
        if (event.result) {
          logLine(`Output: ${event.result.target}`, "muted");
        }
      }
      return;
    }
    if (event.file) {
      if (event.status === "start") {
        logLine(`[${event.stage}] ${event.file} ...`);
      } else if (event.status === "done") {
        logLine(`[${event.stage}] ${event.file} ok`, "done");
      } else if (event.status === "error") {
        logLine(`[${event.stage}] ${event.file} failed: ${event.message}`, "error");
      }
    } else if (event.message) {
      logLine(`[${event.stage}] ${event.message}`, event.status === "error" ? "error" : "muted");
    }
  }

  function closeModal() {
    modal.hidden = true;
    selectedSubdir = null;
  }

  async function openBrowser(startPath, targetInput, title) {
    selectedSubdir = null;
    modal.dataset.target = targetInput;
    if (modalTitleEl) {
      modalTitleEl.textContent = title || "Choose Folder";
    }
    modal.hidden = false;
    await loadBrowseDir(startPath || "");
  }

  async function loadBrowseDir(dirPath) {
    const res = await fetch(`/api/browse?path=${encodeURIComponent(dirPath)}`);
    const data = await res.json();
    if (data.error) {
      logLine(`Browse error: ${data.error}`, "error");
      return;
    }
    selectedSubdir = null;
    browseCurrent = data.path;
    browsePathEl.textContent = data.path;
    browsePathEl.title = data.path;

    if (browseShortcutsEl && data.shortcuts && data.shortcuts.length) {
      browseShortcutsEl.innerHTML = "";
      for (const s of data.shortcuts) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "shortcut-chip";
        chip.textContent = s.name;
        chip.title = s.path;
        chip.addEventListener("click", () => loadBrowseDir(s.path));
        browseShortcutsEl.appendChild(chip);
      }
      browseShortcutsEl.hidden = false;
    }

    browseListEl.innerHTML = "";
    const sep = data.path.endsWith("/") ? "" : "/";

    if (!data.entries || data.entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "browse-empty";
      empty.innerHTML = "No subfolders here.<br />Click <strong>Use this folder</strong> to select this directory.";
      browseListEl.appendChild(empty);
    } else {
      for (const entry of data.entries) {
        const li = document.createElement("li");
        li.innerHTML = `
          <svg class="browse-list-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>${entry}</span>
        `;
        li.addEventListener("click", () => {
          browseListEl.querySelectorAll("li").forEach((el) => el.classList.remove("is-selected"));
          li.classList.add("is-selected");
          selectedSubdir = entry;
        });
        li.addEventListener("dblclick", () => loadBrowseDir(`${data.path}${sep}${entry}`));
        browseListEl.appendChild(li);
      }
    }
    browseUpBtn.onclick = () => loadBrowseDir(data.parent);
  }

  doctorBtn.addEventListener("click", runDoctor);
  runBtn.addEventListener("click", runObsmin);

  if (browseBtn) {
    browseBtn.addEventListener("click", () => openBrowser(projectPathEl.value, "projectPath", "Choose Project Folder"));
  }
  if (browseOutBtn) {
    browseOutBtn.addEventListener("click", () => openBrowser(outPathEl.value, "outPath", "Choose Output Folder"));
  }

  if (browseNativeBtn) {
    browseNativeBtn.addEventListener("click", async () => {
      browseNativeBtn.disabled = true;
      try {
        const title = modal.dataset.target === "projectPath" ? "Choose Project Folder" : "Choose Output Folder";
        const res = await fetch("/api/choose-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title })
        });
        const data = await res.json();
        if (data.path) {
          const target = modal.dataset.target === "projectPath" ? projectPathEl : outPathEl;
          target.value = data.path;
          closeModal();
        }
      } catch (err) {
        logLine(`System folder picker error: ${err.message}`, "error");
      } finally {
        browseNativeBtn.disabled = false;
      }
    });
  }

  browseCancelBtn.addEventListener("click", closeModal);
  if (browseCloseBtn) {
    browseCloseBtn.addEventListener("click", closeModal);
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });

  browseSelectBtn.addEventListener("click", () => {
    const target = modal.dataset.target === "projectPath" ? projectPathEl : outPathEl;
    const sep = browseCurrent.endsWith("/") ? "" : "/";
    target.value = selectedSubdir ? `${browseCurrent}${sep}${selectedSubdir}` : browseCurrent;
    closeModal();
  });

  loadPresets();
})();
