/* Import & export: clipboard, file, or a pasted blob of JSON. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var app = BK.app;

  var IDLE_NOTE = "Exports are plain JSON. Lists from the old Buzz Kill add-on work too.";
  var noteTimer = null;

  function note(text) {
    app.el("io-note").textContent = text;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () {
      app.el("io-note").textContent = IDLE_NOTE;
    }, 4000);
  }

  function sharedText() {
    return JSON.stringify(BK.share.exportList(app.currentList()), null, 2);
  }

  function apply(parsed, asNewList) {
    if (parsed.error) { note(parsed.error); return; }
    var settings = app.get();

    if (asNewList) {
      var name = parsed.name || "Imported";
      var list = {
        id: BK.share.uniqueListId(settings, name),
        name: name,
        rules: parsed.rules.map(function (r) { return BK.rules.normalize(r); })
      };
      settings.lists.push(list);
      settings.activeList = list.id;
      app.save(true);
      app.render();
      note("Added " + app.plural(list.rules.length, "rule") + " as \u201c" + name + "\u201d.");
      return;
    }

    var target = app.currentList();
    var merged = BK.share.merge(target.rules, parsed.rules);
    target.rules = merged.rules;
    app.save(true);
    app.render("rules", "proof");
    note(app.plural(merged.added, "new rule") + ", " +
      app.plural(merged.extended, "existing rule") + " given more variants.");
  }

  function importPasted(asNewList) {
    var box = app.el("paste");
    if (!box.value.trim()) { note("Paste a list first."); return; }
    apply(BK.share.parse(box.value), asNewList);
    box.value = "";
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(sharedText()).then(function () {
      note(app.currentList().name + " copied \u2014 paste it to whoever wants it.");
    }, function () {
      app.el("paste").value = sharedText();
      note("Clipboard blocked, so the list is in the box below instead.");
    });
  }

  function saveToFile() {
    var url = URL.createObjectURL(new Blob([sharedText()], { type: "application/json" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = "buzzkill-" + BK.share.slug(app.currentList().name) + ".json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    note("Saved " + app.plural(app.currentList().rules.length, "rule") + " to a file.");
  }

  function openFile() {
    var input = app.el("import");
    var file = input.files[0];
    input.value = "";
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = BK.share.parse(String(reader.result));
      // An untitled export still gets a name: the file's own.
      if (!parsed.error && !parsed.name) parsed.name = file.name.replace(/\.json$/i, "");
      apply(parsed, true);
    };
    reader.readAsText(file);
  }

  function wire() {
    app.el("copy").addEventListener("click", copyToClipboard);
    app.el("export").addEventListener("click", saveToFile);
    app.el("import-btn").addEventListener("click", function () { app.el("import").click(); });
    app.el("import").addEventListener("change", openFile);
    app.el("paste-merge").addEventListener("click", function () { importPasted(false); });
    app.el("paste-new").addEventListener("click", function () { importPasted(true); });
  }

  BK.panels = BK.panels || {};
  BK.panels.share = { wire: wire };
})(typeof window !== "undefined" ? window : this);
