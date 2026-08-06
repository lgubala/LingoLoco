/* Buzz Kill - rewrites matching words in the live page. */
(function () {
  "use strict";

  var WS = window.WordSwap;
  var api = typeof browser !== "undefined" ? browser : chrome;

  var SKIP_TAGS = {
    SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1,
    OPTION: 1, CODE: 1, PRE: 1, KBD: 1, SAMP: 1, VAR: 1, TEMPLATE: 1,
    IFRAME: 1, OBJECT: 1, EMBED: 1, CANVAS: 1, SVG: 1, MATH: 1
  };
  var ATTRS = ["title", "alt", "placeholder", "aria-label"];
  var ATTR_SELECTOR = "[title],[alt],[placeholder],[aria-label]";
  var QUEUE_CAP = 400;

  var matcher = null;
  var observer = null;
  var running = false;
  // Remembers the text we ourselves wrote, so a rule like cat -> cats can never
  // chew on its own output, and so re-walks are near-free.
  var written = new WeakMap();

  var queue = [];
  var queued = null;
  var rescanAll = false;
  var scheduled = false;

  var idle = window.requestIdleCallback
    ? window.requestIdleCallback.bind(window)
    : function (fn) { return setTimeout(fn, 16); };

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
     node, and the answer for a deep node is usually already cached from its
     siblings. Weak keys, so detached nodes are collected normally. */
  var skipCache = new WeakMap();

  function shouldSkip(el) {
    var cached = skipCache.get(el);
    if (cached !== undefined) return cached;

    var verdict;
    if (SKIP_TAGS[el.nodeName] || editable(el)) {
      verdict = true;
    } else {
      var parent = el.parentElement;
      verdict = parent ? shouldSkip(parent) : false;
    }

    skipCache.set(el, verdict);
    return verdict;
  }

  function rewriteTextNode(node) {
    var value = node.nodeValue;
    if (!value || value.length < 2) return;
    if (written.get(node) === value) return;
    if (!matcher.test(value)) return;
    var next = matcher.replaceIn(value);
    if (next === value) return;
    node.nodeValue = next;
    written.set(node, next);
  }

  function rewriteAttributes(el) {
    for (var i = 0; i < 4; i++) {
      var value = el.getAttribute(ATTRS[i]);
      if (!value || value.length < 2 || !matcher.test(value)) continue;
      var next = matcher.replaceIn(value);
      if (next !== value) el.setAttribute(ATTRS[i], next);
    }
  }

  /* Text-only traversal. Visiting elements too, so their subtrees could be
     pruned, sounds faster but measures worse: on a typical app UI elements
     outnumber text nodes several times over, so pruning trades one cheap check
     per text node for five expensive ones per element.
     Nothing structural changes while walking, so nodes are rewritten in place
     rather than collected into an array first. */
  function walk(root) {
    if (!matcher || !root) return;

    if (root.nodeType === Node.TEXT_NODE) {
      if (root.parentElement && !shouldSkip(root.parentElement)) rewriteTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) {
      if (shouldSkip(root)) return;
      if (root.hasAttributes()) rewriteAttributes(root);
    }

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || node.nodeValue.length < 2) return NodeFilter.FILTER_REJECT;
        var parent = node.parentElement;
        return !parent || shouldSkip(parent) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });

    var node;
    while ((node = walker.nextNode())) rewriteTextNode(node);

    // Far fewer elements carry these than carry text, and the selector engine
    // finds them natively, so this stays a separate native query.
    if (!root.querySelectorAll) return;
    var tagged = root.querySelectorAll(ATTR_SELECTOR);
    for (var i = 0; i < tagged.length; i++) {
      if (!editable(tagged[i])) rewriteAttributes(tagged[i]);
    }
  }

  /* Mutation-heavy pages (feeds, chat, live scores) fire thousands of records a
     second. Collecting them and draining once the browser is idle keeps the
     rewrite off the critical path instead of running inside every callback. */
  function flush() {
    scheduled = false;
    if (!matcher) { queue = []; queued = null; rescanAll = false; return; }

    var work = queue;
    var all = rescanAll;
    queue = [];
    queued = null;
    rescanAll = false;

    running = true;
    try {
      if (all) {
        walk(document.documentElement);
      } else {
        for (var i = 0; i < work.length; i++) {
          if (work[i].isConnected) walk(work[i]);
        }
      }
    } finally {
      running = false;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    idle(flush, { timeout: 300 });
  }

  function enqueue(node) {
    if (rescanAll) return;
    if (queue.length >= QUEUE_CAP) {
      // Past a point it is cheaper to re-walk the document than to track nodes;
      // the WeakMap makes already-rewritten text a no-op anyway.
      queue = [];
      queued = null;
      rescanAll = true;
      return;
    }
    if (!queued) queued = new Set();
    if (queued.has(node)) return;
    queued.add(node);
    queue.push(node);
  }

  function start() {
    if (!matcher) return;
    walk(document.documentElement);
    if (observer) return;

    observer = new MutationObserver(function (records) {
      if (running || !matcher) return;
      for (var i = 0; i < records.length; i++) {
        var rec = records[i];
        if (rec.type === "childList") {
          for (var k = 0; k < rec.addedNodes.length; k++) {
            var node = rec.addedNodes[k];
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) enqueue(node);
          }
        } else if (rec.type === "attributes" && rec.attributeName === "contenteditable") {
          skipCache = new WeakMap();
          rescanAll = true;
        } else {
          enqueue(rec.target);
        }
      }
      if (queue.length || rescanAll) schedule();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS.concat(["contenteditable"])
    });
  }

  function stop() {
    if (observer) { observer.disconnect(); observer = null; }
    matcher = null;
    queue = [];
    queued = null;
    rescanAll = false;
  }

  function apply(settings) {
    var host = WS.hostOf(location.href);
    if (!settings.enabled || WS.siteIsOff(settings.disabledSites, host)) { stop(); return; }
    // Which list is live can depend on the clock, so resolve it per page load.
    var next = WS.buildMatcher(WS.activeRules(settings, new Date()));
    if (!next) { stop(); return; }
    matcher = next;
    start();
  }

  WS.load().then(apply);

  // Newly added rules take effect immediately; removing a rule needs a reload,
  // because the original words are already gone from the DOM.
  api.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local") return;
    WS.load().then(function (settings) {
      written = new WeakMap();
      skipCache = new WeakMap();
      apply(settings);
    });
  });
})();
