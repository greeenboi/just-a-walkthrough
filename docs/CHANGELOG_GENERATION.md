# Changelog Generation

This repository includes an automated changelog generation system that creates and maintains a CHANGELOG.md file based on package.json versions and git commit history.

## How it works

The changelog generator (`scripts/generate-changelog.js`) automatically:

1. Reads the current version from `package.json`
2. Analyzes git commits since the last tag (or all commits if no tags exist)
3. Categorizes commits based on keywords in commit messages
4. Generates a properly formatted changelog entry following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format

## Commit Message Categorization

The script automatically categorizes commits into the following sections:

- **Added**: Commits containing "add", "new", or "feat"
- **Fixed**: Commits containing "fix" or "bug"
- **Changed**: Commits containing "change", "update", or "modify"
- **Removed**: Commits containing "remove" or "delete"
- **Deprecated**: Commits containing "deprecat"
- **Security**: Commits containing "security" or "vulnerabilit"
- **Other**: All other commits

## Usage

### Generate changelog for current version

```bash
npm run changelog
```

### Manual usage

```bash
node scripts/generate-changelog.js generate
```

### Help

```bash
node scripts/generate-changelog.js --help
```

## Workflow Integration

The changelog generation is designed to fit into the standard npm publishing workflow:

1. Make your changes and commit them with descriptive messages
2. Bump the version: `npm version patch|minor|major`
3. Generate the changelog: `npm run changelog`
4. Review and edit the generated changelog if needed
5. Commit the changelog updates
6. Push and publish: `git push && git push --tags && npm publish`

## Manual Editing

The generated changelog entries are designed to be a starting point. You can always manually edit the CHANGELOG.md file to:

- Add more detailed descriptions
- Reorganize items
- Add breaking change notices
- Include additional context or links

## Example Output

```markdown
## [1.2.0] - 2024-09-14

### Added
- New feature for user authentication
- Support for custom themes

### Fixed
- Bug in navigation component
- Memory leak in event handlers

### Changed
- Updated dependency versions
- Improved error messages
```