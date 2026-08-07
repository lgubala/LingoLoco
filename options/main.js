/* Options page entry point: load settings, wire every panel, draw. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var app = BK.app;

  /* The popup links straight to a panel, e.g. options.html#share */
  function focusSection() {
    var id = (location.hash || "").replace("#", "");
    var target = id && document.getElementById(id);
    if (!target) return;
    if (target.tagName === "DETAILS") target.open = true;
    if (target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("flash");
    setTimeout(function () { target.classList.remove("flash"); }, 1800);
  }

  function wireTheme() {
    var select = app.el("theme");
    select.value = app.get().theme;
    select.addEventListener("change", function () {
      app.get().theme = BK.theme.apply(select.value);
      app.save(true);
    });
  }

  function wireMaster() {
    var master = app.el("master");
    master.addEventListener("change", function () {
      app.get().enabled = master.checked;
      app.el("master-label").textContent = master.checked ? "Replacing" : "Paused";
      app.save(true);
    });
  }

  BK.settings.load().then(function (settings) {
    app.set(settings);
    BK.theme.apply(settings.theme);

    app.el("master").checked = settings.enabled;
    app.el("master-label").textContent = settings.enabled ? "Replacing" : "Paused";

    wireMaster();
    wireTheme();
    Object.keys(BK.panels).forEach(function (name) { BK.panels[name].wire(); });

    app.render();
    focusSection();
  });
})(typeof window !== "undefined" ? window : this);
