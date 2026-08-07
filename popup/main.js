/* Popup entry point. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var pop = BK.pop;
  var api = typeof browser !== "undefined" ? browser : chrome;

  function currentTab() {
    return new Promise(function (resolve) {
      api.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        resolve(tabs && tabs[0] ? tabs[0] : null);
      });
    });
  }

  /* Everything past quick-add lives on the options page, so link straight to
     the panel rather than dropping people at the top of it. */
  function openOptions(section) {
    if (section) {
      api.tabs.create({ url: api.runtime.getURL("options/options.html#" + section) });
    } else {
      api.runtime.openOptionsPage();
    }
    window.close();
  }

  function wireFooter() {
    pop.el("reload").addEventListener("click", function () {
      if (pop.page.tabId != null) api.tabs.reload(pop.page.tabId);
      window.close();
    });
    pop.el("open-options").addEventListener("click", function () { openOptions(""); });
    pop.el("open-schedule").addEventListener("click", function () { openOptions("schedule"); });
    pop.el("open-share").addEventListener("click", function () { openOptions("share"); });
  }

  Promise.all([BK.settings.load(), currentTab()]).then(function (out) {
    pop.set(out[0]);
    BK.theme.apply(out[0].theme);

    var tab = out[1];
    if (tab) {
      pop.page.tabId = tab.id;
      pop.page.host = BK.sites.hostOf(tab.url || "");
    }

    Object.keys(BK.popPanels).forEach(function (name) { BK.popPanels[name].wire(); });
    wireFooter();

    pop.render();
    pop.el("from").focus();
  });
})(typeof window !== "undefined" ? window : this);
