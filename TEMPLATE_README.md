# Using This Template

This is a template repository for creating awesome lists. Follow these steps to create your own.

## Quick Start

1. Click **"Use this template"** button on GitHub
2. Name your repository `awesome-[topic]`
3. Clone your new repository locally
4. Follow the customization steps below
5. Delete this file when done

## Customization Steps

### 1. Update README.md

- [ ] Replace `Awesome Topic` with `Awesome [Your Topic]`
- [ ] Update the description paragraph
- [ ] Rename section headings for your categories
- [ ] Replace example items with real items
- [ ] Update the TOC (runs automatically on push, or run `npm run toc`)

### 2. Update CONTRIBUTING.md

- [ ] Replace references to "this list" with your specific topic
- [ ] Add any topic-specific contribution requirements
- [ ] Update examples if needed

### 3. Configure Funding (Optional)

Edit `.github/FUNDING.yml` to enable GitHub Sponsors:

```yaml
github: [your-username]
```

### 4. Update Issue Templates

The issue templates in `.github/ISSUE_TEMPLATE/` have placeholder category options. Update `add-item.yml` to list your actual categories.

### 5. Final Steps

- [ ] Delete this `TEMPLATE_README.md` file
- [ ] Make your first commit
- [ ] Enable GitHub Pages if desired
- [ ] Submit to [awesome](https://github.com/sindresorhus/awesome) when ready

## What's Included

| Feature             | Description                                 |
| ------------------- | ------------------------------------------- |
| **Linting**         | markdownlint + Prettier checks on PRs       |
| **Awesome-lint**    | Official awesome list validation            |
| **Link checking**   | Weekly scan + PR checks for dead links      |
| **Auto TOC**        | Table of contents generated on push         |
| **Auto sort**       | Items sorted alphabetically on push         |
| **Issue templates** | Forms for adding items and reporting issues |
| **PR template**     | Checklist for contributors                  |

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
