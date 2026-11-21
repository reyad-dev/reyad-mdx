# Agent Guide — ReyadMDX

## 📖 Project Overview
**ReyadMDX** is an offline Markdown viewer and editor with first-class Arabic and RTL support. It runs as a desktop Electron app and as a portable standalone single-file HTML app (`MDX-Reader-Standalone.html`), with an Android build option.

---

## 🏛️ Project Architecture
- `main.js`: Electron main process (window lifecycle, IPC handlers, app menu, update coordination).
- `preload.js`: Context isolation bridge exposing safe native APIs to the renderer.
- `app/`: Frontend application code:
  - `app/index.html`: Main desktop window UI.
  - `app/app.js`: Core renderer logic (editor, live preview, syntax highlighting, theme switching).
  - `app/styles.css`: UI styling with robust RTL / LTR layout rules.
  - `app/updates.js`: In-app update notifications and release staging logic.
- `MDX-Reader-Standalone.html`: Fully self-contained portable HTML version (zero install, runs in any browser).
- `windows-update.js`: Windows NSIS installer update helpers and staging verification.
- `scripts/`: Helper scripts for syncing version numbers and building the standalone bundle.
- `TODO.md`: Canonical project task list and roadmap. Always check and update this file when starting or completing work.
- `CHANGELOG.md`: Detailed history of changes across releases.

---

## 🛠️ Common Commands & Scripts
- `npm start`: Launch the desktop Electron application in development mode.
- `npm run standalone`: Rebuild and synchronize `MDX-Reader-Standalone.html` from the source components.
- `npm run dist`: Package the Windows installer executable (`dist/`).
- `npm run portable`: Package the portable Windows executable.
- `npm test`: Run automated tests.

---

## 📐 Development & Engineering Guidelines
1. **First-Class Arabic & RTL Support:**
   - Always ensure Bidirectional (Bidi) text isolation is preserved.
   - Prices with currency symbols (e.g. `$`, `LE`, `SAR`) must not flip direction awkwardly in Arabic paragraphs.
   - LaTeX math markers (`$`, `$$`) must not collide with currency symbols.
2. **Lean & Clean Codebase:**
   - The application relies on clean vanilla JavaScript and tested web components without heavy frameworks.
   - Do not introduce large unnecessary npm dependencies.
   - Keep `app/` clean: do not place non-renderer assets or development tools inside `app/` (since electron-builder packages the entire `app/**/*` directory).
3. **Task Tracking:**
   - Refer to [TODO.md](file:///c:/Users/I-SEVEN/Downloads/Vibe%20Coding/MDX%20Reader%20-%201ce34f1/TODO.md) for the active task and upcoming roadmap.
   - Mark completed items `[x]` upon verifying your changes.
