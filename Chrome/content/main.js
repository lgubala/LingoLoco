/* Content script entry point: work out whether this page should be rewritten
   and with which list, then hand over to the observer. */
(function (root) {
  "use strict";
  var LL = root.LL;
  var api = typeof browser !== "undefined" ? browser : chrome;

  function apply(settings) {
    var host = LL.sites.hostOf(location.href);
    if (!settings.enabled || LL.sites.isOff(settings.disabledSites, host)) {
      LL.observe.stop();
      return;
    }
    // Which list is live can depend on the clock, so resolve it per page load.
    var matcher = LL.matcher.build(LL.schedule.activeRules(settings, new Date()));
    if (!matcher) { LL.observe.stop(); return; }
    LL.observe.start(matcher);
  }

  LL.settings.load().then(apply);

  // Newly added rules take effect immediately; removing a rule needs a reload,
  // because the original words are already gone from the DOM.
  api.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local") return;
    LL.settings.load().then(function (settings) {
      LL.rewrite.reset();
      LL.skip.reset();
      apply(settings);
    });
  });
})(typeof window !== "undefined" ? window : this);
