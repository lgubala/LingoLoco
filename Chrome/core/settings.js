/* The whole saved state: lists of rules, which one is active, the schedule,
   skipped sites. Everything read from storage passes through normalize(), so
   the rest of the code never has to defend against a half-written object. */
(function (root) {
  "use strict";
  var LL = root.LL;

  var THEMES = ["system", "light", "dark"];

  function api() {
    return typeof browser !== "undefined" ? browser : chrome;
  }

  function defaults() {
    return {
      schema: LL.SCHEMA,
      enabled: true,
      activeList: "sfw",
      theme: "system",
      lists: [
        { id: "sfw", name: "SFW", rules: [] },
        { id: "nsfw", name: "NSFW", rules: [] }
      ],
      schedule: {
        enabled: false,
        days: [1, 2, 3, 4, 5],
        from: "08:00",
        to: "18:00",
        inside: "sfw",
        outside: "nsfw"
      },
      disabledSites: [],
      recentEmoji: []
    };
  }

  function normalize(raw) {
    var base = defaults();
    raw = raw && typeof raw === "object" ? raw : {};

    var lists = Array.isArray(raw.lists) ? raw.lists.map(function (l) {
      return {
        id: typeof l.id === "string" && l.id ? l.id : LL.rules.newId("l"),
        name: typeof l.name === "string" && l.name.trim() ? l.name.trim() : "Untitled",
        rules: LL.rules.normalizeAll(l.rules)
      };
    }) : [];

    // Schema 1 kept a single flat rule list. Fold it into the first list.
    if (!lists.length) {
      lists = base.lists;
      if (Array.isArray(raw.rules) && raw.rules.length) {
        lists[0].rules = LL.rules.normalizeAll(raw.rules);
      }
    }

    var byId = {};
    lists.forEach(function (l) { byId[l.id] = l; });

    var sched = Object.assign({}, base.schedule, raw.schedule || {});
    sched.enabled = !!sched.enabled;
    sched.days = Array.isArray(sched.days)
      ? sched.days.filter(function (d) { return d >= 0 && d <= 6; })
      : base.schedule.days;
    // A list can be deleted out from under the schedule.
    if (!byId[sched.inside]) sched.inside = lists[0].id;
    if (!byId[sched.outside]) sched.outside = (lists[1] || lists[0]).id;

    return {
      schema: LL.SCHEMA,
      enabled: raw.enabled !== false,
      activeList: byId[raw.activeList] ? raw.activeList : lists[0].id,
      theme: THEMES.indexOf(raw.theme) === -1 ? "system" : raw.theme,
      lists: lists,
      schedule: sched,
      disabledSites: Array.isArray(raw.disabledSites) ? raw.disabledSites.slice() : [],
      recentEmoji: Array.isArray(raw.recentEmoji) ? raw.recentEmoji.slice(0, 40) : []
    };
  }

  function getList(settings, id) {
    var found = null;
    settings.lists.forEach(function (l) { if (l.id === id) found = l; });
    return found;
  }

  /* Lists outgrow storage.sync's 8 KB per-item cap, so state lives in
     storage.local — on this machine only. Export is how settings travel. */
  function load() {
    return new Promise(function (resolve) {
      api().storage.local.get(null, function (stored) {
        resolve(normalize(stored));
      });
    });
  }

  function save(settings) {
    return new Promise(function (resolve) {
      api().storage.local.set(normalize(settings), function () { resolve(); });
    });
  }

  LL.settings = {
    defaults: defaults,
    normalize: normalize,
    getList: getList,
    load: load,
    save: save
  };
})(typeof window !== "undefined" ? window : this);
