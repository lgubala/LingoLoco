/* Import and export. Loaded by the options page only: the content script runs
   in every frame of every page and has no use for any of this.

   One file can carry one list or all of them. Everything parse() returns looks
   the same to the caller — an array of { name, rules } — so the import UI never
   has to care which of the older shapes it was handed. */
(function (root) {
  "use strict";
  var BK = root.BK;

  function slug(name) {
    return String(name).toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || BK.rules.newId("l");
  }

  function uniqueListId(settings, name) {
    var base = slug(name);
    var id = base;
    var n = 2;
    while (BK.settings.getList(settings, id)) id = base + "-" + n++;
    return id;
  }

  /* "SFW" imported next to an existing "SFW" becomes "SFW 2". */
  function uniqueListName(settings, name) {
    var taken = {};
    settings.lists.forEach(function (l) { taken[l.name.toLowerCase()] = true; });
    if (!taken[name.toLowerCase()]) return name;
    var n = 2;
    while (taken[(name + " " + n).toLowerCase()]) n++;
    return name + " " + n;
  }

  function bareRule(r) {
    return { from: r.from, to: r.to, matchCase: r.matchCase, wholeWord: r.wholeWord };
  }

  /* Always a bundle, even for one list: one shape to read back. */
  function exportLists(lists) {
    return {
      buzzkill: BK.SCHEMA,
      exported: new Date().toISOString().slice(0, 10),
      lists: lists.map(function (list) {
        return { name: list.name, rules: list.rules.map(bareRule) };
      })
    };
  }

  function cleanRules(raw) {
    return BK.rules.normalizeAll(raw).filter(function (r) { return r.from.trim() !== ""; });
  }

  function namedList(name, raw) {
    var rules = cleanRules(raw);
    if (!rules.length) return null;
    return {
      name: typeof name === "string" && name.trim() ? name.trim() : null,
      rules: rules
    };
  }

  /* Reads, in order:
       { buzzkill|wordswap, lists: [ { name, rules } ] }   a bundle
       { name, rules: [...] }                              one named list
       [ ... ]                                             a bare rule array
       { SFW: { replacements: [...] }, NSFW: {...} }        an old Lingo Loco dump
     Rules inside may use { from, to } or { target, replacements }. */
  function parse(text) {
    var data;
    try { data = JSON.parse(text); }
    catch (e) { return { error: "That isn't valid JSON." }; }

    var lists = [];

    if (Array.isArray(data)) {
      var bare = namedList(null, data);
      if (bare) lists.push(bare);
    } else if (data && typeof data === "object") {
      if (Array.isArray(data.lists)) {
        data.lists.forEach(function (entry) {
          if (!entry || typeof entry !== "object") return;
          var list = namedList(entry.name, entry.rules || entry.replacements);
          if (list) lists.push(list);
        });
      } else if (Array.isArray(data.rules) || Array.isArray(data.replacements)) {
        var single = namedList(data.name, data.rules || data.replacements);
        if (single) lists.push(single);
      } else {
        Object.keys(data).forEach(function (key) {
          var value = data[key];
          if (!value || typeof value !== "object") return;
          var list = namedList(key, value.replacements || value.rules);
          if (list) lists.push(list);
        });
      }
    }

    if (!lists.length) return { error: "No usable rules found in there." };
    return { lists: lists };
  }

  /* Same word already present: keep it and add the replacements it lacks. */
  function merge(existing, incoming) {
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
        var copy = Object.assign({}, rule, { id: BK.rules.newId(), to: rule.to.slice() });
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

  function findByName(settings, name) {
    var found = null;
    if (!name) return null;
    settings.lists.forEach(function (l) {
      if (l.name.toLowerCase() === name.toLowerCase()) found = l;
    });
    return found;
  }

  BK.share = {
    slug: slug,
    uniqueListId: uniqueListId,
    uniqueListName: uniqueListName,
    exportLists: exportLists,
    parse: parse,
    merge: merge,
    findByName: findByName
  };
})(typeof window !== "undefined" ? window : this);
