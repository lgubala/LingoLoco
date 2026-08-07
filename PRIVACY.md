# Privacy Policy for Lingo Loco

_Last updated: 8 August 2026_

## The short version

Lingo Loco does not collect, store, transmit, or sell any personal data. There
is no server, no account, no analytics, and no tracking of any kind. Everything
the extension does happens on your own computer.

## What the extension stores

Lingo Loco saves the settings you create — your word lists, which list is
active, your schedule, your theme choice, the sites you've excluded, and the
emoji you've used recently.

This is kept using the browser's local extension storage
(`chrome.storage.local`), which lives on your device. It is never uploaded
anywhere. Uninstalling the extension removes it.

## What the extension does with web pages

Lingo Loco reads the text of pages you visit in order to replace words in them.
That reading happens entirely inside your browser, as the page is displayed. No
page content, URL, or browsing history is recorded, saved, or sent anywhere. The
extension has no code capable of transmitting it.

Text you type — into search boxes, comment fields, forms, or editors — is not
read or modified at all.

## Network activity

None. Lingo Loco makes no requests to any server. The single `fetch` call in the
source code loads the emoji list from a file inside the extension's own package,
the first time you open the emoji picker.

## Permissions, and why they exist

- **Storage** — to save your word lists on your device.
- **Active tab** — so the popup can show which site the current tab is on, which
  is how you exclude that site.
- **Access to website content** — the extension replaces words in the text of
  pages you visit, which is impossible without reading that text. It is used for
  nothing else.

## Third parties

There are none. No data is shared with, sold to, or processed by anyone. The
extension contains no third-party libraries, SDKs, trackers, or advertising.

## Data you choose to move yourself

The export feature writes your word lists to a file or your clipboard when you
ask it to. Where that copy goes afterwards is entirely up to you; the extension
plays no part in it.

## Children

Lingo Loco collects no data from anyone, of any age.

## Changes to this policy

If this ever changes, the updated policy will be published at this address and
the date above will change. Any version of the extension that collected data
would say so in its store listing before you installed it.

## Source code

Lingo Loco is open source under the MIT licence. Every claim above can be
checked by reading it: <repository URL>

## Contact

Questions or concerns: open an issue on the repository, or email
<supportpejko@gmail.com>.
