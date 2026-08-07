/* The header: master switch, and what the extension is doing on this tab. */
(function (root) {
  "use strict";
  var LL = root.LL;
  var pop = LL.pop;

  function render() {
    var settings = pop.get();
    var off = pop.siteIsOff();
    var status = pop.el("status");

    pop.el("master").checked = settings.enabled;
    status.textContent = !settings.enabled ? "Paused" : (off ? "Off here" : "On");
    status.classList.toggle("off", !settings.enabled || off);
  }

  function wire() {
    pop.el("master").addEventListener("change", function () {
      pop.get().enabled = pop.el("master").checked;
      pop.save().then(function () { pop.render(); });
    });
  }

  pop.register("status", render);
  LL.popPanels = LL.popPanels || {};
  LL.popPanels.status = { wire: wire };
})(typeof window !== "undefined" ? window : this);
