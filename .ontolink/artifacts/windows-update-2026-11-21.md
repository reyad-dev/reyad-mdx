# Windows update handoff

ReyadMDX 1.3.2 opens the GitHub setup download in the browser. The published setup's digest matched GitHub and Windows Authenticode reported NotSigned. Windows SmartScreen uses file and publisher reputation. Trusted Authenticode signing is proposed for future Windows release distribution, and the code change does not provide a publisher certificate.

The installed Windows app stages the stable-release setup from the fixed GitHub repository, verifies its published size and SHA-256, and requests Save, Discard, or Cancel for each dirty document. A stopped save or cancellation prevents installer launch. The installed current-user or all-users scope must match the running app's registered path. The detached NSIS updater waits for the initiating process; its upgrade path is sourced from the existing registry registration. Fresh setup still accepts a custom directory. Documents remain at their saved paths, and Electron continues to use the mdx-reader directory under appData.

All 22 Playwright checks passed on Windows. The native handoff regression uses a simulated installer launch, and a separate isolated real NSIS 1.3.2 to 1.3.3 test retained the exact legacy path, a Markdown file's digest, and the user profile's UI language. Installer builds and test probes are local. The production registry was inspected; the installed release was not replaced. All-users elevation and a published in-app update were not exercised. The first packaged app preference probe failed because Electron inherited ELECTRON_RUN_AS_NODE; retry without the variable passed.

The published 1.3.2 build still has the browser-based flow. Ship the updated Windows code in a later release for installed users to receive the new flow. No production asset was republished or signed.

## Source bytes

- MDX-Reader-Standalone.html SHA-256 d1b0048e44112c6e1b06bf1de8093d2e86f14066cee14df100b51be2190780ae
- app/app.js SHA-256 3a88516eceace05d3a9b0a555ca646d73dee41807ab46a040c04553a9bc37013
- app/updates.js SHA-256 5581de51053ef6a97910d8446d0d9ff0c265fe592de3f9fd0daf14474891e54f
- docs/index.html SHA-256 d1b0048e44112c6e1b06bf1de8093d2e86f14066cee14df100b51be2190780ae
- main.js SHA-256 26452ba81c018009abe0d3df9c9a5f31952589d523aef4e0c35376f6684d1ea0
- package.json SHA-256 77be895a1c103158d238a9b2bce9dbb0679af3486a37b248c1a31774d26882fe
- preload.js SHA-256 ad39af60739e1b2b4410b73ab13c40a63db9369b4f38fa79e06e474ee5f135d4
- tests/updates.spec.js SHA-256 b262c02610cfc3543527fc1f1c41cdc371b2e0c10127008d52edb8a2ec5663e6
- build/installer.nsh SHA-256 f90d3352d05a307edc8585835438e3347f55bbf7cb4b8b68761ab8bd9dc4e649
- windows-update.js SHA-256 dbf5c5e11285a1bb31a58cd47d2199a94d5c46025c1fed8bc59d6c4de1e98f64
