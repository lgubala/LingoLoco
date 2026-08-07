/* Keeping up with pages that never stop changing.

   Mutation-heavy pages (feeds, chat, live scores) fire thousands of records a
   second. Records are collected and drained once the browser is idle, so the
   rewrite stays off the critical path instead of running inside every
   callback. */
(function (root) {
  "use strict";
  var BK = root.BK;

  var QUEUE_CAP = 400;

  var matcher = null;
  var observer = null;
  var running = false;
  var queue = [];
  var queued = null;
  var rescanAll = false;
  var scheduled = false;

  var idle = root.requestIdleCallback
    ? root.requestIdleCallback.bind(root)
    : function (fn) { return setTimeout(fn, 16); };

  function clearQueue() {
    queue = [];
    queued = null;
    rescanAll = false;
  }

  function flush() {
    scheduled = false;
    if (!matcher) { clearQueue(); return; }

    var work = queue;
    var all = rescanAll;
    clearQueue();

    running = true;
    try {
      if (all) {
        BK.rewrite.walk(matcher, document.documentElement);
      } else {
        for (var i = 0; i < work.length; i++) {
          if (work[i].isConnected) BK.rewrite.walk(matcher, work[i]);
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
      // already-rewritten text is a no-op anyway.
      clearQueue();
      rescanAll = true;
      return;
    }
    if (!queued) queued = new Set();
    if (queued.has(node)) return;
    queued.add(node);
    queue.push(node);
  }

  function handle(records) {
    if (running || !matcher) return;
    for (var i = 0; i < records.length; i++) {
      var rec = records[i];
      if (rec.type === "childList") {
        for (var k = 0; k < rec.addedNodes.length; k++) {
          var node = rec.addedNodes[k];
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            enqueue(node);
          }
        }
      } else if (rec.type === "attributes" && rec.attributeName === "contenteditable") {
        // An element just became (un)editable: every cached verdict below it
        // could be wrong now.
        BK.skip.reset();
        rescanAll = true;
      } else {
        enqueue(rec.target);
      }
    }
    if (queue.length || rescanAll) schedule();
  }

  function start(nextMatcher) {
    matcher = nextMatcher;
    BK.rewrite.walk(matcher, document.documentElement);
    if (observer) return;

    observer = new MutationObserver(handle);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: BK.skip.ATTRS.concat(["contenteditable"])
    });
  }

  function stop() {
    if (observer) { observer.disconnect(); observer = null; }
    matcher = null;
    clearQueue();
  }

  BK.observe = { start: start, stop: stop };
})(typeof window !== "undefined" ? window : this);
