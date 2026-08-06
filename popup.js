(function () {
  "use strict";

  var api = typeof browser !== "undefined" ? browser : chrome;
  var WS = window.WordSwap;
  var EP = window.WordSwapEmoji;

  var DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  var el = {
    status: document.getElementById("status"),
    master: document.getElementById("master"),
    tabs: document.getElementById("list-tabs"),
    listNote: document.getElementById("list-note"),
    siteRow: document.getElementById("site-row"),
    siteName: document.getElementById("site-name"),
    siteToggle: document.getElementById("site-toggle"),
    from: document.getElementById("from"),
    to: document.getElementById("to"),
    add: document.getElementById("add"),
    list: document.getElementById("list"),
    reload: document.getElementById("reload"),
    options: document.getElementById("open-options"),
    schedule: document.getElementById("open-schedule"),
    share: document.getElementById("open-share")
  };

  var settings = null;
  var host = "";
  var tabId = null;

  function save() { return WS.save(settings); }

  function scheduledId() { return WS.resolveListId(settings, new Date()); }

  function shownList() {
    return WS.getList(settings, settings.activeList) || settings.lists[0];
  }

  function render() {
    var siteOff = WS.siteIsOff(settings.disabledSites, host);
    var live = scheduledId();

    el.master.checked = settings.enabled;
    el.status.textContent = !settings.enabled ? "Paused" : (siteOff ? "Off here" : "On");
    el.status.classList.toggle("off", !settings.enabled || siteOff);

    // list tabs
    el.tabs.textContent = "";
    settings.lists.forEach(function (list) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "tab" + (list.id === settings.activeList ? " on" : "");
      tab.textContent = list.name;
      if (settings.schedule.enabled && list.id === live) {
        var dot = document.createElement("span");
        dot.className = "auto";
        dot.title = "On duty right now";
        tab.appendChild(dot);
      }
      tab.addEventListener("click", function () {
        settings.activeList = list.id;
        save().then(render);
      });
      el.tabs.appendChild(tab);
    });

    if (settings.schedule.enabled) {
      var liveList = WS.getList(settings, live);
      var s = settings.schedule;
      var days = s.days.length === 7 ? "every day"
        : (s.days.join() === "1,2,3,4,5" ? "Mon\u2013Fri" : s.days.map(function (d) { return DAY[d]; }).join(" "));
      el.listNote.hidden = false;
      el.listNote.textContent = "On a schedule: " + (liveList ? liveList.name : "?") +
        " is live now (" + days + " " + s.from + "\u2013" + s.to + ").";
    } else {
      el.listNote.hidden = true;
    }

    if (host) {
      el.siteRow.hidden = false;
      el.siteName.textContent = siteOff ? "Skipping " + host : "Running on " + host;
      el.siteToggle.checked = !siteOff;
    }

    renderRules();
  }

  function renderRules() {
    var list = shownList();
    el.list.textContent = "";

    if (!list.rules.length) {
      var empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No rules in " + list.name + " yet.";
      el.list.appendChild(empty);
      return;
    }

    list.rules.slice().reverse().forEach(function (rule) {
      var row = document.createElement("div");
      row.className = "rule-row" + (rule.enabled === false ? " off" : "");

      var mark = document.createElement("span");
      mark.className = "mark";
      var from = document.createElement("span");
      from.className = "from";
      from.textContent = rule.from;
      var arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.textContent = "\u2192";
      var to = document.createElement("span");
      to.className = "to";
      to.textContent = rule.to[0];
      mark.append(from, arrow, to);

      if (rule.to.length > 1) {
        var more = document.createElement("span");
        more.className = "variants";
        more.textContent = "+" + (rule.to.length - 1);
        more.title = rule.to.join(", ");
        mark.appendChild(more);
      }

      var del = document.createElement("button");
      del.className = "ghost";
      del.type = "button";
      del.textContent = "Remove";
      del.addEventListener("click", function () {
        list.rules = list.rules.filter(function (r) { return r.id !== rule.id; });
        save().then(renderRules);
      });

      row.append(mark, del);
      el.list.appendChild(row);
    });
  }

  function addRule() {
    var from = el.from.value.trim();
    if (!from) { el.from.focus(); return; }
    var to = el.to.value.split(",").map(function (v) { return v.trim(); }).filter(Boolean);
    if (!to.length) to = [""];

    var list = shownList();
    var existing = null;
    list.rules.forEach(function (r) { if (r.from.toLowerCase() === from.toLowerCase()) existing = r; });

    if (existing) {
      to.forEach(function (v) { if (existing.to.indexOf(v) === -1) existing.to.push(v); });
    } else {
      list.rules.push(WS.normalizeRule({ from: from, to: to }));
    }

    el.from.value = "";
    el.to.value = "";
    el.from.focus();
    save().then(renderRules);
  }

  el.master.addEventListener("change", function () {
    settings.enabled = el.master.checked;
    save().then(render);
  });

  el.siteToggle.addEventListener("change", function () {
    settings.disabledSites = settings.disabledSites.filter(function (entry) {
      return String(entry).replace(/^www\./, "").toLowerCase() !== host;
    });
    if (!el.siteToggle.checked) settings.disabledSites.push(host);
    save().then(render);
  });

  el.add.addEventListener("click", addRule);
  [el.from, el.to].forEach(function (input) {
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") addRule(); });
  });

  el.reload.addEventListener("click", function () {
    if (tabId != null) api.tabs.reload(tabId);
    window.close();
  });

  function openOptions(section) {
    if (section) {
      api.tabs.create({ url: api.runtime.getURL("options.html#" + section) });
    } else {
      api.runtime.openOptionsPage();
    }
    window.close();
  }

  el.options.addEventListener("click", function () { openOptions(""); });
  el.schedule.addEventListener("click", function () { openOptions("schedule"); });
  el.share.addEventListener("click", function () { openOptions("share"); });

  function currentTab() {
    return new Promise(function (resolve) {
      api.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        resolve(tabs && tabs[0] ? tabs[0] : null);
      });
    });
  }

  Promise.all([WS.load(), currentTab()]).then(function (out) {
    settings = out[0];
    var tab = out[1];
    if (tab) {
      tabId = tab.id;
      host = WS.hostOf(tab.url || "");
    }

    el.to.parentNode.appendChild(EP.attach(el.to, {
      getRecents: function () { return settings.recentEmoji; },
      onPick: function (char) {
        settings.recentEmoji = [char].concat(settings.recentEmoji.filter(function (c) { return c !== char; })).slice(0, 24);
        save();
      }
    }));

    render();
    el.from.focus();
  });
})();
