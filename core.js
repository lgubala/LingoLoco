/* Buzz Kill - shared core.
   Settings model, list scheduling, and the matching engine.
   Loaded by the content script, the popup, and the options page. */
(function (root) {
  "use strict";

  var SCHEMA = 2;
  var WORDCHAR = "[\\p{L}\\p{N}_]";

  function newId(prefix) {
    return (prefix || "r") + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /* ---------- rules ---------- */

  function normalizeRule(raw) {
    if (!raw || typeof raw !== "object") return null;

    // Accepts our own shape, plus { target, replacements: [] } from Buzz Kill.
    var from = typeof raw.from === "string" ? raw.from : (typeof raw.target === "string" ? raw.target : "");
    var to = raw.to !== undefined ? raw.to : raw.replacements;

    if (typeof to === "string") to = [to];
    if (!Array.isArray(to)) to = [];
    to = to.filter(function (v) { return typeof v === "string"; });
    if (!to.length) to = [""];

    return {
      id: raw.id || newId(),
      from: from,
      to: to,
      matchCase: !!raw.matchCase,
      wholeWord: raw.wholeWord !== false,
      enabled: raw.enabled !== false
    };
  }

  function normalizeRules(list) {
    return (Array.isArray(list) ? list : []).map(normalizeRule).filter(Boolean);
  }

  /* ---------- settings ---------- */

  function defaultSettings() {
    return {
      schema: SCHEMA,
      enabled: true,
      activeList: "sfw",
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

  function normalizeSettings(raw) {
    var base = defaultSettings();
    raw = raw && typeof raw === "object" ? raw : {};

    var lists = Array.isArray(raw.lists) ? raw.lists.map(function (l) {
      return {
        id: typeof l.id === "string" && l.id ? l.id : newId("l"),
        name: typeof l.name === "string" && l.name.trim() ? l.name.trim() : "Untitled",
        rules: normalizeRules(l.rules)
      };
    }) : [];

    // Schema 1 kept a single flat rule list. Fold it into the first list.
    if (!lists.length) {
      lists = base.lists;
      if (Array.isArray(raw.rules) && raw.rules.length) {
        lists[0].rules = normalizeRules(raw.rules);
      }
    }

    var byId = {};
    lists.forEach(function (l) { byId[l.id] = l; });

    var sched = Object.assign({}, base.schedule, raw.schedule || {});
    sched.enabled = !!sched.enabled;
    sched.days = Array.isArray(sched.days) ? sched.days.filter(function (d) { return d >= 0 && d <= 6; }) : base.schedule.days;
    if (!byId[sched.inside]) sched.inside = lists[0].id;
    if (!byId[sched.outside]) sched.outside = (lists[1] || lists[0]).id;

    return {
      schema: SCHEMA,
      enabled: raw.enabled !== false,
      activeList: byId[raw.activeList] ? raw.activeList : lists[0].id,
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

  /* ---------- schedule ---------- */

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
    return getList(settings, id) ? id : settings.activeList;
  }

  function activeRules(settings, now) {
    var list = getList(settings, resolveListId(settings, now));
    return list ? list.rules : [];
  }

  /* ---------- matching ---------- */

  function applyCase(source, replacement) {
    if (!replacement) return replacement;
    if (source.length > 1 && source === source.toUpperCase() && source !== source.toLowerCase()) {
      return replacement.toUpperCase();
    }
    var first = source.charAt(0);
    if (first === first.toUpperCase() && first !== first.toLowerCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement;
  }

  /* One combined regex for every active rule, longest term first so
     "New York City" beats "New York". When a rule has several replacements,
     one is chosen per build: a page stays consistent with itself.
     Pass options.seed to make that choice reproducible. */
  function buildMatcher(rules, options) {
    options = options || {};
    var lookup = new Map();
    var parts = [];

    var active = normalizeRules(rules)
      .filter(function (r) { return r.enabled && r.from.trim() !== ""; })
      .sort(function (a, b) { return b.from.length - a.from.length; });

    active.forEach(function (rule, index) {
      var key = rule.from.toLowerCase();
      if (lookup.has(key)) return;
      var variants = rule.to.length ? rule.to : [""];
      var pick = options.seed === undefined
        ? Math.floor(Math.random() * variants.length)
        : (options.seed + index) % variants.length;
      lookup.set(key, { rule: rule, to: variants[pick] });
      var body = escapeRe(rule.from);
      parts.push(rule.wholeWord
        ? "(?<!" + WORDCHAR + ")" + body + "(?!" + WORDCHAR + ")"
        : body);
    });

    if (!parts.length) return null;

    var regex;
    try {
      regex = new RegExp(parts.join("|"), "giu");
    } catch (e) {
      return null;
    }

    function replaceIn(text) {
      regex.lastIndex = 0;
      return text.replace(regex, function (match) {
        var hit = lookup.get(match.toLowerCase());
        if (!hit) return match;
        if (hit.rule.matchCase) return match === hit.rule.from ? hit.to : match;
        return applyCase(match, hit.to);
      });
    }

    function test(text) {
      regex.lastIndex = 0;
      return regex.test(text);
    }

    return { regex: regex, replaceIn: replaceIn, test: test, size: parts.length };
  }

  /* ---------- sites ---------- */

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); }
    catch (e) { return ""; }
  }

  function siteIsOff(list, host) {
    if (!host) return false;
    return (list || []).some(function (entry) {
      var e = String(entry).replace(/^www\./, "").toLowerCase();
      return host === e || host.endsWith("." + e);
    });
  }

  /* ---------- storage ---------- */

  function storageApi() {
    return typeof browser !== "undefined" ? browser : chrome;
  }

  function load() {
    var api = storageApi();
    return new Promise(function (resolve) {
      api.storage.local.get(null, function (stored) {
        if (stored && stored.lists) { resolve(normalizeSettings(stored)); return; }
        // First run after the 1.0 update: pull the old sync-stored rules across.
        try {
          api.storage.sync.get(null, function (old) {
            resolve(normalizeSettings(stored && Object.keys(stored).length ? stored : old));
          });
        } catch (e) {
          resolve(normalizeSettings(stored));
        }
      });
    });
  }

  function save(settings) {
    var api = storageApi();
    return new Promise(function (resolve) {
      api.storage.local.set(normalizeSettings(settings), function () { resolve(); });
    });
  }

  root.WordSwap = {
    SCHEMA: SCHEMA,
    newId: newId,
    defaultSettings: defaultSettings,
    normalizeSettings: normalizeSettings,
    normalizeRule: normalizeRule,
    normalizeRules: normalizeRules,
    getList: getList,
    resolveListId: resolveListId,
    activeRules: activeRules,
    inWindow: inWindow,
    parseHM: parseHM,
    buildMatcher: buildMatcher,
    applyCase: applyCase,
    hostOf: hostOf,
    siteIsOff: siteIsOff,
    load: load,
    save: save
  };
})(typeof window !== "undefined" ? window : this);
