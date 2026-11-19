# RTL price rendering and saved preview highlights

Arabic subscription prices retain their dollar signs and use bidi isolation around each amount. Inline math expressions and supported TeX symbols still render.

Users can select text in Preview or Split and apply yellow, green or pink highlighting. Removal and undo use the same document history as text edits. A versioned Markdown comment stores the selection so it travels with the document. The editor displays the document body, and HTML export includes the highlights. An anchor whose passage or surroundings can no longer be located reliably is left unapplied.

`npm test` passed 20 tests on Windows, including the Arabic pricing example and the highlight save, reopen, export, undo and removal flow. A smoke check of the packaged Electron renderer verified RTL prices, saving a highlight to disk and restoring it after reload. The installer and portable build were produced locally at the existing version, 1.3.1. Authenticode reported `NotSigned` for both. The evidence covers the local build and the packaged renderer. Installation and SmartScreen on a separately downloaded copy remain unverified.
