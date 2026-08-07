/* Lingo Loco - the single global every module hangs off.
   Loaded first everywhere; every other file adds one property to it. */
(function (root) {
  "use strict";
  root.LL = root.LL || { SCHEMA: 2 };
})(typeof window !== "undefined" ? window : this);
