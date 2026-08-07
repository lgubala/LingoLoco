/* Wiring the picker to a text field. */
(function (root) {
  "use strict";
  var LL = root.LL;

  /* Inserts at the caret so people can build "hot air 💨" without retyping. */
  function insertInto(input, char) {
    var start = input.selectionStart;
    var end = input.selectionEnd;
    if (typeof start === "number" && typeof end === "number") {
      input.value = input.value.slice(0, start) + char + input.value.slice(end);
      input.selectionStart = input.selectionEnd = start + char.length;
    } else {
      input.value += char;
    }
    input.focus();
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  /* Builds a trigger button for an input. Cheap: no data touched until click. */
  function attach(input, options) {
    options = options || {};
    var button = document.createElement("button");
    button.type = "button";
    button.className = "emoji-trigger";
    button.title = "Insert an emoji";
    button.setAttribute("aria-label", "Insert an emoji");
    button.textContent = "\uD83D\uDE42";
    button.addEventListener("click", function () {
      LL.emojiPicker.open(button, {
        recents: options.getRecents ? options.getRecents() : [],
        onPick: function (char) {
          insertInto(input, char);
          if (options.onPick) options.onPick(char);
        }
      });
    });
    return button;
  }

  LL.emoji = { attach: attach, insertInto: insertInto };
})(typeof window !== "undefined" ? window : this);
