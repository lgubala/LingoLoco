/* Import & export.

   Export: tick the lists you want. One or twenty, they go into a single file
   or a single clipboard blob.

   Import: whatever arrives is parsed and shown first — which lists are in
   there, how many rules each has, and what would happen to each — and nothing
   touches your settings until you press Import. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var app = BK.app;

  var IDLE_NOTE = "Exports are plain JSON. Lists from the old Buzz Kill add-on work too.";
  var noteTimer = null;

  var picked = {};      // list id -> exporting?
  var staged = null;    // { lists: [{ name, rules }], chosen: [bool] }

  function note(text) {
    app.el("io-note").textContent = text;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () {
      app.el("io-note").textContent = IDLE_NOTE;
    }, 5000);
  }

  function row(opts) {
    var label = document.createElement("label");

    var box = document.createElement("input");
    box.type = "checkbox";
    box.checked = opts.checked;
    box.addEventListener("change", function () { opts.onChange(box.checked); });

    var name = document.createElement("span");
    name.className = "name";
    name.textContent = opts.name;

    var count = document.createElement("span");
    count.className = "count";
    count.textContent = app.plural(opts.rules, "rule");

    label.append(box, name, count);

    if (opts.fate) {
      var fate = document.createElement("span");
      fate.className = "fate";
      fate.textContent = opts.fate;
      label.appendChild(fate);
    }
    return label;
  }

  /* ---------- export ---------- */

  function selectedLists() {
    return app.get().lists.filter(function (l) { return picked[l.id]; });
  }

  function renderExport() {
    var settings = app.get();
    var container = app.el("export-pick");
    container.textContent = "";

    // A list added or renamed since last render still needs a tick box.
    settings.lists.forEach(function (list) {
      if (picked[list.id] === undefined) picked[list.id] = list.id === settings.activeList;
      container.appendChild(row({
        name: list.name,
        rules: list.rules.length,
        checked: !!picked[list.id],
        onChange: function (on) { picked[list.id] = on; renderExport(); }
      }));
    });

    var chosen = selectedLists();
    var rules = chosen.reduce(function (n, l) { return n + l.rules.length; }, 0);
    app.el("export-summary").textContent = chosen.length
      ? app.plural(chosen.length, "list") + ", " + app.plural(rules, "rule")
      : "nothing selected";

    app.el("copy").disabled = !chosen.length;
    app.el("export").disabled = !chosen.length;
  }

  function exportText() {
    return JSON.stringify(BK.share.exportLists(selectedLists()), null, 2);
  }

  function exportFilename() {
    var chosen = selectedLists();
    if (chosen.length === 1) return "buzzkill-" + BK.share.slug(chosen[0].name) + ".json";
    return "buzzkill-" + chosen.length + "-lists.json";
  }

  function copyToClipboard() {
    var chosen = selectedLists();
    navigator.clipboard.writeText(exportText()).then(function () {
      note(app.plural(chosen.length, "list") + " copied \u2014 paste it to whoever wants it.");
    }, function () {
      app.el("paste").value = exportText();
      note("Clipboard blocked, so the export is in the box below instead.");
    });
  }

  function saveToFile() {
    var url = URL.createObjectURL(new Blob([exportText()], { type: "application/json" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = exportFilename();
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    note("Saved " + a.download);
  }

  /* ---------- import ---------- */

  function destination() {
    var checked = document.querySelector('input[name="dest"]:checked');
    return checked ? checked.value : "new";
  }

  /* What each incoming list would do, given the mode picked right now. */
  function fateOf(list) {
    var mode = destination();
    if (mode === "current") return "merge";
    if (mode === "name") {
      return BK.share.findByName(app.get(), list.name) ? "merge" : "new list";
    }
    return "new list";
  }

  function renderStaged() {
    var panel = app.el("staged");
    if (!staged) { panel.hidden = true; return; }
    panel.hidden = false;

    var chosen = staged.lists.filter(function (_, i) { return staged.chosen[i]; });
    var rules = chosen.reduce(function (n, l) { return n + l.rules.length; }, 0);
    app.el("staged-summary").textContent = "Found " + app.plural(staged.lists.length, "list") +
      " \u2014 importing " + app.plural(chosen.length, "list") + ", " + app.plural(rules, "rule") + ".";

    var container = app.el("staged-pick");
    container.textContent = "";
    staged.lists.forEach(function (list, i) {
      container.appendChild(row({
        name: list.name || "Untitled list",
        rules: list.rules.length,
        checked: staged.chosen[i],
        fate: staged.chosen[i] ? fateOf(list) : "",
        onChange: function (on) { staged.chosen[i] = on; renderStaged(); }
      }));
    });

    app.el("dest-current").textContent = app.currentList().name;
    app.el("staged-apply").disabled = !chosen.length;
  }

  function stage(text, fallbackName) {
    var parsed = BK.share.parse(text);
    if (parsed.error) { staged = null; renderStaged(); note(parsed.error); return; }

    parsed.lists.forEach(function (list) {
      if (!list.name) list.name = fallbackName || "Imported";
    });
    staged = {
      lists: parsed.lists,
      chosen: parsed.lists.map(function () { return true; })
    };
    renderStaged();
    note("Nothing imported yet \u2014 check it over and press Import.");
  }

  function applyStaged() {
    var settings = app.get();
    var mode = destination();
    var lists = staged.lists.filter(function (_, i) { return staged.chosen[i]; });
    if (!lists.length) return;

    var created = 0;
    var mergedInto = 0;
    var added = 0;
    var extended = 0;
    var lastNewId = null;

    lists.forEach(function (incoming) {
      var target = null;
      if (mode === "current") target = app.currentList();
      else if (mode === "name") target = BK.share.findByName(settings, incoming.name);

      if (target) {
        var result = BK.share.merge(target.rules, incoming.rules);
        target.rules = result.rules;
        added += result.added;
        extended += result.extended;
        mergedInto++;
      } else {
        var name = BK.share.uniqueListName(settings, incoming.name);
        var list = {
          id: BK.share.uniqueListId(settings, name),
          name: name,
          rules: incoming.rules.map(function (r) { return BK.rules.normalize(r); })
        };
        settings.lists.push(list);
        lastNewId = list.id;
        created++;
        added += list.rules.length;
      }
    });

    // Land on something the person can see the result of.
    if (lastNewId) settings.activeList = lastNewId;

    staged = null;
    app.el("paste").value = "";
    app.save(true);
    app.render();

    var parts = [];
    if (created) parts.push(app.plural(created, "new list"));
    if (mergedInto) parts.push("merged into " + app.plural(mergedInto, "list"));
    if (added) parts.push(app.plural(added, "rule") + " added");
    if (extended) parts.push(app.plural(extended, "existing rule") + " widened");
    // Re-importing a list you already have should say so, not "0 rules added".
    if (!added && !extended) parts.push("nothing new to add");
    note(parts.join(", ") + ".");
  }

  /* ---------- wiring ---------- */

  function render() {
    renderExport();
    renderStaged();
  }

  function wire() {
    app.el("export-all").addEventListener("click", function () {
      app.get().lists.forEach(function (l) { picked[l.id] = true; });
      renderExport();
    });
    app.el("export-none").addEventListener("click", function () {
      app.get().lists.forEach(function (l) { picked[l.id] = false; });
      renderExport();
    });
    app.el("copy").addEventListener("click", copyToClipboard);
    app.el("export").addEventListener("click", saveToFile);

    app.el("import-btn").addEventListener("click", function () { app.el("import").click(); });
    app.el("import").addEventListener("change", function () {
      var input = app.el("import");
      var file = input.files[0];
      input.value = "";
      if (!file) return;
      var reader = new FileReader();
      // An untitled export still gets a name: the file's own.
      reader.onload = function () { stage(String(reader.result), file.name.replace(/\.json$/i, "")); };
      reader.readAsText(file);
    });

    app.el("paste-load").addEventListener("click", function () {
      var text = app.el("paste").value;
      if (!text.trim()) { note("Paste a list first."); return; }
      stage(text, null);
    });
    // Pasting is the common case, so don't make people press a button as well.
    app.el("paste").addEventListener("paste", function () {
      setTimeout(function () {
        var text = app.el("paste").value;
        if (text.trim()) stage(text, null);
      }, 0);
    });

    app.el("staged-apply").addEventListener("click", applyStaged);
    app.el("staged-cancel").addEventListener("click", function () {
      staged = null;
      app.el("paste").value = "";
      renderStaged();
    });

    Array.prototype.forEach.call(document.querySelectorAll('input[name="dest"]'), function (radio) {
      radio.addEventListener("change", renderStaged);
    });
  }

  app.register("share", render);
  BK.panels = BK.panels || {};
  BK.panels.share = { wire: wire };
})(typeof window !== "undefined" ? window : this);
