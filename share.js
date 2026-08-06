/* Buzz Kill - list sharing.
   Export, import, and merge. Loaded by the options page only: the content
   script runs in every frame of every page and has no use for any of this. */
(function (root) {
  "use strict";

  var WS = root.WordSwap;

  function slug(name) {
    return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || WS.newId("l");
  }

  function uniqueListId(settings, name) {
    var base = slug(name);
    var id = base;
    var n = 2;
    while (WS.getList(settings, id)) id = base + "-" + n++;
    return id;
  }

  /* ---------- sharing ---------- */

  function exportList(list) {
    return {
      buzzkill: WS.SCHEMA,
      name: list.name,
      rules: list.rules.map(function (r) {
        return { from: r.from, to: r.to, matchCase: r.matchCase, wholeWord: r.wholeWord };
      })
    };
  }

  /* Reads our own export (current or the older "wordswap" key), a bare rule
     array, or an old Buzz Kill [{ target, replacements: [] }] list. */
  function parseShared(text) {
    var data;
    try { data = JSON.parse(text); }
    catch (e) { return { error: "That isn't valid JSON." }; }

    var name = null;
    var raw = null;

    if (Array.isArray(data)) {
      raw = data;
    } else if (data && typeof data === "object") {
      name = typeof data.name === "string" ? data.name : null;
      raw = Array.isArray(data.rules) ? data.rules : (Array.isArray(data.replacements) ? data.replacements : null);
    }

    if (!raw) return { error: "No rules found in there." };

    var rules = WS.normalizeRules(raw).filter(function (r) { return r.from.trim() !== ""; });
    if (!rules.length) return { error: "No usable rules found in there." };

    return { name: name, rules: rules };
  }

  function mergeRules(existing, incoming) {
    var index = new Map();
    var merged = existing.map(function (r) {
      var copy = Object.assign({}, r, { to: r.to.slice() });
      index.set(copy.from.toLowerCase(), copy);
      return copy;
    });
    var added = 0;
    var extended = 0;

    incoming.forEach(function (rule) {
      var key = rule.from.toLowerCase();
      var hit = index.get(key);
      if (!hit) {
        var copy = Object.assign({}, rule, { id: WS.newId(), to: rule.to.slice() });
        index.set(key, copy);
        merged.push(copy);
        added++;
        return;
      }
      var before = hit.to.length;
      rule.to.forEach(function (v) {
        if (v && hit.to.indexOf(v) === -1) hit.to.push(v);
      });
      if (hit.to.length > before) extended++;
    });

    return { rules: merged, added: added, extended: extended };
  }

  Object.assign(WS, {
    slug: slug,
    uniqueListId: uniqueListId,
    exportList: exportList,
    parseShared: parseShared,
    mergeRules: mergeRules
  });
})(typeof window !== "undefined" ? window : this);
