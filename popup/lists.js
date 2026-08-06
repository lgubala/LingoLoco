/* List tabs, plus a plain-English line about what the schedule is doing. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var pop = BK.pop;

  var DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function describeDays(days) {
    if (days.length === 7) return "every day";
    if (days.slice().sort().join() === "1,2,3,4,5") return "Mon\u2013Fri";
    return days.map(function (d) { return DAY[d]; }).join(" ");
  }

  function render() {
    var settings = pop.get();
    var live = BK.schedule.resolveListId(settings, new Date());
    var tabs = pop.el("list-tabs");
    tabs.textContent = "";

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
        pop.save().then(function () { pop.render(); });
      });
      tabs.appendChild(tab);
    });

    var note = pop.el("list-note");
    if (!settings.schedule.enabled) { note.hidden = true; return; }

    var s = settings.schedule;
    var liveList = BK.settings.getList(settings, live);
    note.hidden = false;
    note.textContent = "On a schedule: " + (liveList ? liveList.name : "?") +
      " is live now (" + describeDays(s.days) + " " + s.from + "\u2013" + s.to + ").";
  }

  pop.register("lists", render);
})(typeof window !== "undefined" ? window : this);
