/* A rule: one word to find, one or more words to put in its place. */
(function (root) {
  "use strict";
  var BK = root.BK;

  function newId(prefix) {
    return (prefix || "r") + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* Accepts our own shape and the old Buzz Kill add-on's
     { target, replacements: [] }, so imported lists need no conversion. */
  function normalizeRule(raw) {
    if (!raw || typeof raw !== "object") return null;

    var from = typeof raw.from === "string" ? raw.from
      : (typeof raw.target === "string" ? raw.target : "");
    var to = raw.to !== undefined ? raw.to : raw.replacements;

    if (typeof to === "string") to = [to];
    if (!Array.isArray(to)) to = [];
    to = to.filter(function (v) { return typeof v === "string"; });
    if (!to.length) to = [""];

    return {
      id: raw.id || newId(),
      from: from,
      to: to,
      matchCase: !!raw.matchCase,
      wholeWord: raw.wholeWord !== false,
      enabled: raw.enabled !== false
    };
  }

  function normalizeRules(list) {
    return (Array.isArray(list) ? list : []).map(normalizeRule).filter(Boolean);
  }

  BK.rules = {
    newId: newId,
    normalize: normalizeRule,
    normalizeAll: normalizeRules
  };
})(typeof window !== "undefined" ? window : this);
