# ReyadMDX 1.3.2

Sepia and Almarai are the shared appearance defaults for first launch and settings reset. Existing saved theme and font choices remain effective. The build includes the RTL dollar-price rendering fix and saved colored highlights from Preview and Split. The generated standalone and web pages use the same source as the installed applications.

`CHANGELOG.md` is the public release history. It consolidates the material from five separate version notes. Git retains those files at the preceding revision. The original changelog imported into OntoLink is retained byte-for-byte for the historical line and hash references.

On Windows, 20 Playwright browser and Electron tests passed. Android Gradle built the debug APK and ran lint successfully. The installed debug APK on the Android emulator loaded the built-in normal and bold fonts, restored Sepia and Almarai through settings reset, displayed both subscription prices, and restored a saved highlight after restarting the native Activity. The same run exercised native file open, save, Save As, sharing, undo/redo and document reset.
