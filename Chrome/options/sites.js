/* Sites left alone. */
(function (root) {
  "use strict";
  var LL = root.LL;
  var app = LL.app;

  function render() {
    var settings = app.get();
    var container = app.el("sites");
    container.textContent = "";

    app.el("sites-state").textContent = settings.disabledSites.length
      ? settings.disabledSites.length + " skipped"
      : "none";

    if (!settings.disabledSites.length) {
      var empty = document.createElement("p");
      empty.className = "empty tiny";
      empty.textContent = "Every site gets the treatment.";
      container.appendChild(empty);
      return;
    }

    settings.disabledSites.forEach(function (site) {
      var row = document.createElement("div");
      row.className = "site-row";
      var name = document.createElement("span");
      name.textContent = site;
      var remove = document.createElement("button");
      remove.className = "ghost";
      remove.type = "button";
      remove.textContent = "Resume here";
      remove.addEventListener("click", function () {
        settings.disabledSites = settings.disabledSites.filter(function (s) { return s !== site; });
        app.save(true);
        render();
      });
      row.append(name, remove);
      container.appendChild(row);
    });
  }

  function add() {
    var input = app.el("site-input");
    var raw = input.value.trim();
    var host = LL.sites.hostOf(raw.indexOf("://") === -1 ? "https://" + raw : raw);
    if (!host) { input.focus(); return; }
    if (app.get().disabledSites.indexOf(host) === -1) {
      app.get().disabledSites.push(host);
      app.save(true);
    }
    input.value = "";
    render();
  }

  function wire() {
    app.el("site-add").addEventListener("click", add);
    app.el("site-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") add();
    });
  }

  app.register("sites", render);
  LL.panels = LL.panels || {};
  LL.panels.sites = { wire: wire };
})(typeof window !== "undefined" ? window : this);
