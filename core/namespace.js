/* Buzz Kill - the single global every module hangs off.
   Loaded first everywhere; every other file adds one property to it. */
(function (root) {
  "use strict";
  root.BK = root.BK || { SCHEMA: 2 };
})(typeof window !== "undefined" ? window : this);
