# Setup Guide

This guide walks you through creating your own awesome list from this template.

## Prerequisites

- Node.js 20+ and npm
- Git

## Quick Start

### 1. Create from template

Click "Use this template" on GitHub, or clone manually:

```bash
git clone https://github.com/armstrongl/awesome-list-template my-awesome-list
cd my-awesome-list
rm -rf .git && git init
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the setup script

The interactive wizard replaces all `YOUR_*` placeholders across every file:

```bash
npm run setup
```

Or replace them manually -- see the placeholder inventory below.

### 4. Customize your list

Search for `YOUR_` across the project and replace each placeholder with your values:

| Placeholder             | Meaning                             | Files                                                                                               |
| ----------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `YOUR_TOPIC`            | The list's topic (e.g., "Docker")   | `README.md`, `package.json`, `CONTRIBUTING.md`, `assets/banner-light.svg`, `assets/banner-dark.svg` |
| `YOUR_LIST_DESCRIPTION` | One-line description of the list    | `README.md`, `package.json`                                                                         |
| `YOUR_CATEGORY_1`       | First section/category name         | `README.md`, `.github/ISSUE_TEMPLATE/add-item.yml`, `.github/ISSUE_TEMPLATE/category-change.yml`    |
| `YOUR_CATEGORY_2`       | Second section/category name        | `README.md`, `.github/ISSUE_TEMPLATE/add-item.yml`, `.github/ISSUE_TEMPLATE/category-change.yml`    |
| `YOUR_GITHUB_USERNAME`  | Your GitHub username or org         | Lint badge URL in `README.md`, `.github/ISSUE_TEMPLATE/config.yml`                                  |
| `YOUR_REPO_NAME`        | Your repository name                | Lint badge URL in `README.md`, `.github/ISSUE_TEMPLATE/config.yml`                                  |
| `YOUR_EMAIL`            | Contact email (for Code of Conduct) | `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`                                                             |

Add more categories by duplicating the section pattern in `README.md` and adding matching dropdown options in `.github/ISSUE_TEMPLATE/add-item.yml`.

### 5. Validate your changes

```bash
npm test
```

This runs markdownlint, Prettier format check, and awesome-lint validation.

### 6. Commit and push

```bash
git add .
git commit -m "chore: initialize awesome list"
git push -u origin main
```

## Available Commands

| Command                | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `npm run setup`        | Interactive placeholder replacement wizard      |
| `npm test`             | Run all validation (lint, format, awesome-lint) |
| `npm run lint`         | Check markdown formatting                       |
| `npm run lint:fix`     | Auto-fix markdown issues                        |
| `npm run format`       | Check Prettier formatting                       |
| `npm run format:fix`   | Auto-fix Prettier issues                        |
| `npm run fix`          | Auto-fix all issues (lint + format)             |
| `npm run fix:all`      | Auto-fix all issues + regenerate TOC            |
| `npm run toc`          | Regenerate table of contents                    |
| `npm run awesome-lint` | Check awesome list compliance                   |

## Claude Code Commands

If you use Claude Code, these commands are available:

| Command             | Description                         |
| ------------------- | ----------------------------------- |
| `/awesome:add`      | Add items (batch or conversational) |
| `/awesome:validate` | Check formatting compliance         |
| `/awesome:fix`      | Auto-fix formatting issues          |
| `/awesome:audit`    | Full maintenance audit              |
| `/awesome:discover` | Research new items to add           |
| `/awesome:new`      | Scaffold a new awesome list         |

## Automated Workflows

GitHub Actions handle ongoing maintenance:

### Core Workflows

- **validate.yml** -- Runs on every push/PR to check formatting (markdownlint, Prettier, awesome-lint)
- **auto-format.yml** -- Sorts items alphabetically and updates TOC on push to main
- **link-check.yml** -- Weekly dead link detection with auto-issue creation

### Community Workflows

- **stale.yml** -- Marks inactive issues/PRs as stale after 60 days, closes after 7 more days
- **welcome.yml** -- Welcomes first-time contributors on their first issue, PR, or merge

### Opt-in Workflows

These workflows ship disabled. Enable them when your list is ready.

- **staleness-check.yml** -- (Opt-in) Monthly GitHub repo staleness detection; checks whether linked repositories are still maintained
- **pr-quality-check.yml** -- (Opt-in) Quality checks on PR submissions; validates item format, description length, and link health
- **pr-comment.yml** -- Posts quality check results as PR comments

## When to Enable Opt-in Features

- **Quality gates** (uncomment trigger in `pr-quality-check.yml`): Recommended when you have 50+ items and receive regular external contributions.
- **Staleness detection** (uncomment schedule in `staleness-check.yml`): Recommended when you have 100+ items, mostly GitHub repos.

## What to Delete If You Don't Need It

These files are optional. Remove anything that does not fit your workflow:

| File                                                                          | When to delete                                                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `CODE_OF_CONDUCT.md`                                                          | If you have your own Code of Conduct                                              |
| `.github/workflows/stale.yml`                                                 | If you don't want automatic stale management                                      |
| `.github/workflows/welcome.yml`                                               | If you don't want welcome messages                                                |
| `.github/workflows/staleness-check.yml`                                       | If you don't need staleness detection                                             |
| `.github/workflows/pr-quality-check.yml` + `.github/workflows/pr-comment.yml` | If you don't need quality gates                                                   |
| `## Legend` section in `README.md`                                            | If you don't use shields.io legend badges                                         |
| `assets/banner-light.svg` + `assets/banner-dark.svg`                          | If you don't want a banner (also remove the `<picture>` element from `README.md`) |

## List Item Format

All items must follow this format:

```markdown
- [Item Name](https://url.com) - Description ending with punctuation.
```

Requirements:

- Space-dash-space between URL and description
- Description ends with period, exclamation, or question mark
- One sentence descriptions
- Items are auto-sorted alphabetically

### Section Descriptions

Each section can have an italicized description:

```markdown
## Section Name

_Brief description of this section._

- [Item](https://example.com) - Description.
```

**Important**: Never place a plain-text paragraph immediately after an italicized section description. The next element after the description must be a list. This avoids `no-emphasis-as-heading` lint violations.

## Troubleshooting

### awesome-lint fails with "No awesome badge"

Ensure your README.md has this badge at the top:

```markdown
[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
```

### awesome-lint fails with "Contributing in TOC"

The automation removes "Contributing" from the TOC automatically. If running locally, regenerate the TOC:

```bash
npm run toc
```

### Validation passes locally but fails in CI

Check for:

- Relative URLs that work locally but not on GitHub
- Files not committed to git
- Different Node.js versions (CI uses Node 20)

## Next Steps

1. Add your first items to the list
2. Set up GitHub repository settings (branch protection, etc.)
3. Submit your list to [awesome](https://github.com/sindresorhus/awesome) when ready

## Submitting to sindresorhus/awesome

When your list is mature enough for the official awesome collection, review the full
[submission requirements](https://github.com/sindresorhus/awesome/blob/main/pull_request_template.md).
Key requirements that catch people off guard:

- [ ] Your list has been around for **at least 30 days** (from first real commit or open-source date)
- [ ] Your entry URL must end in `#readme` (e.g., `https://github.com/user/awesome-topic#readme`)
- [ ] No CI badges in the README (the template removes this by default)
- [ ] GitHub topics `awesome` and `awesome-list` are set on your repo
- [ ] You must **review at least 4 other open pull requests** before submitting
- [ ] Your PR title must be `Add Name of List` (not "Add Awesome Name of List")
- [ ] The list must not be AI-generated
- [ ] The description in your entry should describe the project/theme, not the list itself
