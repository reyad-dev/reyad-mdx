# Changelog

All notable changes to ReyadMDX are documented here. This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Installed Windows copies can verify and stage GitHub release installers, prompt to save edited documents, and update in the existing installation folder.

### Fixed

- Windows Setup lists ReyadMDX in Open with and Default apps for `.md`, `.markdown`, `.mdown`, `.mkd`, `.mdx`, and `.txt`. Upgrades refresh the file associations and preserve the user's selected defaults.

### العربية

- يظهر ReyadMDX في «فتح باستخدام» و«التطبيقات الافتراضية» لملفات Markdown والنص على ويندوز. يجدّد المثبّت التسجيل عند التحديث ويحافظ على اختيار المستخدم للتطبيق الافتراضي.
- يتحقق المحدّث من المثبّت ويتيح حفظ المستندات قبل التحديث في مجلد التثبيت الحالي.

## [1.3.2] - 2026-11-19

### Added

- Select text in Preview or Split to highlight it in yellow, green, or pink. Highlights travel with the Markdown file and appear in HTML exports. Select highlighted text again to recolor or remove it.

### Changed

- Sepia and the bundled Almarai font are the defaults on fresh installs and after restoring defaults. Previously saved appearance settings are preserved.

### Fixed

- Arabic preview keeps dollar prices together and avoids interpreting subscription prices as inline math.

### العربية

- سيبيا وخط المراعي هما الافتراضيين عند أول تشغيل أو استعادة الإعدادات.
- حدّد النص من المعاينة واختار لون التمييز، ثم احفظ المستند للاحتفاظ باللون.
- اتصلح عرض أسعار الدولار داخل النص العربي.

## [1.3.1] - 2026-11-15

### Fixed

- Android's font policy now permits the embedded font data. Cairo, Almarai and Tajawal load offline, and the selected font applies to the editor as well as the preview.
- Android lists available bundled fonts and the system default instead of unavailable desktop font families.
- New and Close document actions clear the current draft and undo history after confirming unsaved changes. Deliberately closed Android documents stay closed after restarting, and consumed file/share intents are not replayed on Activity recreation.
- Opening another Windows file creates a separate document window. Menus, file dialogs, save state, close prompts and undo state belong to their originating window.
- Desktop reloads preserve each window's own document and unsaved edits. A completed save for an old document cannot mark a newly opened draft saved.

Use Ctrl+N for New and Ctrl+W for Close document. The update panel is available starting in 1.3.0.

## [1.3.0] - 2026-11-15

### Added

- Visible version badge and bilingual Version and updates panel on Windows, Android, web and standalone HTML.
- Automatic startup checks for desktop and Android, plus manual checks against official stable GitHub Releases.
- Update notices with platform-specific installer, portable or APK downloads; installation remains user initiated.
- Offline, rate-limit, invalid-release and incomplete-upload handling without interrupting document editing.
- Shared release-policy and UI tests, including Electron IPC and mobile layouts.

### Changed

- Package metadata supplies the build version everywhere; Android version codes derive from it automatically.
- Release tags must match the package version. Windows release builds also attach the standalone HTML.
- Documented shared web changes versus native changes and how installed copies receive updates.

The first upgrade from an older version requires a manual download. Web and standalone users can check manually and open the latest web copy, or download the attached HTML for offline use.

## [1.2.1] - 2026-11-12

### Added

- Embedded local Arabic fonts: **Cairo** (كايرو), **Almarai** (المراعي), and **Tajawal** (تجوال) in WOFF2 format with zero external network dependencies and complete offline support across Windows, web, and Android.
- Support for normal (400) and bold (700) weights for all embedded Arabic fonts.
- Bilingual font labels in typography settings with automatic localization.
- Automated Playwright font test suite validating font loading, application to preview and editor, and settings persistence.

### Changed

- Standalone HTML, web viewer, and exported HTML files now embed font definitions locally, preventing CORS and file protocol restrictions.

## [1.2.0] - 2026-11-11

### Added

- Windows right-click menu with copy, cut, paste, select all, undo, and redo.
- Undo/redo toolbar buttons and editor history covering paste, typing, formatting, and indentation.
- One top/bottom navigation button, following the active editor or preview pane.
- Offline Android app with system file picker, save/save as, share targets, and file associations for all six supported extensions.
- Android draft recovery and file-picker recovery when the system recreates the app process.
- Automated browser/Electron checks and Android build/lint workflows.

### Changed

- Forced RTL is the default; existing settings migrate once and later direction choices persist.
- App title, Windows executable, shortcuts, package metadata, and download names now use ReyadMDX.
- TXT files are also registered by the Windows installer.
- Split view now synchronizes the textarea's actual scroll position.

On Android 8 or newer, choose ReyadMDX when opening a supported file from your file manager. If your file manager does not send a supported file type, use **Open** inside ReyadMDX. This release was originally validated with browser and Electron checks, Android build and lint, and an emulator smoke test covering file associations, UTF-8 documents, editing, undo/redo, scrolling, saving, and sharing.

## [1.1.1] - 2026-11-04

### Fixed

- Clicking a relative or scheme-less link no longer navigates the window away (black screen); links to other Markdown files open in the app, web links open in the browser.
- Only `http`, `https`, and `mailto` links are handed to the OS.
- Table rows split across blank lines (common when copying from chat apps with `<br><br>` in cells) are rejoined instead of breaking the table.
- Simple LaTeX symbols such as `$\leftarrow$` render as the actual symbol.

## [1.1.0] - 2026-10-12

### Added

- Smart per-block Arabic/Latin direction detection.
- Bidi isolation for inline code, links, and numeric fragments.
- Separate interface-language and document-direction controls.
- Preview, synchronized split, and editor modes.
- Dark, midnight, light, and sepia themes.
- GFM tables, tasks, GitHub callouts, footnotes, reference links, and front matter.
- Arabic search normalization, generated outline, autosave, HTML export, and print/PDF.
- Windows installer, portable build, file associations, standalone browser version, and GitHub Pages output.

The Windows installer can associate Markdown files with the app. The portable EXE and standalone HTML run without installation.

[1.1.1]: https://github.com/reyad-dev/mdx-reader/releases/tag/v1.1.1
[1.1.0]: https://github.com/mmagdym1/mdx-reader/releases/tag/v1.1.0


[1.2.0]: https://github.com/reyad-dev/reyad-mdx/releases/tag/v1.2.0
[1.2.1]: https://github.com/reyad-dev/reyad-mdx/releases/tag/v1.2.1
[1.3.0]: https://github.com/reyad-dev/reyad-mdx/releases/tag/v1.3.0
[1.3.1]: https://github.com/reyad-dev/reyad-mdx/releases/tag/v1.3.1
[1.3.2]: https://github.com/reyad-dev/reyad-mdx/releases/tag/v1.3.2
