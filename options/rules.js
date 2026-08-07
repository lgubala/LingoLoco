/* The rules table: one row per rule, editable in place. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var app = BK.app;

  function ruleRow(list, rule) {
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
      app.save();
      app.render("proof");
    });
    sw.append(swInput, track);

    var arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.textContent = "\u2192";

    var toWrap = document.createElement("div");
    toWrap.className = "with-emoji";
    var toInput = BK.fields.text(rule.to.join(", "), "your word, or two", function (v) {
      rule.to = BK.fields.parseVariants(v);
      app.save();
      app.render("proof");
    });
    toInput.title = "Comma-separated: they take turns down the page";
    toWrap.append(toInput, BK.fields.emojiButton(toInput));

    var del = document.createElement("button");
    del.className = "ghost";
    del.type = "button";
    del.title = "Delete this rule";
    del.textContent = "\u00d7";
    del.addEventListener("click", function () {
      list.rules = list.rules.filter(function (r) { return r.id !== rule.id; });
      app.save(true);
      app.render("rules", "proof");
    });

    row.append(
      sw,
      BK.fields.text(rule.from, "word on the page", function (v) {
        rule.from = v;
        app.save();
        app.render("proof");
      }),
      arrow,
      toWrap,
      BK.fields.check(!!rule.matchCase, "Match capitalisation exactly", function (v) {
        rule.matchCase = v;
        app.save();
        app.render("proof");
      }),
      BK.fields.check(rule.wholeWord !== false, "Match whole words only", function (v) {
        rule.wholeWord = v;
        app.save();
        app.render("proof");
      }),
      del
    );

    return row;
  }

  function render() {
    var list = app.currentList();
    var container = app.el("list");
    container.textContent = "";

    app.el("rule-count").textContent = list.rules.length
      ? app.plural(list.rules.length, "rule") + " in " + list.name
      : list.name;

    if (!list.rules.length) {
      var empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Nothing swapped in this list yet.";
      container.appendChild(empty);
      return;
    }

    var frag = document.createDocumentFragment();
    list.rules.forEach(function (rule) { frag.appendChild(ruleRow(list, rule)); });
    container.appendChild(frag);
  }

  function add() {
    var fromEl = app.el("from");
    var toEl = app.el("to");
    var from = fromEl.value.trim();
    if (!from) { fromEl.focus(); return; }

    var to = BK.fields.parseVariants(toEl.value);
    var list = app.currentList();
    var existing = null;
    list.rules.forEach(function (r) {
      if (r.from.toLowerCase() === from.toLowerCase()) existing = r;
    });

    // Adding a word that's already there widens it instead of duplicating it.
    if (existing) {
      to.forEach(function (v) { if (v && existing.to.indexOf(v) === -1) existing.to.push(v); });
    } else {
      list.rules.push(BK.rules.normalize({ from: from, to: to }));
    }

    fromEl.value = "";
    toEl.value = "";
    fromEl.focus();
    app.save(true);
    app.render("rules", "proof");
  }

  function wire() {
    app.el("add").addEventListener("click", add);
    ["from", "to"].forEach(function (id) {
      app.el(id).addEventListener("keydown", function (e) {
        if (e.key === "Enter") add();
      });
    });
    app.el("to").parentNode.appendChild(BK.fields.emojiButton(app.el("to")));
  }

  app.register("rules", render);
  BK.panels = BK.panels || {};
  BK.panels.rules = { wire: wire };
})(typeof window !== "undefined" ? window : this);
