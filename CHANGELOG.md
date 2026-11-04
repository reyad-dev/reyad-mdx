# Changelog

All notable changes to MDX Reader are documented here. This project follows [Semantic Versioning](https://semver.org/).

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

