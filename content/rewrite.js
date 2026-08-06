/* Putting the replacements into the page. Given a matcher and a root node,
   rewrites every text node and tooltip-ish attribute below it. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var skip = null; // resolved lazily: BK.skip is defined by another file

  /* Remembers the text we ourselves wrote, so a rule like cat -> cats can never
     chew on its own output, and so re-walks are near-free. */
  var written = new WeakMap();

  function rewriteTextNode(matcher, node) {
    var value = node.nodeValue;
    if (!value || value.length < 2) return;
    if (written.get(node) === value) return;
    if (!matcher.test(value)) return;
    var next = matcher.replaceIn(value);
    if (next === value) return;
    node.nodeValue = next;
    written.set(node, next);
  }

  function rewriteAttributes(matcher, el) {
    var attrs = skip.ATTRS;
    for (var i = 0; i < attrs.length; i++) {
      var value = el.getAttribute(attrs[i]);
      if (!value || value.length < 2 || !matcher.test(value)) continue;
      var next = matcher.replaceIn(value);
      if (next !== value) el.setAttribute(attrs[i], next);
    }
  }

  /* Text-only traversal. Visiting elements too, so their subtrees could be
     pruned, sounds faster but measures worse: on a typical app UI elements
     outnumber text nodes several times over, so pruning trades one cheap check
     per text node for five expensive ones per element.
     Nothing structural changes while walking, so nodes are rewritten in place
     rather than collected into an array first. */
  function walk(matcher, node) {
    if (!matcher || !node) return;
    skip = BK.skip;

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement && !skip.shouldSkip(node.parentElement)) {
        rewriteTextNode(matcher, node);
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (skip.shouldSkip(node)) return;
      if (node.hasAttributes()) rewriteAttributes(matcher, node);
    }

    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode: function (text) {
        if (!text.nodeValue || text.nodeValue.length < 2) return NodeFilter.FILTER_REJECT;
        var parent = text.parentElement;
        return !parent || skip.shouldSkip(parent) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });

    var text;
    while ((text = walker.nextNode())) rewriteTextNode(matcher, text);

    // Far fewer elements carry these than carry text, and the selector engine
    // finds them natively, so this stays a separate native query.
    if (!node.querySelectorAll) return;
    var tagged = node.querySelectorAll(skip.ATTR_SELECTOR);
    for (var i = 0; i < tagged.length; i++) {
      if (!skip.editable(tagged[i])) rewriteAttributes(matcher, tagged[i]);
    }
  }

  function reset() {
    written = new WeakMap();
  }

  BK.rewrite = { walk: walk, reset: reset };
})(typeof window !== "undefined" ? window : this);
