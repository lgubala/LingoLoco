/* Small form-control builders shared by the panels. */
(function (root) {
  "use strict";
  var BK = root.BK;

  function textField(value, placeholder, onInput) {
    var input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.placeholder = placeholder;
    input.spellcheck = false;
    input.autocomplete = "off";
    input.addEventListener("input", function () { onInput(input.value); });
    return input;
  }

  function checkCell(checked, title, onChange) {
    var cell = document.createElement("span");
    cell.className = "cell";
    var label = document.createElement("label");
    label.className = "check";
    label.title = title;
    var box = document.createElement("input");
    box.type = "checkbox";
    box.checked = checked;
    box.addEventListener("change", function () { onChange(box.checked); });
    label.appendChild(box);
    cell.appendChild(label);
    return cell;
  }

  /* An emoji trigger that also keeps the recently-used list up to date. */
  function emojiButton(input) {
    return BK.emoji.attach(input, {
      getRecents: function () { return BK.app.get().recentEmoji; },
      onPick: function (char) {
        var settings = BK.app.get();
        settings.recentEmoji = [char]
          .concat(settings.recentEmoji.filter(function (c) { return c !== char; }))
          .slice(0, 24);
        BK.app.save();
      }
    });
  }

  /* "pig, clown, 🤡" -> ["pig", "clown", "🤡"] */
  function parseVariants(text) {
    var out = text.split(",").map(function (v) { return v.trim(); }).filter(Boolean);
    return out.length ? out : [""];
  }

  BK.fields = {
    text: textField,
    check: checkCell,
    emojiButton: emojiButton,
    parseVariants: parseVariants
  };
})(typeof window !== "undefined" ? window : this);
