#!/usr/bin/env node

/**
 * Changelog Generator
 * 
 * Generates and updates CHANGELOG.md based on package.json version and git history.
 * Follows Keep a Changelog format with semantic versioning.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CHANGELOG_PATH = 'CHANGELOG.md';
const PACKAGE_PATH = 'package.json';

/**
 * Get the current version from package.json
 */
function getCurrentVersion() {
    try {
        const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
        return packageJson.version;
    } catch (error) {
        console.error('Error reading package.json:', error.message);
        process.exit(1);
    }
}

/**
 * Get git commit messages since last tag or from beginning
 */
function getCommitsSinceLastTag() {
    try {
        // Try to get the last tag
        let lastTag;
        try {
            lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
        } catch {
            // No tags found, get all commits
            lastTag = null;
        }

        const gitCommand = lastTag 
            ? `git log ${lastTag}..HEAD --oneline --no-merges`
            : 'git log --oneline --no-merges';
        
        const commits = execSync(gitCommand, { encoding: 'utf8' }).trim();
        return commits ? commits.split('\n').filter(line => line.trim()) : [];
    } catch (error) {
        console.error('Error getting git commits:', error.message);
        return [];
    }
}

/**
 * Parse commit messages and categorize them
 */
function categorizeCommits(commits) {
    const categories = {
        added: [],
        changed: [],
        deprecated: [],
        removed: [],
        fixed: [],
        security: [],
        other: []
    };

    commits.forEach(commit => {
        const message = commit.replace(/^[a-f0-9]+\s+/, ''); // Remove hash
        const lowerMessage = message.toLowerCase();

        if (/\b(add|new|feat)\b/.test(lowerMessage)) {
            categories.added.push(message);
        } else if (/\b(fix|bug)\b/.test(lowerMessage)) {
            categories.fixed.push(message);
        } else if (/\b(remove|delete)\b/.test(lowerMessage)) {
            categories.removed.push(message);
        } else if (/\b(change|update|modify)\b/.test(lowerMessage)) {
            categories.changed.push(message);
        } else if (/\bdeprecat\w*\b/.test(lowerMessage)) {
            categories.deprecated.push(message);
        } else if (/\b(security|vulnerabilit\w*)\b/.test(lowerMessage)) {
            categories.security.push(message);
        } else {
            categories.other.push(message);
        }
    });

    return categories;
}

/**
 * Generate changelog section for a version
 */
function generateVersionSection(version, date, categories) {
    let section = `## [${version}] - ${date}\n\n`;
    
    const sectionMap = {
        added: 'Added',
        changed: 'Changed',
        deprecated: 'Deprecated',
        removed: 'Removed',
        fixed: 'Fixed',
        security: 'Security'
    };

    Object.entries(sectionMap).forEach(([key, title]) => {
        if (categories[key].length > 0) {
            section += `### ${title}\n\n`;
            categories[key].forEach(item => {
                section += `- ${item}\n`;
            });
            section += '\n';
        }
    });

    // Add other commits if any
    if (categories.other.length > 0) {
        section += '### Other\n\n';
        categories.other.forEach(item => {
            section += `- ${item}\n`;
        });
        section += '\n';
    }

    return section;
}

/**
 * Read existing changelog or create header
 */
function getChangelogHeader() {
    return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

`;
}

/**
 * Update or create changelog
 */
function updateChangelog(version, newSection) {
    let content = '';
    
    if (fs.existsSync(CHANGELOG_PATH)) {
        content = fs.readFileSync(CHANGELOG_PATH, 'utf8');
        
        // Check if version already exists
        if (content.includes(`## [${version}]`)) {
            console.log(`Version ${version} already exists in changelog.`);
            return;
        }
        
        // Insert new section after [Unreleased]
        const unreleasedIndex = content.indexOf('## [Unreleased]');
        if (unreleasedIndex !== -1) {
            const insertIndex = content.indexOf('\n', unreleasedIndex + '## [Unreleased]'.length) + 1;
            content = content.slice(0, insertIndex) + '\n' + newSection + content.slice(insertIndex);
        } else {
            // Fallback: add after header
            content = getChangelogHeader() + newSection + content;
        }
    } else {
        content = getChangelogHeader() + newSection;
    }
    
    fs.writeFileSync(CHANGELOG_PATH, content);
    console.log(`Updated ${CHANGELOG_PATH} with version ${version}`);
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === '--help' || command === '-h') {
        console.log(`
Changelog Generator

Usage:
  node scripts/generate-changelog.js [command]

Commands:
  generate    Generate changelog entry for current package.json version
  --help, -h  Show this help message

Examples:
  node scripts/generate-changelog.js generate
        `);
        return;
    }

    if (command === 'generate' || !command) {
        const version = getCurrentVersion();
        const commits = getCommitsSinceLastTag();
        
        if (commits.length === 0) {
            console.log('No new commits found since last tag.');
            return;
        }
        
        const categories = categorizeCommits(commits);
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const newSection = generateVersionSection(version, date, categories);
        
        updateChangelog(version, newSection);
    } else {
        console.error(`Unknown command: ${command}`);
        console.log('Use --help for usage information.');
        process.exit(1);
    }
}

// Run the script
main();