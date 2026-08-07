/* The emoji dataset: fetch, decode, index.

   emoji-data.json is generated from Unicode's emoji-test.txt and CLDR's
   annotations (see make_emoji_data.py). It is dictionary-encoded — every word
   appears once and rows reference it by index — which halves the file and lets
   searching scan a few thousand words instead of every row.

   It is fetched the first time someone opens the picker, not on page load:
   most popup sessions never touch it. */
(function (root) {
  "use strict";
  var LL = root.LL;

  var data = null;     // decoded dataset
  var loading = null;  // in-flight promise

  function decode(raw) {
    var words = raw.w.split(" ");
    var lower = words.map(function (w) { return w.toLowerCase(); });
    var rows = raw.e.split("\n");
    var count = rows.length;

    var chars = new Array(count);
    var nameIdx = new Array(count);
    var groupOf = new Uint8Array(count);
    var keyCount = new Uint8Array(count);
    var wordRows = new Array(words.length); // vocabulary index -> row indices

    function link(wordIndex, row) {
      var bucket = wordRows[wordIndex];
      if (!bucket) wordRows[wordIndex] = [row];
      else if (bucket[bucket.length - 1] !== row) bucket.push(row);
    }

    for (var i = 0; i < count; i++) {
      var parts = rows[i].split("|");
      chars[i] = parts[0];
      groupOf[i] = parseInt(parts[2], 36);

      var ids = parts[1].split(",");
      var name = new Array(ids.length);
      for (var n = 0; n < ids.length; n++) {
        name[n] = parseInt(ids[n], 36);
        link(name[n], i);
      }
      nameIdx[i] = name;

      if (parts[3]) {
        var keys = parts[3].split(",");
        keyCount[i] = Math.min(255, keys.length);
        for (var k = 0; k < keys.length; k++) link(parseInt(keys[k], 36), i);
      }
    }

    return {
      groups: raw.g,
      words: words,
      lower: lower,
      chars: chars,
      nameIdx: nameIdx,
      groupOf: groupOf,
      keyCount: keyCount,
      wordRows: wordRows,
      count: count
    };
  }

  function nameOf(row) {
    var ids = data.nameIdx[row];
    var out = data.words[ids[0]];
    for (var i = 1; i < ids.length; i++) out += " " + data.words[ids[i]];
    return out;
  }

  function load() {
    if (data) return Promise.resolve(data);
    if (loading) return loading;
    loading = fetch("../emoji-data.json")
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (raw) {
        data = decode(raw);
        loading = null;
        return data;
      })
      .catch(function (err) {
        loading = null;
        throw err;
      });
    return loading;
  }

  LL.emojiData = {
    load: load,
    decode: decode,
    nameOf: nameOf,
    current: function () { return data; }
  };
})(typeof window !== "undefined" ? window : this);
