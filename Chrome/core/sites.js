/* Per-site opt-outs. Matching a host also covers its subdomains, so skipping
   "reddit.com" also skips old.reddit.com. */
(function (root) {
  "use strict";
  var LL = root.LL;

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); }
    catch (e) { return ""; }
  }

  function isOff(list, host) {
    if (!host) return false;
    return (list || []).some(function (entry) {
      var e = String(entry).replace(/^www\./, "").toLowerCase();
      return host === e || host.endsWith("." + e);
    });
  }

  LL.sites = { hostOf: hostOf, isOff: isOff };
})(typeof window !== "undefined" ? window : this);
