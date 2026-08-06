/* Switch by the clock: days, an hour window, and a list for each side of it. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var app = BK.app;

  var SHORT = ["S", "M", "T", "W", "T", "F", "S"];
  var FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function fillListSelect(select, value) {
    select.textContent = "";
    app.get().lists.forEach(function (list) {
      var option = document.createElement("option");
      option.value = list.id;
      option.textContent = list.name;
      if (list.id === value) option.selected = true;
      select.appendChild(option);
    });
  }

  function dayButton(schedule, day) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "day" + (schedule.days.indexOf(day) !== -1 ? " on" : "");
    button.textContent = SHORT[day];
    button.title = FULL[day];
    button.addEventListener("click", function () {
      var at = schedule.days.indexOf(day);
      if (at === -1) schedule.days.push(day); else schedule.days.splice(at, 1);
      app.save();
      app.render("schedule", "lists");
    });
    return button;
  }

  function render() {
    var settings = app.get();
    var s = settings.schedule;

    app.el("sched-on").checked = s.enabled;
    app.el("sched-body").disabled = !s.enabled;
    app.el("sched-from").value = s.from;
    app.el("sched-to").value = s.to;
    fillListSelect(app.el("sched-inside"), s.inside);
    fillListSelect(app.el("sched-outside"), s.outside);

    var days = app.el("sched-days");
    days.textContent = "";
    for (var day = 0; day < 7; day++) days.appendChild(dayButton(s, day));

    var inside = BK.settings.getList(settings, s.inside);
    var outside = BK.settings.getList(settings, s.outside);
    app.el("sched-summary").textContent = !s.enabled
      ? "Off. Pages use whichever list you pick above."
      : (BK.schedule.inWindow(s, new Date())
        ? (inside ? inside.name : "?") + " is live right now."
        : (outside ? outside.name : "?") + " is live right now.");
  }

  function wire() {
    app.el("sched-on").addEventListener("change", function () {
      app.get().schedule.enabled = app.el("sched-on").checked;
      app.save(true);
      app.render("schedule", "lists");
    });

    ["from", "to", "inside", "outside"].forEach(function (key) {
      app.el("sched-" + key).addEventListener("change", function () {
        app.get().schedule[key] = app.el("sched-" + key).value;
        app.save();
        app.render("schedule", "lists");
      });
    });
  }

  app.register("schedule", render);
  BK.panels = BK.panels || {};
  BK.panels.schedule = { wire: wire };
})(typeof window !== "undefined" ? window : this);
