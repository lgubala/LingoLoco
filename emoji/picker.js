/* The picker panel itself: one element, reused by every trigger on the page. */
(function (root) {
  "use strict";
  var BK = root.BK;

  var GROUP_ICON = ["\uD83D\uDE00", "\uD83D\uDC4B", "\uD83D\uDC3B", "\uD83C\uDF55", "\u2708\uFE0F", "\u26BD", "\uD83D\uDCA1", "\u2764\uFE0F", "\uD83C\uDFC1"];
  var LIMIT = 240;

  var data = null;
  var panel, searchEl, gridEl, tabsEl, statusEl;
  var current = null;  // { anchor, onPick, recents }
  var group = 0;

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
      var hits = BK.emojiSearch(data, query);
      statusEl.textContent = hits.length
        ? hits.length + (hits.length === 1 ? " match" : " matches")
        : "Nothing matches \u201c" + query + "\u201d";
      hits.slice(0, LIMIT).forEach(function (row) {
        frag.appendChild(cell(data.chars[row], BK.emojiData.nameOf(row)));
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
        if (data.groupOf[i] === group) frag.appendChild(cell(data.chars[i], BK.emojiData.nameOf(i)));
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
    data = BK.emojiData.current();
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

    BK.emojiData.load().then(function () {
      data = BK.emojiData.current();
      if (panel.hidden || current !== null && current.anchor !== anchor) return;
      buildTabs();
      render();
      place(anchor);
      searchEl.focus();
    }, function () {
      statusEl.textContent = "Couldn't load the emoji list.";
    });
  }

  BK.emojiPicker = { open: open, close: close };
})(typeof window !== "undefined" ? window : this);
