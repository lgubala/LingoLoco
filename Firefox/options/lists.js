/* The list switcher: tabs, new, rename, delete. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var app = BK.app;

  function render() {
    var settings = app.get();
    var live = BK.schedule.resolveListId(settings, new Date());
    var tabs = app.el("list-tabs");
    tabs.textContent = "";

    settings.lists.forEach(function (list) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "tab" + (list.id === settings.activeList ? " on" : "");
      tab.textContent = list.name;
      if (settings.schedule.enabled && list.id === live) {
        var dot = document.createElement("span");
        dot.className = "auto";
        dot.title = "On duty right now";
        tab.appendChild(dot);
      }
      tab.addEventListener("click", function () {
        settings.activeList = list.id;
        app.save(true);
        app.render();
      });
      tabs.appendChild(tab);
    });

    app.el("list-delete").disabled = settings.lists.length < 2;

    // With a schedule running, the list you're editing may not be the one
    // pages are using. Say so rather than letting it confuse people.
    var note = app.el("live-note");
    if (settings.schedule.enabled) {
      var liveList = BK.settings.getList(settings, live);
      note.hidden = false;
      note.textContent = liveList && liveList.id !== settings.activeList
        ? "Pages are using " + liveList.name + " right now. You're editing " + app.currentList().name + "."
        : "Pages are using " + app.currentList().name + " right now.";
    } else {
      note.hidden = true;
    }
  }

  function wire() {
    app.el("list-new").addEventListener("click", function () {
      var settings = app.get();
      var name = window.prompt("Name the new list", "Work");
      if (!name || !name.trim()) return;
      var list = { id: BK.share.uniqueListId(settings, name.trim()), name: name.trim(), rules: [] };
      settings.lists.push(list);
      settings.activeList = list.id;
      app.save(true);
      app.render();
    });

    app.el("list-rename").addEventListener("click", function () {
      var list = app.currentList();
      var name = window.prompt("Rename this list", list.name);
      if (!name || !name.trim()) return;
      list.name = name.trim();
      app.save(true);
      app.render();
    });

    app.el("list-delete").addEventListener("click", function () {
      var settings = app.get();
      if (settings.lists.length < 2) return;
      var list = app.currentList();
      if (!window.confirm("Delete \u201c" + list.name + "\u201d and its " + list.rules.length + " rules?")) return;
      settings.lists = settings.lists.filter(function (l) { return l.id !== list.id; });
      settings.activeList = settings.lists[0].id;
      // normalize repoints the schedule if it named the list just deleted
      app.set(BK.settings.normalize(settings));
      app.save(true);
      app.render();
    });
  }

  app.register("lists", render);
  BK.panels = BK.panels || {};
  BK.panels.lists = { wire: wire };
})(typeof window !== "undefined" ? window : this);
