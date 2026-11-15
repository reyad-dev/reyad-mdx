# ReyadMDX 1.3.1 — Android fonts and independent documents

- **Android fonts fixed:** Cairo, Almarai and Tajawal now load from the bundled fonts, without downloads or internet. The selection applies to both editor and preview, including Arabic and bold text. Android offers the available fonts and system default.
- **New / Close document:** open a blank document or close the current one. Unsaved changes require confirmation before discarding. Closing an Android document clears its recovery draft, so restarting does not bring it back.
- **Windows document windows:** opening another file from Explorer or Open keeps the existing file intact and opens a separate window. New creates a blank window. Save, undo, file dialogs and close confirmations are independent for every window.
- **Reload protection:** each Windows window restores its own document and unsaved edits on reload. Previously consumed Android file/share actions are not replayed after Activity recreation.
- **Shortcuts:** Ctrl+N for New, Ctrl+W for Close document.

Upgrade using Version and updates in 1.3.0, or download the installer/portable EXE/APK here. Save your work before running the downloaded update.
