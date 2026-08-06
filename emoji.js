/* Buzz Kill - emoji picker.
   The dataset (emoji-data.json, generated from Unicode + CLDR) is fetched the
   first time someone opens the picker, not on page load: most popup sessions
   never touch it. One panel is reused for every trigger. */
(function (root) {
  "use strict";

  var GROUP_ICON = ["\uD83D\uDE00", "\uD83D\uDC4B", "\uD83D\uDC3B", "\uD83C\uDF55", "\u2708\uFE0F", "\u26BD", "\uD83D\uDCA1", "\u2764\uFE0F", "\uD83C\uDFC1"];
  var LIMIT = 240;

  var data = null;      // decoded dataset
  var loading = null;   // in-flight promise
  var panel, searchEl, gridEl, tabsEl, statusEl;
  var current = null;   // { anchor, onPick, recents }
  var group = 0;

  /* ---------- data ---------- */

  function decode(raw) {
    var words = raw.w.split(" ");
    var lower = words.map(function (w) { return w.toLowerCase(); });
    var rows = raw.e.split("\n");
    var count = rows.length;

    var chars = new Array(count);
    var nameIdx = new Array(count);
    var groupOf = new Uint8Array(count);
    var keyCount = new Uint8Array(count);
    var wordRows = new Array(words.length); // vocabulary index -> row indices

    function link(wordIndex, row) {
      var bucket = wordRows[wordIndex];
      if (!bucket) wordRows[wordIndex] = [row];
      else if (bucket[bucket.length - 1] !== row) bucket.push(row);
    }

    for (var i = 0; i < count; i++) {
      var parts = rows[i].split("|");
      chars[i] = parts[0];
      groupOf[i] = parseInt(parts[2], 36);

      var ids = parts[1].split(",");
      var name = new Array(ids.length);
      for (var n = 0; n < ids.length; n++) {
        name[n] = parseInt(ids[n], 36);
        link(name[n], i);
      }
      nameIdx[i] = name;

      if (parts[3]) {
        var keys = parts[3].split(",");
        keyCount[i] = Math.min(255, keys.length);
        for (var k = 0; k < keys.length; k++) link(parseInt(keys[k], 36), i);
      }
    }

    return {
      groups: raw.g,
      words: words,
      lower: lower,
      chars: chars,
      nameIdx: nameIdx,
      groupOf: groupOf,
      keyCount: keyCount,
      wordRows: wordRows,
      count: count
    };
  }

  function nameOf(row) {
    var ids = data.nameIdx[row];
    var out = data.words[ids[0]];
    for (var i = 1; i < ids.length; i++) out += " " + data.words[ids[i]];
    return out;
  }

  function ensureData() {
    if (data) return Promise.resolve(data);
    if (loading) return loading;
    loading = fetch("emoji-data.json")
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (raw) {
        data = decode(raw);
        loading = null;
        return data;
      })
      .catch(function (err) {
        loading = null;
        throw err;
      });
    return loading;
  }

  /* ---------- search ---------- */

  /* Scores words once (a few thousand), not rows, then walks the inverted
     index. A whole-word hit far outweighs a partial one, a hit in the emoji's
     own name counts double a hit in its keywords, and a name that *is* the
     query wins outright. So "fire" leads with 🔥 rather than everything whose
     name merely contains the word, and "lol" finds 😂 rather than 🍭. */
  function search(query) {
    var terms = query.split(/\s+/).filter(Boolean);
    var totals = null;

    for (var t = 0; t < terms.length; t++) {
      var term = terms[t];
      var round = new Map();

      for (var w = 0; w < data.lower.length; w++) {
        var word = data.lower[w];
        var at = word.indexOf(term);
        if (at === -1) continue;
        var base = word.length === term.length ? 6 : (at === 0 ? 2 : 1);
        var bucket = data.wordRows[w];
        if (!bucket) continue;
        for (var b = 0; b < bucket.length; b++) {
          var row = bucket[b];
          var score = base * (data.nameIdx[row].indexOf(w) === -1 ? 1 : 2);
          var best = round.get(row);
          if (best === undefined || score > best) round.set(row, score);
        }
      }

      if (totals === null) {
        totals = round;
      } else {
        var next = new Map();
        round.forEach(function (score, row) {
          var carried = totals.get(row);
          if (carried !== undefined) next.set(row, carried + score);
        });
        totals = next;
      }
      if (!totals.size) break;
    }

    if (!totals || !totals.size) return [];

    var hits = Array.from(totals.keys());
    var rank = new Map();
    hits.forEach(function (row) {
      var name = nameOf(row).toLowerCase();
      var score = totals.get(row);
      if (name === query) score += 100;
      else if (name.indexOf(query + " ") === 0) score += 10;
      // Widely used emoji collect more CLDR keywords, which makes keyword
      // count a decent stand-in for popularity when scores are otherwise tied.
      score += data.keyCount[row] * 0.05;
      rank.set(row, score);
    });

    hits.sort(function (a, b) {
      var diff = rank.get(b) - rank.get(a);
      return diff || a - b; // ties keep Unicode order
    });
    return hits;
  }

  /* ---------- panel ---------- */

  function build() {
    panel = document.createElement("div");
    panel.className = "emoji-panel";
    panel.hidden = true;

    var head = document.createElement("div");
    head.className = "emoji-head";

    searchEl = document.createElement("input");
    searchEl.type = "text";
    searchEl.className = "emoji-search";
    searchEl.placeholder = "Search emoji";
    searchEl.spellcheck = false;
    searchEl.autocomplete = "off";

    var closeEl = document.createElement("button");
    closeEl.type = "button";
    closeEl.className = "emoji-close";
    closeEl.title = "Close";
    closeEl.setAttribute("aria-label", "Close the emoji picker");
    closeEl.textContent = "\u00d7";
    closeEl.addEventListener("click", close);
    head.append(searchEl, closeEl);

    tabsEl = document.createElement("div");
    tabsEl.className = "emoji-tabs";

    statusEl = document.createElement("p");
    statusEl.className = "emoji-status";

    gridEl = document.createElement("div");
    gridEl.className = "emoji-grid";

    panel.append(head, tabsEl, statusEl, gridEl);
    document.body.appendChild(panel);

    searchEl.addEventListener("input", render);
    searchEl.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "Enter") {
        var first = gridEl.querySelector(".emoji-cell");
        if (first) first.click();
      }
    });

    panel.addEventListener("mousedown", function (e) { e.preventDefault(); });
    document.addEventListener("mousedown", function (e) {
      if (panel.hidden || panel.contains(e.target)) return;
      if (current && current.anchor === e.target) return;
      close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) close();
    });
    window.addEventListener("resize", function () {
      if (!panel.hidden && current) place(current.anchor);
    });
  }

  function buildTabs() {
    tabsEl.textContent = "";
    data.groups.forEach(function (name, i) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "emoji-tab";
      tab.textContent = GROUP_ICON[i] || "\u2022";
      tab.title = name;
      tab.addEventListener("click", function () {
        group = i;
        searchEl.value = "";
        render();
      });
      tabsEl.appendChild(tab);
    });
  }

  function cell(char, label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "emoji-cell";
    button.textContent = char;
    button.title = label;
    button.addEventListener("click", function () { pick(char); });
    return button;
  }

  function section(title) {
    var el = document.createElement("p");
    el.className = "emoji-section";
    el.textContent = title;
    return el;
  }

  function render() {
    if (!data) return;
    var query = searchEl.value.trim().toLowerCase();
    var frag = document.createDocumentFragment();

    Array.prototype.forEach.call(tabsEl.children, function (tab, i) {
      tab.classList.toggle("on", !query && i === group);
    });

    if (query) {
      var hits = search(query);
      statusEl.textContent = hits.length
        ? hits.length + (hits.length === 1 ? " match" : " matches")
        : "Nothing matches \u201c" + query + "\u201d";
      hits.slice(0, LIMIT).forEach(function (row) {
        frag.appendChild(cell(data.chars[row], nameOf(row)));
      });
    } else {
      statusEl.textContent = "";
      var recents = (current && current.recents) || [];
      if (recents.length) {
        frag.appendChild(section("Recent"));
        recents.slice(0, 16).forEach(function (char) { frag.appendChild(cell(char, char)); });
        frag.appendChild(section(data.groups[group]));
      }
      for (var i = 0; i < data.count; i++) {
        if (data.groupOf[i] === group) frag.appendChild(cell(data.chars[i], nameOf(i)));
      }
    }

    gridEl.textContent = "";
    gridEl.appendChild(frag);
    gridEl.scrollTop = 0;
  }

  function pick(char) {
    if (current && current.onPick) current.onPick(char);
    close();
  }

  /* The toolbar popup is only ~320x500, with no room for a floating panel and
     nowhere to scroll to reach one. Below that size the picker becomes a sheet
     covering the whole popup; on a full options page it floats by the anchor.
     Position is fixed either way, so page scrolling can't strand it. */
  function place(anchor) {
    var sheet = window.innerWidth < 420 || window.innerHeight < 460;
    panel.classList.toggle("sheet", sheet);
    if (sheet) {
      panel.style.left = "";
      panel.style.top = "";
      return;
    }

    var rect = anchor.getBoundingClientRect();
    var width = panel.offsetWidth;
    var height = panel.offsetHeight;

    var left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - width / 2),
      Math.max(8, window.innerWidth - width - 8)
    );
    var top = rect.bottom + 6;
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);

    panel.style.left = Math.round(left) + "px";
    panel.style.top = Math.round(top) + "px";
  }

  function close() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    current = null;
  }

  function open(anchor, options) {
    if (!panel) build();
    if (current && current.anchor === anchor) { close(); return; }

    current = {
      anchor: anchor,
      onPick: options.onPick,
      recents: options.recents || []
    };
    searchEl.value = "";
    group = 0;
    panel.hidden = false;

    if (data) {
      render();
      place(anchor);
      searchEl.focus();
      return;
    }

    gridEl.textContent = "";
    statusEl.textContent = "Loading emoji\u2026";
    place(anchor);

    ensureData().then(function () {
      if (panel.hidden || current !== null && current.anchor !== anchor) return;
      buildTabs();
      render();
      place(anchor);
      searchEl.focus();
    }, function () {
      statusEl.textContent = "Couldn't load the emoji list.";
    });
  }

  /* Inserts at the caret so people can build "pig 🐷" without retyping. */
  function insertInto(input, char) {
    var start = input.selectionStart;
    var end = input.selectionEnd;
    if (typeof start === "number" && typeof end === "number") {
      input.value = input.value.slice(0, start) + char + input.value.slice(end);
      input.selectionStart = input.selectionEnd = start + char.length;
    } else {
      input.value += char;
    }
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /* Builds a trigger button for an input. Cheap: no data touched until click. */
  function attach(input, options) {
    options = options || {};
    var button = document.createElement("button");
    button.type = "button";
    button.className = "emoji-trigger";
    button.title = "Insert an emoji";
    button.setAttribute("aria-label", "Insert an emoji");
    button.textContent = "\uD83D\uDE42";
    button.addEventListener("click", function () {
      open(button, {
        recents: options.getRecents ? options.getRecents() : [],
        onPick: function (char) {
          insertInto(input, char);
          if (options.onPick) options.onPick(char);
        }
      });
    });
    return button;
  }

  root.WordSwapEmoji = {
    open: open,
    close: close,
    attach: attach,
    insertInto: insertInto,
    preload: ensureData
  };
})(typeof window !== "undefined" ? window : this);
