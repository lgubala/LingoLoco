/* The per-site switch for whatever tab is in front. */
(function (root) {
  "use strict";
  var LL = root.LL;
  var pop = LL.pop;

  function render() {
    var host = pop.page.host;
    if (!host) return;
    var off = pop.siteIsOff();
    pop.el("site-row").hidden = false;
    pop.el("site-name").textContent = (off ? "Skipping " : "Running on ") + host;
    pop.el("site-toggle").checked = !off;
  }

  function wire() {
    pop.el("site-toggle").addEventListener("change", function () {
      var settings = pop.get();
      var host = pop.page.host;
      settings.disabledSites = settings.disabledSites.filter(function (entry) {
        return String(entry).replace(/^www\./, "").toLowerCase() !== host;
      });
      if (!pop.el("site-toggle").checked) settings.disabledSites.push(host);
      pop.save().then(function () { pop.render(); });
    });
  }

  pop.register("site", render);
  LL.popPanels = LL.popPanels || {};
  LL.popPanels.site = { wire: wire };
})(typeof window !== "undefined" ? window : this);
