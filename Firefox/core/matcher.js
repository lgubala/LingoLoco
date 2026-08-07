/* The matching engine. One compiled regex for a whole list of rules.

   The compiled regex is deliberately not returned: a /g regex carries its own
   cursor, and replaceIn() resets it, so a caller iterating with the same object
   while calling replaceIn() inside the loop would restart the scan forever.
   Use replaceIn() to rewrite a string, scan() to walk what changed. */
(function (root) {
  "use strict";
  var BK = root.BK;

  var WORDCHAR = "[\\p{L}\\p{N}_]";
  var SCAN_GUARD = 100000;

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /* synergy -> hot air, Synergy -> Hot air, SYNERGY -> HOT AIR. */
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

  /* Longest rule first, so "New York City" beats "New York".

     A rule with several replacements cycles through them as the page is walked:
     the first "quantum" becomes magic, the second sorcery, the third magic
     again. Picking at random each time would be the obvious approach, but with
     two variants and three occurrences it lands on the same word throughout
     about a quarter of the time, which reads like the feature is broken. Taking
     turns guarantees the variety you asked for. Where each rule starts in its
     cycle is random per page load, so reloading reshuffles; options.seed pins
     the starting point for the proof sheet. */
  function compile(rules, options) {
    var lookup = new Map();
    var parts = [];

    BK.rules.normalizeAll(rules)
      .filter(function (r) { return r.enabled && r.from.trim() !== ""; })
      .sort(function (a, b) { return b.from.length - a.from.length; })
      .forEach(function (rule, index) {
        var key = rule.from.toLowerCase();
        if (lookup.has(key)) return;
        var variants = rule.to.length ? rule.to : [""];
        var start = options.seed === undefined
          ? Math.floor(Math.random() * variants.length)
          : (options.seed + index) % variants.length;
        lookup.set(key, { rule: rule, variants: variants, start: start, used: 0 });
        var body = escapeRe(rule.from);
        parts.push(rule.wholeWord
          ? "(?<!" + WORDCHAR + ")" + body + "(?!" + WORDCHAR + ")"
          : body);
      });

    return { lookup: lookup, parts: parts };
  }

  function build(rules, options) {
    options = options || {};
    var compiled = compile(rules, options);
    var lookup = compiled.lookup;
    if (!compiled.parts.length) return null;

    var source = compiled.parts.join("|");
    var regex;
    try {
      regex = new RegExp(source, "giu");
    } catch (e) {
      return null;
    }

    function swap(match) {
      var hit = lookup.get(match.toLowerCase());
      if (!hit) return match;
      // A case-sensitive rule that doesn't match leaves the word alone, and
      // must not consume a turn in the cycle.
      if (hit.rule.matchCase && match !== hit.rule.from) return match;

      var to = hit.variants[(hit.start + hit.used++) % hit.variants.length];
      return hit.rule.matchCase ? to : applyCase(match, to);
    }

    function replaceIn(text) {
      regex.lastIndex = 0;
      return text.replace(regex, swap);
    }

    function test(text) {
      regex.lastIndex = 0;
      return regex.test(text);
    }

    /* Walks the string, handing each untouched run to emit(text, null) and each
       match to emit(original, replacement). Its own regex, its own cursor. */
    function scan(text, emit) {
      var walker = new RegExp(source, "giu");
      var last = 0;
      var guard = 0;
      var match;

      while ((match = walker.exec(text)) !== null) {
        if (++guard > SCAN_GUARD) break; // no real input reaches this
        if (match.index > last) emit(text.slice(last, match.index), null);
        emit(match[0], swap(match[0]));
        last = match.index + match[0].length;
        if (match[0].length === 0) walker.lastIndex++;
      }

      if (last < text.length) emit(text.slice(last), null);
      return guard;
    }

    return { replaceIn: replaceIn, test: test, scan: scan, size: compiled.parts.length };
  }

  BK.matcher = { build: build, applyCase: applyCase };
})(typeof window !== "undefined" ? window : this);
