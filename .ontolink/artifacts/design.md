# Architecture and contracts

ReyadMDX 1.3.1, MIT, npm package reyad-mdx. Vanilla JS/CSS/HTML shared renderer/editor: app/app.js, app/markdown.js, app/styles.css, fonts.css, mobile.js, mobile.css. Windows: Electron 31 main.js + preload.js IPC bridge window.mdxNative. Android: Java WebView host under android/app/src/main, bridge app/android.js; SDK 35 and Java 17 in workflow. No backend/database dependency is declared.

Version source package.json -> scripts/sync-version.js -> app/version.js and Android versionCode. build-standalone.js generates MDX-Reader-Standalone.html and docs/index.html. Edit shared source, regenerate outputs; native host changes require native rebuild. Tests: Playwright browser + Electron; Android native script is separate. CI: test.yml, build.yml, android.yml, sync-web.yml. Stable update policy uses GitHub Releases and platform assets; installation is user initiated.

knowledge.owl is canonical semantic/task state. .ontolink/context.json is regenerated cache. Immutable records/proofs and linked artifacts retain SHA-256 provenance. Historical audit tasks accept faithful import of a changelog implementation claim; they do not certify all original functionality. Source code determines actual behavior. Only mediator writes state, with expected revision. New product work must use its actual lifecycle phase, not be hidden in monitoring.
