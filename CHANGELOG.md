# Changelog

All notable changes to ReyadMDX are documented here. This project follows [Semantic Versioning](https://semver.org/).

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

[1.1.1]: https://github.com/reyad-dev/mdx-reader/releases/tag/v1.1.1
[1.1.0]: https://github.com/mmagdym1/mdx-reader/releases/tag/v1.1.0


[1.2.0]: https://github.com/reyad-dev/reyad-mdx/releases/tag/v1.2.0
[1.2.1]: https://github.com/reyad-dev/reyad-mdx/releases/tag/v1.2.1
