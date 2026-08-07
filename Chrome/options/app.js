/* Shared state for the options page.

   Each panel is its own file and registers a render function here. Panels
   never call each other directly: they change settings, then ask for the
   panels affected to redraw. */
(function (root) {
  "use strict";
  var LL = root.LL;

  var settings = null;
  var panels = {};
  var saveTimer = null;

  function el(id) {
    return document.getElementById(id);
  }

  /* Typing in a field saves on a short delay; clicks that restructure things
     (add, delete, import) save immediately. */
  function save(now) {
    clearTimeout(saveTimer);
    if (now) return LL.settings.save(settings);
    saveTimer = setTimeout(function () { LL.settings.save(settings); }, 250);
    return Promise.resolve();
  }

  function register(name, render) {
    panels[name] = render;
  }

  function render() {
    var names = arguments.length ? Array.prototype.slice.call(arguments) : Object.keys(panels);
    names.forEach(function (name) {
      if (panels[name]) panels[name]();
    });
  }

  function currentList() {
    return LL.settings.getList(settings, settings.activeList) || settings.lists[0];
  }

  function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
  }

  LL.app = {
    el: el,
    save: save,
    register: register,
    render: render,
    currentList: currentList,
    plural: plural,
    get: function () { return settings; },
    set: function (next) { settings = next; }
  };
})(typeof window !== "undefined" ? window : this);
