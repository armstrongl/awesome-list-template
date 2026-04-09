# Using This Template

This is a template repository for creating awesome lists. Follow these steps to create your own.

## Quick Start

1. Click **"Use this template"** button on GitHub
2. Name your repository `awesome-[topic]`
3. Clone your new repository locally
4. Follow the customization steps below
5. Delete this file when done

## Customization Steps

### 1. Run the Setup Script

```bash
npm run setup
```

The interactive wizard replaces all `YOUR_*` placeholders across every file. Or do it manually -- see `SETUP.md` for the full placeholder inventory.

### 2. Update README.md

- [ ] Rename section headings for your categories
- [ ] Replace example items with real items
- [ ] Update the TOC (runs automatically on push, or run `npm run toc`)

### 3. Update CONTRIBUTING.md

- [ ] Replace references to "this list" with your specific topic
- [ ] Add any topic-specific contribution requirements
- [ ] Update examples if needed

### 4. Configure Funding (Optional)

Edit `.github/FUNDING.yml` to enable GitHub Sponsors:

```yaml
github: [your-username]
```

### 5. Update Issue Templates

The issue templates in `.github/ISSUE_TEMPLATE/` have placeholder category options. Update `add-item.yml` to list your actual categories.

### 6. Final Steps

- [ ] Delete this `TEMPLATE_README.md` file
- [ ] Set GitHub topics: `awesome`, `awesome-list`, and any relevant topics (the setup script does this automatically if `gh` CLI is available, or set them manually in your repo's Settings → General → Topics)
- [ ] Make your first commit
- [ ] Enable GitHub Pages if desired
- [ ] Submit to [awesome](https://github.com/sindresorhus/awesome) when ready

## What's Included

| Feature                 | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| **Linting**             | markdownlint + Prettier checks on PRs                   |
| **Awesome-lint**        | Official awesome list validation                        |
| **Link checking**       | Weekly scan + PR checks for dead links                  |
| **Auto TOC**            | Table of contents generated on push                     |
| **Auto sort**           | Items sorted alphabetically on push                     |
| **Issue templates**     | Forms for adding, removing items and reporting issues   |
| **PR template**         | Checklist with attestation for contributors             |
| **Banner**              | Light/dark SVG banners with `<picture>` element         |
| **Badge row**           | CI, Track, License, and Last Commit badges              |
| **Legend**              | Emoji markers for paid, beta, stale, deprecated         |
| **Code of Conduct**     | Contributor Covenant v2.1                               |
| **Stale bot**           | Auto-closes inactive issues and PRs                     |
| **Welcome bot**         | Greets first-time contributors                          |
| **Staleness detection** | (Opt-in) Monthly GitHub repo health checks              |
| **Quality gates**       | (Opt-in) PR submission quality validation               |
| **Setup script**        | Interactive placeholder replacement wizard              |
| **GitHub topics**       | Auto-sets `awesome` and `awesome-list` topics via setup |

## Running Locally

```bash
# Install dependencies
npm install

# Run all checks
npm test

# Fix linting issues
npm run lint:fix

# Update TOC
npm run toc
```

## Submitting to Official Awesome

When your list is ready, review the [awesome list requirements](https://github.com/sindresorhus/awesome/blob/main/pull_request_template.md) and submit a PR to the main awesome repository.

---

**Remember to delete this file before your first release!**
