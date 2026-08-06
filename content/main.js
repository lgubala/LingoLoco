/* Content script entry point: work out whether this page should be rewritten
   and with which list, then hand over to the observer. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var api = typeof browser !== "undefined" ? browser : chrome;

  function apply(settings) {
    var host = BK.sites.hostOf(location.href);
    if (!settings.enabled || BK.sites.isOff(settings.disabledSites, host)) {
      BK.observe.stop();
      return;
    }
    // Which list is live can depend on the clock, so resolve it per page load.
    var matcher = BK.matcher.build(BK.schedule.activeRules(settings, new Date()));
    if (!matcher) { BK.observe.stop(); return; }
    BK.observe.start(matcher);
  }

  BK.settings.load().then(apply);

  // Newly added rules take effect immediately; removing a rule needs a reload,
  // because the original words are already gone from the DOM.
  api.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local") return;
    BK.settings.load().then(function (settings) {
      BK.rewrite.reset();
      BK.skip.reset();
      apply(settings);
    });
  });
})(typeof window !== "undefined" ? window : this);
