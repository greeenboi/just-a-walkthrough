# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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