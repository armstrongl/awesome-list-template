# Contribution Guidelines

Thank you for contributing to this awesome list! Please follow these guidelines
to help maintain quality and consistency.

## What Makes Something Awesome

Not everything related to YOUR_TOPIC belongs on this list. We aim for a curated
collection of truly outstanding resources. An item should meet these criteria:

- **Well-maintained**: Active development or regular updates within the last 12
  months
- **High quality**: Well-documented, stable, and reliable
- **Established**: At least 30 days old (no brand-new projects)
- **Unique value**: Offers something not already covered by existing items
- **Relevant**: Directly related to YOUR_TOPIC, not tangentially connected

When in doubt, ask yourself: "Would I confidently recommend this to a colleague
working with YOUR_TOPIC?" If yes, it likely belongs here.

## AI-Assisted Contributions

AI tools can help draft descriptions, find resources, and format entries. However:

- **Fully AI-generated submissions are not accepted.** You must have personal
  experience with or knowledge of the item you're submitting.
- **AI-generated descriptions must be reviewed and edited** to ensure accuracy.
- **Do not submit items you haven't evaluated.** Curation means personal vetting,
  not automated discovery.

This policy aligns with the
[sindresorhus/awesome submission requirements](https://github.com/sindresorhus/awesome/blob/main/pull_request_template.md).

## Adding an Item

### Format

All items must follow this exact format:

```markdown
- [Item Name](https://url.com) - Brief description ending with a period.
```

**Formatting rules:**

- Use `[Name](URL) - Description` format (space-dash-space between URL and
  description)
- Descriptions must end with proper punctuation (period, exclamation, or
  question mark)
- Keep descriptions to one sentence
- Place items in alphabetical order within their category (CI auto-sorts if
  needed)

### Good vs. Bad Submissions

**Good:**

```markdown
- [FastTool](https://fasttool.dev) - High-performance build tool with incremental compilation and watch mode.
```

**Bad:**

```markdown
- [FastTool](https://fasttool.dev) - A tool (missing punctuation, vague description)
- [FastTool](https://fasttool.dev): High-performance build tool. (colon instead of dash)
- [fasttool](https://fasttool.dev) - high-performance build tool. (lowercase name and description start)
```

### Process

1. Search existing items to avoid duplicates
2. Check open issues and PRs to avoid duplicate work
3. Fork the repository and create a branch for your addition
4. Add your item following the format above
5. Submit a pull request using the PR template
6. Ensure all CI checks pass (linting, formatting, awesome-lint)
7. Wait for a maintainer to review your submission

### Review Process

All submissions are reviewed by maintainers. We aim to review PRs within one
week. A maintainer may:

- **Approve**: Your item is merged
- **Request changes**: Formatting, description, or categorization needs
  adjustment
- **Decline**: The item doesn't meet the quality bar (with explanation)

Don't take a decline personally. You're welcome to resubmit if circumstances
change (e.g., a project matures).

## Suggesting Changes

- **New categories**: Open an issue first to discuss
- **Restructuring**: Open an issue explaining your rationale
- **Removing items**: Use the "Remove Item" issue template with evidence

## Reporting Issues

- **Dead links**: Use the dead link issue template
- **Other issues**: Open a general issue with details

## Code of Conduct

This project follows the [Contributor Covenant Code of
Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold its
standards. Report unacceptable behavior to YOUR_EMAIL.
