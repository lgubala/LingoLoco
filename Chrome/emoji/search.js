/* Ranking emoji for a query.

   Scores the vocabulary once (a few thousand words), not the rows, then walks
   the inverted index built at decode time. */
(function (root) {
  "use strict";
  var LL = root.LL;

  /* Scores words once (a few thousand), not rows, then walks the inverted
     index. A whole-word hit far outweighs a partial one, a hit in the emoji's
     own name counts double a hit in its keywords, and a name that *is* the
     query wins outright. So "fire" leads with 🔥 rather than everything whose
     name merely contains the word, and "lol" finds 😂 rather than 🍭. */
  function search(data, query) {
    var terms = query.split(/\s+/).filter(Boolean);
    var totals = null;

    for (var t = 0; t < terms.length; t++) {
      var term = terms[t];
      var round = new Map();

      for (var w = 0; w < data.lower.length; w++) {
        var word = data.lower[w];
        var at = word.indexOf(term);
        if (at === -1) continue;
        var base = word.length === term.length ? 6 : (at === 0 ? 2 : 1);
        var bucket = data.wordRows[w];
        if (!bucket) continue;
        for (var b = 0; b < bucket.length; b++) {
          var row = bucket[b];
          var score = base * (data.nameIdx[row].indexOf(w) === -1 ? 1 : 2);
          var best = round.get(row);
          if (best === undefined || score > best) round.set(row, score);
        }
      }

      if (totals === null) {
        totals = round;
      } else {
        var next = new Map();
        round.forEach(function (score, row) {
          var carried = totals.get(row);
          if (carried !== undefined) next.set(row, carried + score);
        });
        totals = next;
      }
      if (!totals.size) break;
    }

    if (!totals || !totals.size) return [];

    var hits = Array.from(totals.keys());
    var rank = new Map();
    hits.forEach(function (row) {
      var name = LL.emojiData.nameOf(row).toLowerCase();
      var score = totals.get(row);
      if (name === query) score += 100;
      else if (name.indexOf(query + " ") === 0) score += 10;
      // Widely used emoji collect more CLDR keywords, which makes keyword
      // count a decent stand-in for popularity when scores are otherwise tied.
      score += data.keyCount[row] * 0.05;
      rank.set(row, score);
    });

    hits.sort(function (a, b) {
      var diff = rank.get(b) - rank.get(a);
      return diff || a - b; // ties keep Unicode order
    });
    return hits;
  }

  LL.emojiSearch = search;
})(typeof window !== "undefined" ? window : this);
