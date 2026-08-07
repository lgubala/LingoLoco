/* Which list is live right now. Resolved from local time on each page load,
   so no alarm or background page is needed to make the switch happen. */
(function (root) {
  "use strict";
  var BK = root.BK;

  function parseHM(value) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""));
    if (!m) return null;
    return Math.min(23, +m[1]) * 60 + Math.min(59, +m[2]);
  }

  function inWindow(schedule, now) {
    var from = parseHM(schedule.from);
    var to = parseHM(schedule.to);
    if (from === null || to === null) return false;
    if ((schedule.days || []).indexOf(now.getDay()) === -1) return false;
    var mins = now.getHours() * 60 + now.getMinutes();
    // A window like 20:00 -> 06:00 wraps past midnight.
    return from <= to ? (mins >= from && mins < to) : (mins >= from || mins < to);
  }

  function resolveListId(settings, now) {
    var sched = settings.schedule;
    if (!sched || !sched.enabled) return settings.activeList;
    var id = inWindow(sched, now || new Date()) ? sched.inside : sched.outside;
    return BK.settings.getList(settings, id) ? id : settings.activeList;
  }

  function activeRules(settings, now) {
    var list = BK.settings.getList(settings, resolveListId(settings, now));
    return list ? list.rules : [];
  }

  BK.schedule = {
    parseHM: parseHM,
    inWindow: inWindow,
    resolveListId: resolveListId,
    activeRules: activeRules
  };
})(typeof window !== "undefined" ? window : this);
