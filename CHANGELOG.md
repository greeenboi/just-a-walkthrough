# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2025-09-15

### Added

- feat: implement unified walkthrough orchestration and cross-page tour functionality refactor: enhance component structure for walkthrough integration fix: update tour data attributes for improved accessibility delete: remove outdated tours module in favor of new orchestration approach
- feat: integrate guided tour functionality using just-a-walkthrough library
- test: add unit tests for debug module, dev panel, orchestrator branches, and route orchestrator feat: enhance walkthrough functionality with debug recording and DOM checks
- chore: add @types/jsdom as a dependency for improved type definitions
- fix: add runtime guard for SSR and non-DOM environments in Walkthrough class
- chore: update test scripts and add coverage support
- Add coverage directory to .gitignore to exclude vitest coverage files
- Add README.md for Next.js Dashboard Walkthrough integration details
- Add HTML content sanitization details to README.md for security awareness
- Add tests for walkthrough content sanitization
- Add automated changelog generation system based on package.json versions (#4)
- Add walkthrough integration example to README.md for onboarding flows
- Add VSCode extensions recommendations
- Add Contributor Covenant Code of Conduct
- Add Bearer workflow for code scanning
- Add GNU Affero General Public License v3

### Changed

- Update vitest configuration to include coverage exclusion and adjust reporters for GitHub Actions
- Update README.md to clarify enhancements section as historical
- Change Dependabot update interval from weekly to monthly
- Update README and package.json for improved documentation and repository links
- Update package.json to include repository details and keywords

### Deprecated

- deprecated nextjs example

### Fixed

- fix: refactor tests to improve cleanup and ensure proper unmounting of React components
- fix: update test and coverage scripts to use verbose reporter
- fix: update preload path in bunfig.toml to reference the correct test directory
- fix: update coverage configuration to include source files and exclude unnecessary directories
- Alert fix info logger message (#3)

### Security

- Implement HTML sanitization for walkthrough content to enhance security

### Other

- removed bloat pages
- removed redundant html example
- why was this still here?
- move unit tests to a relevant directory
- added vitest ci workflow
- Refactor code structure for improved readability and maintainability
- Refactor WalkthroughDevPanel to use effectivePathname for auto match logic
- added more relavant nextjs example
- Refactor code formatting in README.md for consistency and readability
- bump version to 0.1.1
- doesn't work with biome
- Create eslint.yml
- [ImgBot] Optimize images
- normalize repository.url
- Improve code readability and defensive checks in walkthrough logic and tests
- Refactor package.json and tsconfig.build.json for improved formatting and consistency
- Bump the npm_and_yarn group across 2 directories with 5 updates
- initial commit for package monorepo


## [0.1.0] - 2024-09-14

### Added
- Initial release of just-a-walkthrough library
- Framework-agnostic onboarding walkthrough/product tour functionality
- React provider and helpers for React integration
- Spotlight highlight with darkened backdrop (3-panel overlay + focus ring)
- Accessible keyboard navigation (Esc / Enter / ← →) with focus trap
- Auto scroll and responsive repositioning on scroll/resize/mutations
- Step hooks (`beforeStep` / `afterStep`) and lifecycle callbacks
- Tour chaining with persistence-aware skipping
- LocalStorage progress persistence and resume support
- Once-per-session logic via orchestrator helper
- Custom tooltip renderer with multiple themes (`default`, `tailwind`, `unstyled`)
- Vanilla DOM support (works with React, shadcn, portals)
- Debug utility for structured logging and diagnostics
- Route-based tour orchestrator with automatic matching
- Zero-dependency implementation with tree-shaking support

### Features
- Core walkthrough functionality with `startWalkthrough()` API
- `Walkthrough` class with methods: `start()`, `next()`, `prev()`, `finish()`, `skip()`, `destroy()`
- `WalkthroughChain` for chaining multiple tours
- Tour registration and auto-matching via `registerTours()` and `startAutoMatches()`
- Comprehensive TypeScript support with full type definitions
- Three theming options: default styling, Tailwind CSS integration, and unstyled
- Accessibility features including ARIA live regions and focus management
- Configurable polling intervals and wait times for element detection

### Documentation
- Comprehensive README with installation and usage examples
- API documentation for core functionality
- React integration examples
- Orchestrator usage patterns
- Development and publishing guidelines
- Accessibility notes and best practices

[unreleased]: https://github.com/greeenboi/just-a-walkthrough/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/greeenboi/just-a-walkthrough/releases/tag/v0.1.0