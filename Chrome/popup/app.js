/* Shared state for the popup, mirroring the options page's arrangement on a
   smaller scale: panels register a render function and never call each other. */
(function (root) {
  "use strict";
  var LL = root.LL;

  var settings = null;
  var panels = {};
  var page = { tabId: null, host: "" };

  function el(id) { return document.getElementById(id); }

  function save() { return LL.settings.save(settings); }

  function register(name, render) { panels[name] = render; }

  function render() {
    var names = arguments.length ? Array.prototype.slice.call(arguments) : Object.keys(panels);
    names.forEach(function (name) { if (panels[name]) panels[name](); });
  }

  function currentList() {
    return LL.settings.getList(settings, settings.activeList) || settings.lists[0];
  }

  function siteIsOff() {
    return LL.sites.isOff(settings.disabledSites, page.host);
  }

  LL.pop = {
    el: el,
    save: save,
    register: register,
    render: render,
    currentList: currentList,
    siteIsOff: siteIsOff,
    page: page,
    get: function () { return settings; },
    set: function (next) { settings = next; }
  };
})(typeof window !== "undefined" ? window : this);
