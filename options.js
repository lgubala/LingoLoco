(function () {
  "use strict";

  var WS = window.WordSwap;
  var EP = window.WordSwapEmoji;

  var DAY = ["S", "M", "T", "W", "T", "F", "S"];
  var DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  var SAMPLE = "Reporters spent the morning outside the courthouse waiting for a statement, " +
    "while three cable networks ran the same clip on a loop. By lunchtime the quote had been " +
    "reprinted everywhere, and the internet had already moved on to arguing about it.";

  var el = {};
  ["master", "master-label", "list-tabs", "list-new", "list-rename", "list-delete", "live-note",
    "from", "to", "add", "list", "rule-count", "specimen", "proof", "reroll",
    "sched-on", "sched-body", "sched-days", "sched-from", "sched-to", "sched-inside", "sched-outside", "sched-summary",
    "copy", "export", "import-btn", "import", "paste", "paste-merge", "paste-new", "paste-target", "io-note",
    "site-input", "site-add", "sites"].forEach(function (id) {
      el[id] = document.getElementById(id);
    });

  var settings = null;
  var proofSeed = 0;
  var saveTimer = null;

  function save(now) {
    clearTimeout(saveTimer);
    if (now) return WS.save(settings);
    saveTimer = setTimeout(function () { WS.save(settings); }, 250);
    return Promise.resolve();
  }

  function currentList() {
    return WS.getList(settings, settings.activeList) || settings.lists[0];
  }

  function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
  }

  function note(text) {
    el["io-note"].textContent = text;
    clearTimeout(note.timer);
    note.timer = setTimeout(function () {
      el["io-note"].textContent = "Exports are plain JSON. Lists from the old Buzz Kill add-on work too.";
    }, 4000);
  }

  /* ---------- lists ---------- */

  function renderLists() {
    var live = WS.resolveListId(settings, new Date());
    el["list-tabs"].textContent = "";

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
        save(true);
        renderAll();
      });
      el["list-tabs"].appendChild(tab);
    });

    el["list-delete"].disabled = settings.lists.length < 2;
    el["paste-target"].textContent = currentList().name;

    if (settings.schedule.enabled) {
      var liveList = WS.getList(settings, live);
      el["live-note"].hidden = false;
      el["live-note"].textContent = liveList && liveList.id !== settings.activeList
        ? "Pages are using " + liveList.name + " right now. You're editing " + currentList().name + "."
        : "Pages are using " + currentList().name + " right now.";
    } else {
      el["live-note"].hidden = true;
    }
  }

  /* ---------- rules ---------- */

  function textField(value, placeholder, onInput) {
    var input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.placeholder = placeholder;
    input.spellcheck = false;
    input.autocomplete = "off";
    input.addEventListener("input", function () { onInput(input.value); });
    return input;
  }

  function checkCell(checked, title, onChange) {
    var cell = document.createElement("span");
    cell.className = "cell";
    var label = document.createElement("label");
    label.className = "check";
    label.title = title;
    var box = document.createElement("input");
    box.type = "checkbox";
    box.checked = checked;
    box.addEventListener("change", function () { onChange(box.checked); });
    label.appendChild(box);
    cell.appendChild(label);
    return cell;
  }

  function emojiButton(input) {
    return EP.attach(input, {
      getRecents: function () { return settings.recentEmoji; },
      onPick: function (char) {
        settings.recentEmoji = [char]
          .concat(settings.recentEmoji.filter(function (c) { return c !== char; }))
          .slice(0, 24);
        save();
      }
    });
  }

  function parseVariants(text) {
    var out = text.split(",").map(function (v) { return v.trim(); }).filter(Boolean);
    return out.length ? out : [""];
  }

  function renderRules() {
    var list = currentList();
    el.list.textContent = "";
    el["rule-count"].textContent = list.rules.length
      ? list.rules.length + (list.rules.length === 1 ? " rule in " : " rules in ") + list.name
      : list.name;

    if (!list.rules.length) {
      var empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Nothing swapped in this list yet.";
      el.list.appendChild(empty);
      return;
    }

    list.rules.forEach(function (rule) {
      var row = document.createElement("div");
      row.className = "rule" + (rule.enabled === false ? " off" : "");

      var sw = document.createElement("label");
      sw.className = "switch";
      sw.title = "Use this rule";
      var swInput = document.createElement("input");
      swInput.type = "checkbox";
      swInput.checked = rule.enabled !== false;
      var track = document.createElement("span");
      track.className = "track";
      swInput.addEventListener("change", function () {
        rule.enabled = swInput.checked;
        row.classList.toggle("off", !swInput.checked);
        save();
        renderProof();
      });
      sw.append(swInput, track);

      var arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.textContent = "\u2192";

      var toWrap = document.createElement("div");
      toWrap.className = "with-emoji";
      var toInput = textField(rule.to.join(", "), "your word, or two", function (v) {
        rule.to = parseVariants(v);
        save();
        renderProof();
      });
      toInput.title = "Comma-separated: each page picks one";
      toWrap.append(toInput, emojiButton(toInput));

      var del = document.createElement("button");
      del.className = "ghost";
      del.type = "button";
      del.title = "Delete this rule";
      del.textContent = "\u00d7";
      del.addEventListener("click", function () {
        list.rules = list.rules.filter(function (r) { return r.id !== rule.id; });
        save(true);
        renderRules();
        renderProof();
      });

      row.append(
        sw,
        textField(rule.from, "word on the page", function (v) { rule.from = v; save(); renderProof(); }),
        arrow,
        toWrap,
        checkCell(!!rule.matchCase, "Match capitalisation exactly", function (v) { rule.matchCase = v; save(); renderProof(); }),
        checkCell(rule.wholeWord !== false, "Match whole words only", function (v) { rule.wholeWord = v; save(); renderProof(); }),
        del
      );

      el.list.appendChild(row);
    });
  }

  function addRule() {
    var from = el.from.value.trim();
    if (!from) { el.from.focus(); return; }
    var to = parseVariants(el.to.value);
    var list = currentList();

    var existing = null;
    list.rules.forEach(function (r) { if (r.from.toLowerCase() === from.toLowerCase()) existing = r; });

    if (existing) {
      to.forEach(function (v) { if (v && existing.to.indexOf(v) === -1) existing.to.push(v); });
    } else {
      list.rules.push(WS.normalizeRule({ from: from, to: to }));
    }

    el.from.value = "";
    el.to.value = "";
    el.from.focus();
    save(true);
    renderRules();
    renderProof();
  }

  /* ---------- proof sheet ---------- */

  function renderProof() {
    var text = el.specimen.value;
    el.proof.textContent = "";
    var matcher = WS.buildMatcher(currentList().rules, { seed: proofSeed });

    if (!matcher) {
      el.proof.appendChild(document.createTextNode(text));
      return;
    }

    var re = matcher.regex;
    re.lastIndex = 0;
    var last = 0;
    var match;
    var changes = 0;

    while ((match = re.exec(text)) !== null) {
      var swapped = matcher.replaceIn(match[0]);
      if (match.index > last) {
        el.proof.appendChild(document.createTextNode(text.slice(last, match.index)));
      }
      if (swapped === match[0]) {
        el.proof.appendChild(document.createTextNode(match[0]));
      } else {
        var del = document.createElement("del");
        del.textContent = match[0];
        var ins = document.createElement("ins");
        ins.textContent = swapped;
        el.proof.append(del, ins);
        changes++;
      }
      last = match.index + match[0].length;
      if (match[0].length === 0) re.lastIndex++;
    }

    el.proof.appendChild(document.createTextNode(text.slice(last)));

    if (!changes) {
      var hint = document.createElement("p");
      hint.className = "tiny muted";
      hint.style.marginTop = "10px";
      hint.textContent = "No rule in " + currentList().name + " matches this text. Edit the sample above to try one out.";
      el.proof.appendChild(hint);
    }
  }

  /* ---------- schedule ---------- */

  function fillListSelect(select, value) {
    select.textContent = "";
    settings.lists.forEach(function (list) {
      var option = document.createElement("option");
      option.value = list.id;
      option.textContent = list.name;
      if (list.id === value) option.selected = true;
      select.appendChild(option);
    });
  }

  function renderSchedule() {
    var s = settings.schedule;
    el["sched-on"].checked = s.enabled;
    el["sched-body"].disabled = !s.enabled;
    el["sched-from"].value = s.from;
    el["sched-to"].value = s.to;
    fillListSelect(el["sched-inside"], s.inside);
    fillListSelect(el["sched-outside"], s.outside);

    el["sched-days"].textContent = "";
    for (var i = 0; i < 7; i++) {
      (function (day) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "day" + (s.days.indexOf(day) !== -1 ? " on" : "");
        button.textContent = DAY[day];
        button.title = DAY_FULL[day];
        button.addEventListener("click", function () {
          var at = s.days.indexOf(day);
          if (at === -1) s.days.push(day); else s.days.splice(at, 1);
          save();
          renderSchedule();
          renderLists();
        });
        el["sched-days"].appendChild(button);
      })(i);
    }

    var inside = WS.getList(settings, s.inside);
    var outside = WS.getList(settings, s.outside);
    el["sched-summary"].textContent = !s.enabled
      ? "Off. Pages use whichever list you pick above."
      : (WS.inWindow(s, new Date())
        ? (inside ? inside.name : "?") + " is live right now."
        : (outside ? outside.name : "?") + " is live right now.");
  }

  /* ---------- sharing ---------- */

  function sharedText() {
    return JSON.stringify(WS.exportList(currentList()), null, 2);
  }

  function applyShared(parsed, asNewList) {
    if (parsed.error) { note(parsed.error); return; }

    if (asNewList) {
      var name = parsed.name || "Imported";
      var list = {
        id: WS.uniqueListId(settings, name),
        name: name,
        rules: parsed.rules.map(function (r) { return WS.normalizeRule(r); })
      };
      settings.lists.push(list);
      settings.activeList = list.id;
      save(true);
      renderAll();
      note("Added " + plural(list.rules.length, "rule") + " as \u201c" + name + "\u201d.");
      return;
    }

    var target = currentList();
    var merged = WS.mergeRules(target.rules, parsed.rules);
    target.rules = merged.rules;
    save(true);
    renderRules();
    renderProof();
    note(plural(merged.added, "new rule") + ", " + plural(merged.extended, "existing rule") + " given more variants.");
  }

  function importText(text, asNewList) {
    if (!text.trim()) { note("Paste a list first."); return; }
    applyShared(WS.parseShared(text), asNewList);
    el.paste.value = "";
  }

  /* ---------- sites ---------- */

  function renderSites() {
    el.sites.textContent = "";
    if (!settings.disabledSites.length) {
      var empty = document.createElement("p");
      empty.className = "empty tiny";
      empty.textContent = "Every site gets the treatment.";
      el.sites.appendChild(empty);
      return;
    }
    settings.disabledSites.forEach(function (site) {
      var row = document.createElement("div");
      row.className = "site-row";
      var name = document.createElement("span");
      name.textContent = site;
      var remove = document.createElement("button");
      remove.className = "ghost";
      remove.type = "button";
      remove.textContent = "Resume here";
      remove.addEventListener("click", function () {
        settings.disabledSites = settings.disabledSites.filter(function (s) { return s !== site; });
        save(true);
        renderSites();
      });
      row.append(name, remove);
      el.sites.appendChild(row);
    });
  }

  function addSite() {
    var raw = el["site-input"].value.trim();
    var host = WS.hostOf(raw.indexOf("://") === -1 ? "https://" + raw : raw);
    if (!host) { el["site-input"].focus(); return; }
    if (settings.disabledSites.indexOf(host) === -1) {
      settings.disabledSites.push(host);
      save(true);
    }
    el["site-input"].value = "";
    renderSites();
  }

  function renderAll() {
    renderLists();
    renderRules();
    renderSchedule();
    renderProof();
    renderSites();
  }

  /* ---------- wiring ---------- */

  el.master.addEventListener("change", function () {
    settings.enabled = el.master.checked;
    el["master-label"].textContent = settings.enabled ? "Replacing" : "Paused";
    save(true);
  });

  el["list-new"].addEventListener("click", function () {
    var name = window.prompt("Name the new list", "Work");
    if (!name || !name.trim()) return;
    var list = { id: WS.uniqueListId(settings, name.trim()), name: name.trim(), rules: [] };
    settings.lists.push(list);
    settings.activeList = list.id;
    save(true);
    renderAll();
  });

  el["list-rename"].addEventListener("click", function () {
    var list = currentList();
    var name = window.prompt("Rename this list", list.name);
    if (!name || !name.trim()) return;
    list.name = name.trim();
    save(true);
    renderAll();
  });

  el["list-delete"].addEventListener("click", function () {
    if (settings.lists.length < 2) return;
    var list = currentList();
    if (!window.confirm("Delete \u201c" + list.name + "\u201d and its " + list.rules.length + " rules?")) return;
    settings.lists = settings.lists.filter(function (l) { return l.id !== list.id; });
    settings.activeList = settings.lists[0].id;
    settings = WS.normalizeSettings(settings);
    save(true);
    renderAll();
  });

  el.add.addEventListener("click", addRule);
  [el.from, el.to].forEach(function (input) {
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") addRule(); });
  });

  el.specimen.addEventListener("input", renderProof);
  el.reroll.addEventListener("click", function () { proofSeed++; renderProof(); });

  el["sched-on"].addEventListener("change", function () {
    settings.schedule.enabled = el["sched-on"].checked;
    save(true);
    renderSchedule();
    renderLists();
  });

  ["from", "to"].forEach(function (key) {
    el["sched-" + key].addEventListener("change", function () {
      settings.schedule[key] = el["sched-" + key].value;
      save();
      renderSchedule();
      renderLists();
    });
  });

  ["inside", "outside"].forEach(function (key) {
    el["sched-" + key].addEventListener("change", function () {
      settings.schedule[key] = el["sched-" + key].value;
      save();
      renderSchedule();
      renderLists();
    });
  });

  el.copy.addEventListener("click", function () {
    navigator.clipboard.writeText(sharedText()).then(function () {
      note(currentList().name + " copied \u2014 paste it to whoever wants it.");
    }, function () {
      el.paste.value = sharedText();
      note("Clipboard blocked, so the list is in the box below instead.");
    });
  });

  el.export.addEventListener("click", function () {
    var url = URL.createObjectURL(new Blob([sharedText()], { type: "application/json" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = "buzzkill-" + currentList().name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    note("Saved " + plural(currentList().rules.length, "rule") + " to a file.");
  });

  el["import-btn"].addEventListener("click", function () { el.import.click(); });

  el.import.addEventListener("change", function () {
    var file = el.import.files[0];
    el.import.value = "";
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = WS.parseShared(String(reader.result));
      if (!parsed.error && !parsed.name) parsed.name = file.name.replace(/\.json$/i, "");
      applyShared(parsed, true);
    };
    reader.readAsText(file);
  });

  el["paste-merge"].addEventListener("click", function () { importText(el.paste.value, false); });
  el["paste-new"].addEventListener("click", function () { importText(el.paste.value, true); });

  el["site-add"].addEventListener("click", addSite);
  el["site-input"].addEventListener("keydown", function (e) { if (e.key === "Enter") addSite(); });

  WS.load().then(function (loaded) {
    settings = loaded;
    el.master.checked = settings.enabled;
    el["master-label"].textContent = settings.enabled ? "Replacing" : "Paused";
    el.specimen.value = SAMPLE;
    el.to.parentNode.appendChild(emojiButton(el.to));
    renderAll();
    focusSection();
  });

  /* The popup links straight to a panel, e.g. options.html#share */
  function focusSection() {
    var id = (location.hash || "").replace("#", "");
    var target = id && document.getElementById(id);
    if (!target) return;
    if (target.scrollIntoView) target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("flash");
    setTimeout(function () { target.classList.remove("flash"); }, 1800);
  }
})();
