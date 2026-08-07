/* Light, dark, or whatever the operating system is doing.

   All this does is put an attribute on <html>; tokens.css does the rest via
   color-scheme. Applied on every surface, so the popup and the options page
   never disagree. */
(function (root) {
  "use strict";
  var BK = root.BK;

  var CHOICES = ["system", "light", "dark"];

  function normalize(value) {
    return CHOICES.indexOf(value) === -1 ? "system" : value;
  }

  function apply(value) {
    var theme = normalize(value);
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    return theme;
  }

  BK.theme = { CHOICES: CHOICES, normalize: normalize, apply: apply };
})(typeof window !== "undefined" ? window : this);
