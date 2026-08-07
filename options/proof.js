/* The proof sheet: a sample paragraph run through the very same matcher the
   pages get, with the swaps marked up like a copy editor's corrections. */
(function (root) {
  "use strict";
  var BK = root.BK;
  var app = BK.app;

  var SAMPLE = "We're incredibly excited to announce a bold new chapter. By leveraging " +
    "best-in-class technology and a relentless focus on the customer journey, we're doubling " +
    "down on what matters most and unlocking real value at scale. This isn't just a product. " +
    "It's a movement.";

  var seed = 0;

  function render() {
    var text = app.el("specimen").value;
    var frag = document.createDocumentFragment();
    var matcher = BK.matcher.build(app.currentList().rules, { seed: seed });
    var changes = 0;

    if (matcher) {
      matcher.scan(text, function (chunk, swapped) {
        if (swapped === null || swapped === chunk) {
          frag.appendChild(document.createTextNode(chunk));
          return;
        }
        var del = document.createElement("del");
        del.textContent = chunk;
        var ins = document.createElement("ins");
        ins.textContent = swapped;
        frag.append(del, ins);
        changes++;
      });
    } else {
      frag.appendChild(document.createTextNode(text));
    }

    if (!changes) {
      var hint = document.createElement("p");
      hint.className = "tiny muted";
      hint.style.marginTop = "10px";
      hint.textContent = "No rule in " + app.currentList().name +
        " matches this text. Edit the sample above to try one out.";
      frag.appendChild(hint);
    }

    var proof = app.el("proof");
    proof.textContent = "";
    proof.appendChild(frag);
  }

  function wire() {
    app.el("specimen").value = SAMPLE;
    app.el("specimen").addEventListener("input", render);
    // A rule with several replacements settles on one per build; reroll shows
    // the others without waiting for a page load.
    app.el("reroll").addEventListener("click", function () {
      seed++;
      render();
    });
  }

  app.register("proof", render);
  BK.panels = BK.panels || {};
  BK.panels.proof = { wire: wire };
})(typeof window !== "undefined" ? window : this);
