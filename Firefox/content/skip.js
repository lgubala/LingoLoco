/* Deciding what to leave alone: script and style, code blocks, form fields,
   and anything the user can type into. */
(function (root) {
  "use strict";
  var BK = root.BK;

  var SKIP_TAGS = {
    SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1,
    OPTION: 1, CODE: 1, PRE: 1, KBD: 1, SAMP: 1, VAR: 1, TEMPLATE: 1,
    IFRAME: 1, OBJECT: 1, EMBED: 1, CANVAS: 1, SVG: 1, MATH: 1
  };

  var ATTRS = ["title", "alt", "placeholder", "aria-label"];
  var ATTR_SELECTOR = "[title],[alt],[placeholder],[aria-label]";

  var cache = new WeakMap();

  /* True when this element itself is editable. isContentEditable already
     inherits down the tree; engines that don't implement it fall back to the
     attribute, and shouldSkip's walk up the tree supplies the inheritance. */
  function editable(el) {
    var flag = el.isContentEditable;
    if (typeof flag === "boolean") return flag;
    if (!el.hasAttribute || !el.hasAttribute("contenteditable")) return false;
    return el.getAttribute("contenteditable") !== "false";
  }

  /* Checking only the immediate parent misses <pre><span>code</span></pre>,
     which is how every syntax highlighter on the web emits code blocks. But
     skip-ness is inherited, so an element is skipped exactly when its own tag
     says so or its parent is skipped — one step of recursion, memoised. Each
     element is decided once for the life of the page instead of once per text
     node, and a deep node's answer is usually already cached from its siblings.
     Weak keys, so detached nodes are collected normally. */
  function shouldSkip(el) {
    var cached = cache.get(el);
    if (cached !== undefined) return cached;

    var verdict;
    if (SKIP_TAGS[el.nodeName] || editable(el)) {
      verdict = true;
    } else {
      var parent = el.parentElement;
      verdict = parent ? shouldSkip(parent) : false;
    }

    cache.set(el, verdict);
    return verdict;
  }

  function reset() {
    cache = new WeakMap();
  }

  BK.skip = {
    ATTRS: ATTRS,
    ATTR_SELECTOR: ATTR_SELECTOR,
    editable: editable,
    shouldSkip: shouldSkip,
    reset: reset
  };
})(typeof window !== "undefined" ? window : this);
