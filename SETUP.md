# Setup Guide

This guide walks you through creating your own awesome list from this template.

## Prerequisites

- Node.js 18+ and npm
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

### 3. Customize your list

Update these files with your topic:

| File                                  | What to change                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `README.md`                           | Replace "Topic" with your subject, update badge URL, write description, define sections |
| `package.json`                        | Update `name` field to match your repo                                                  |
| `.github/ISSUE_TEMPLATE/add-item.yml` | Update category dropdown options to match your sections                                 |
| `CONTRIBUTING.md`                     | Update repository references                                                            |

### 4. Validate your changes

```bash
npm test
```

This runs markdownlint, Prettier format check, and awesome-lint validation.

### 5. Commit and push

```bash
git add .
git commit -m "chore: initialize awesome list"
git push -u origin main
```

## Available Commands

| Command                | Description                                     |
| ---------------------- | ----------------------------------------------- |
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

- **validate.yml** - Runs on every push/PR to check formatting
- **auto-format.yml** - Sorts items alphabetically and updates TOC on push to main
- **link-check.yml** - Weekly dead link detection with auto-issue creation

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
