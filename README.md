# Buzz Kill

**A Firefox add-on that rewrites the web in your words.**

Everything online is written from the same small dictionary. Launch posts, press
releases, headlines, the copy on every product page — the words arrive
pre-chewed and sanded smooth, and after a while it all reads like one enormous
announcement written by nobody.

Buzz Kill sits between the page and your eyes and swaps the words you're tired
of for words of your own. Tell it `synergy → hot air` and every headline, tweet
and comment you scroll past for the rest of your life says *hot air*.

It runs entirely inside your browser. No servers, no accounts, no analytics,
nothing about what you read leaves your machine — the whole add-on is about
150 KB of plain JavaScript with no dependencies, and you can read all of it.

---

## Install

**From a build**

1. Run `./build.sh` (or download `buzzkill.zip` from a release)
2. Open `about:debugging#/runtime/this-firefox`
3. **Load Temporary Add-on…** → pick `dist/unpacked/manifest.json`

Temporary add-ons are cleared when Firefox restarts. For a permanent install the
package has to be signed: upload `dist/buzzkill.zip` at
[addons.mozilla.org/developers](https://addons.mozilla.org/developers/) and
choose "On your own" distribution to get a signed `.xpi` back. Firefox Developer
Edition and Nightly can install unsigned add-ons after setting
`xpinstall.signatures.required` to `false` in `about:config`.

If nothing gets replaced after installing, open the add-on's toolbar menu and
allow it to run on all sites.

---

## Using it

### Your first swap

Click the toolbar icon, type the word you're sick of, type what you'd rather
read, press **Add rule**. Reload a page and it's done.

The popup is for quick additions. Everything else — lists, scheduling, sharing —
lives one click away in **All settings**, and the popup links straight to each
part of it.

### How matching works

- **Capitalisation follows the page.** One rule covers all of it: `synergy → hot air`
  turns *Synergy* into *Hot air* and *SYNERGY* into *HOT AIR*. Tick **Aa** on a
  rule if you want only the exact casing you typed.
- **Whole words by default,** so a rule for `cat` leaves *concatenate* alone.
  Untick **Whole** to match inside longer words too.
- **Phrases work, and the longer rule wins.** With both `thought leader → blogger`
  and `leader → boss`, a thought leader becomes a blogger, not a "blogger boss".
- **Several replacements, comma-separated.** `synergy → hot air, word salad, 💨`
  picks one per page, so the joke doesn't wear out. A page stays consistent with
  itself; reload for a different roll.
- **An empty replacement deletes the word** instead of swapping it.

Your own typing is never touched. Search boxes, comment fields, code blocks and
rich-text editors keep the real word, so you can still look things up and write
normally. Tooltips, image alt text and the tab title do get rewritten.

Adding a rule takes effect immediately, including on content that loads as you
scroll. Editing or deleting one needs a page reload — by then the original word
is already gone from the page.

### The proof sheet

The options page shows a sample paragraph being rewritten live, with the old
word struck through in rust and yours in blue. It runs the very same engine the
pages do, so paste real text in to try a rule before letting it loose. **Reroll**
cycles through the alternatives when a rule has several.

### Lists

Rules live in named lists. Two come set up — **SFW** and **NSFW** — so
`synergy → hot air` can sit in one while something less printable sits in the
other. Switch between them from the popup; add, rename and delete them on the
options page. Two is just the starting point: a list per site, per mood, per
project all work.

### Switching by the clock

Turn on **Switch by the clock**, pick the days, an hour range, and which list
applies inside it and outside it. Office vocabulary Monday to Friday, anything
you like in the evening. The window may wrap past midnight, so 20:00–06:00 is
fine. Which list is live is worked out from your local time each time a page
loads — no background process, nothing running while you aren't browsing — so
the changeover reaches a tab the next time it loads.

### Sharing lists

This is the part worth telling people about: a good list is work, and it travels.

**Exporting.** Tick the lists you want — one, some, or all. They go into a
*single* file or a single clipboard blob, each keeping its name, so handing
someone your whole setup is one file rather than one per list.

**Importing.** Open a file or paste into the box and nothing happens yet. Buzz
Kill shows you what's inside first — every list it found, how many rules each
has, and what would happen to it — and you untick anything you don't want. Then
pick where it lands:

- **Add as new lists** — kept separate. A name you already use gets a number, so
  an imported *SFW* becomes *SFW 2* rather than quietly replacing yours.
- **Merge into lists with the same name** — their *NSFW* joins your *NSFW*;
  anything unmatched arrives as a new list.
- **Merge all into this list** — everything into the one you're looking at.

Merging never overwrites. A word you both have keeps your replacements and gains
theirs, so `synergy → hot air` merged with `synergy → word salad` becomes
`synergy → hot air, word salad`. Nothing is written until you press **Import**.

### Emoji

The 🙂 button beside any replacement field opens the full Unicode set, searchable
by everyday word rather than the official name — *poop*, *lol*, *idk* and *money*
all find what you'd expect, because the keywords come from CLDR, the same data
behind your phone's emoji keyboard. Recently used ones sit at the top. `disrupt → 💥`
reads exactly as well as a word does.

### Leaving sites alone

Add a domain under **Sites left alone** — or flip the switch in the popup while
you're on it — and Buzz Kill skips it. Subdomains go with it, so skipping
`example.com` also skips `mail.example.com`. Useful for anywhere you need the
real words: your bank, your work tools, documentation.

---

## Permissions, and what it does with them

| Permission | Why |
| --- | --- |
| `storage` | keeping your lists on your machine |
| `activeTab` | so the popup can tell you which site you're on |
| `<all_urls>` | it can only replace words on pages it's allowed to read |

There is no network code in this add-on. The one `fetch` call in the source
loads the emoji list from inside the extension's own package, the first time you
open the picker. Nothing else is fetched, and nothing is sent anywhere.

Your settings live in `storage.local`, on your machine only. Use export if you
want them somewhere else.

---

## The file format

```json
{
  "buzzkill": 2,
  "exported": "2026-08-06",
  "lists": [
    {
      "name": "Corporate",
      "rules": [
        { "from": "synergy", "to": ["hot air", "💨"], "matchCase": false, "wholeWord": true }
      ]
    }
  ]
}
```

Simpler shapes are read too, so nothing is stranded: a single `{ name, rules }`
list, a bare array of rules, the older add-on's
`[{ "target": "crypto", "replacements": ["magic beans"] }]`, and a raw dump of
its storage (`{ "SFW": { "replacements": [...] } }`), which arrives as one named
list per key.

---

## Development

```bash
npm install     # jsdom, for the tests — the add-on itself has no dependencies
npm test        # builds, then runs all five suites
./build.sh      # dist/unpacked to load, dist/buzzkill.zip to sign
```

The only build step is stitching HTML partials together: a line reading
`<!-- include: parts/foo.html -->` is replaced by that file. Everything else is
copied as-is — no bundler, no minifier, nothing for a reviewer to un-mangle.

```
src/
  core/        namespace, rules, settings, schedule, matcher, sites, share
  content/     skip, rewrite, observe, main
  emoji/       dataset, search, picker, field
  ui/          tokens, base, controls, marks, lists, emoji   (shared CSS)
  popup/       app, status, lists, site, rules, main + parts/*.html
  options/     app, fields, lists, rules, proof, schedule, share, sites, tips,
               main + parts/*.html and one stylesheet per panel
test/          five suites, plain Node, no framework
```

`core/` is loaded everywhere; `core/share.js` is the exception, loaded only by
the options page, since the content script runs in every frame of every page and
has no use for import and export.

Two things worth knowing before you change the engine:

- The options preview and the page rewriter both call `BK.matcher.build()`, so
  the proof sheet is not an approximation — it is the same code.
- The compiled regex is deliberately never handed out. A `/g` regex carries its
  own cursor, and `replaceIn()` resets it, so iterating with one while calling
  `replaceIn()` inside the loop restarts the scan forever. Use `matcher.scan()`
  to walk matches and `matcher.replaceIn()` to rewrite a string.

`CONTRIBUTING.md` has the rest.

---

## Credits

Emoji names and search keywords come from
[Unicode CLDR](https://github.com/unicode-org/cldr-json) and the Unicode emoji
data files, used under the [Unicode licence](https://www.unicode.org/license.txt).

## Licence

MIT — see [LICENSE](LICENSE).
