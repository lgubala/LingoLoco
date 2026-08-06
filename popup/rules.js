/* Quick add, and the rules already in the list you're looking at. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var pop = BK.pop;

  function markup(rule) {
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
    return mark;
  }

  function render() {
    var list = pop.currentList();
    var container = pop.el("list");
    container.textContent = "";

    if (!list.rules.length) {
      var empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No rules in " + list.name + " yet.";
      container.appendChild(empty);
      return;
    }

    // Newest first: the rule you just added is the one you want to see.
    list.rules.slice().reverse().forEach(function (rule) {
      var row = document.createElement("div");
      row.className = "rule-row" + (rule.enabled === false ? " off" : "");

      var del = document.createElement("button");
      del.className = "ghost";
      del.type = "button";
      del.textContent = "Remove";
      del.addEventListener("click", function () {
        list.rules = list.rules.filter(function (r) { return r.id !== rule.id; });
        pop.save().then(function () { pop.render("rules"); });
      });

      row.append(markup(rule), del);
      container.appendChild(row);
    });
  }

  function add() {
    var fromEl = pop.el("from");
    var toEl = pop.el("to");
    var from = fromEl.value.trim();
    if (!from) { fromEl.focus(); return; }

    var to = toEl.value.split(",").map(function (v) { return v.trim(); }).filter(Boolean);
    if (!to.length) to = [""];

    var list = pop.currentList();
    var existing = null;
    list.rules.forEach(function (r) {
      if (r.from.toLowerCase() === from.toLowerCase()) existing = r;
    });

    if (existing) {
      to.forEach(function (v) { if (existing.to.indexOf(v) === -1) existing.to.push(v); });
    } else {
      list.rules.push(BK.rules.normalize({ from: from, to: to }));
    }

    fromEl.value = "";
    toEl.value = "";
    fromEl.focus();
    pop.save().then(function () { pop.render("rules"); });
  }

  function wire() {
    pop.el("add").addEventListener("click", add);
    ["from", "to"].forEach(function (id) {
      pop.el(id).addEventListener("keydown", function (e) {
        if (e.key === "Enter") add();
      });
    });

    var toEl = pop.el("to");
    toEl.parentNode.appendChild(BK.emoji.attach(toEl, {
      getRecents: function () { return pop.get().recentEmoji; },
      onPick: function (char) {
        var settings = pop.get();
        settings.recentEmoji = [char]
          .concat(settings.recentEmoji.filter(function (c) { return c !== char; }))
          .slice(0, 24);
        pop.save();
      }
    }));
  }

  pop.register("rules", render);
  BK.popPanels = BK.popPanels || {};
  BK.popPanels.rules = { wire: wire };
})(typeof window !== "undefined" ? window : this);
