/* One tip at a time. Most of what this extension can do isn't visible from the
   main screen, and nobody reads a feature list. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var app = BK.app;

  var TIPS = [
    "Give a word several replacements, comma-separated, and each page picks one: " +
      "synergy \u2192 hot air, word salad, \uD83D\uDCA8.",
    "Whole words are matched by default, so a rule for \u201ccat\u201d leaves " +
      "\u201cconcatenate\u201d alone. Untick Whole if you want it inside longer words too.",
    "Longer rules win. With both \u201cthought leader\u201d and \u201cleader\u201d in a list, " +
      "the phrase keeps its own replacement.",
    "Capitalisation follows the page, so one rule covers synergy, Synergy and SYNERGY. " +
      "Tick Aa when you want only the exact casing you typed.",
    "Emoji work as replacements. disrupt \u2192 \uD83D\uDCA5 reads exactly as well as a word does.",
    "Your own typing is never touched. Search boxes, comment fields and code blocks " +
      "keep the real word, so you can still look things up.",
    "Skipping a site covers its subdomains too: skip example.com and mail.example.com " +
      "goes with it.",
    "Adding a rule takes effect straight away. Editing or deleting one needs a reload, " +
      "because the old word is already gone from the page.",
    "Let the clock do it: office vocabulary Monday to Friday, whatever you like in the evening.",
    "Export ticks more than one list at a time. They travel together in a single file, " +
      "each keeping its name.",
    "Importing never overwrites. A word you both have keeps your replacements and gains theirs.",
    "Keep a throwaway list for one particular site, switch to it while you're reading, " +
      "and switch back after.",
    "The proof sheet runs the same engine the pages do. Paste real text into it to try a " +
      "rule before you let it loose.",
    "A rule with an empty replacement deletes the word instead of swapping it."
  ];

  var at = Math.floor(Math.random() * TIPS.length);

  function render() {
    app.el("tip-text").textContent = TIPS[at % TIPS.length];
  }

  function wire() {
    app.el("tip-next").addEventListener("click", function () {
      at++;
      render();
    });
  }

  app.register("tips", render);
  BK.panels = BK.panels || {};
  BK.panels.tips = { wire: wire };
})(typeof window !== "undefined" ? window : this);
