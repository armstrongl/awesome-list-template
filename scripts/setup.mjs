#!/usr/bin/env node

/**
 * Interactive setup script for awesome-list-template.
 *
 * Replaces YOUR_* placeholders across all template files with user-provided
 * values. Supports both interactive (readline) and non-interactive (CLI flags)
 * modes.
 *
 * Usage:
 *   node scripts/setup.mjs                          # interactive
 *   node scripts/setup.mjs --topic Docker ...        # non-interactive
 *   node scripts/setup.mjs --topic Docker ... --yes  # non-interactive, skip confirmation
 */

import { createInterface } from "node:readline";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

/** Files that contain YOUR_* placeholders and should be processed. */
const TARGET_FILES = [
  "README.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "package.json",
  "SETUP.md",
  ".github/ISSUE_TEMPLATE/add-item.yml",
  ".github/ISSUE_TEMPLATE/remove-item.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/ISSUE_TEMPLATE/category-change.yml",
  "assets/banner-light.svg",
  "assets/banner-dark.svg",
];

/** Scaffolding files that can optionally be deleted after setup. */
const SCAFFOLDING_FILES = ["SETUP.md"];

// ---------------------------------------------------------------------------
// Exported / testable helpers
// ---------------------------------------------------------------------------

/**
 * Find all YOUR_* placeholder tokens in the given content string.
 * Returns a deduplicated, sorted array of placeholder names.
 *
 * @param {string} content
 * @returns {string[]}
 */
export function findPlaceholders(content) {
  const matches = content.match(/YOUR_[A-Z0-9_]+/g);
  if (!matches) return [];
  return [...new Set(matches)].sort();
}

/**
 * Replace all YOUR_* placeholders in `content` using the provided values map.
 *
 * `values` is an object with keys like `topic`, `username`, `repo`, `email`,
 * `description`, and `categories` (string[]).
 *
 * Category handling:
 * - YOUR_CATEGORY_1 is replaced with categories[0].
 * - YOUR_CATEGORY_2 is replaced with categories[1] when present.
 * - If only one category is provided, YOUR_CATEGORY_2 sections are removed.
 *
 * @param {string} content
 * @param {object} values
 * @param {string} values.topic
 * @param {string} values.username
 * @param {string} values.repo
 * @param {string} values.email
 * @param {string} values.description
 * @param {string[]} values.categories
 * @returns {string}
 */
export function replacePlaceholders(content, values) {
  let result = content;

  // Simple 1:1 replacements
  result = result.replaceAll("YOUR_TOPIC", values.topic);
  result = result.replaceAll("YOUR_GITHUB_USERNAME", values.username);
  result = result.replaceAll("YOUR_REPO_NAME", values.repo);
  result = result.replaceAll("YOUR_EMAIL", values.email);
  result = result.replaceAll("YOUR_LIST_DESCRIPTION", values.description);

  const cats = values.categories;

  if (cats.length >= 1) {
    result = result.replaceAll("YOUR_CATEGORY_1", cats[0]);
  }

  if (cats.length >= 2) {
    result = result.replaceAll("YOUR_CATEGORY_2", cats[1]);
  } else {
    // Remove YOUR_CATEGORY_2 sections from README-like content.
    // Matches a full section block: heading, italic description line, items, trailing blank lines.
    result = result.replace(
      /## YOUR_CATEGORY_2\n\n_[^\n]*_\n\n(?:- \[.*\n)*\n*/g,
      "",
    );
    // Remove TOC entry for YOUR_CATEGORY_2
    result = result.replace(/- \[YOUR_CATEGORY_2\]\(#[^)]*\)\n/g, "");
    // Remove remaining standalone occurrences (e.g. in dropdown options)
    result = result.replace(/^.*YOUR_CATEGORY_2.*\n?/gm, "");
  }

  return result;
}

/**
 * Parse CLI arguments into a values object.
 *
 * Expected flags: --topic, --username, --repo, --email, --description,
 * --categories (comma-separated), --yes, --force.
 *
 * Returns `null` if any required field is missing (for non-interactive mode
 * validation). The `--yes` and `--force` flags are always included when present.
 *
 * @param {string[]} args — process.argv style array (includes node + script path)
 * @returns {{ topic: string, username: string, repo: string, email: string, description: string, categories: string[], yes: boolean, force: boolean } | null}
 */
export function parseCliArgs(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--topic":
        flags.topic = args[++i];
        break;
      case "--username":
        flags.username = args[++i];
        break;
      case "--repo":
        flags.repo = args[++i];
        break;
      case "--email":
        flags.email = args[++i];
        break;
      case "--description":
        flags.description = args[++i];
        break;
      case "--categories":
        flags.categories = args[++i]?.split(",").map((c) => c.trim()).filter(Boolean);
        break;
      case "--yes":
        flags.yes = true;
        break;
      case "--force":
        flags.force = true;
        break;
    }
  }

  const required = ["topic", "username", "repo", "email", "description", "categories"];
  const hasAll = required.every(
    (key) => flags[key] !== undefined && flags[key] !== null,
  );

  if (!hasAll) return null;

  // Require at least one non-empty category
  if (flags.categories.length === 0) return null;

  return {
    topic: flags.topic,
    username: flags.username,
    repo: flags.repo,
    email: flags.email,
    description: flags.description,
    categories: flags.categories,
    yes: !!flags.yes,
    force: !!flags.force,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Scan all target files for remaining YOUR_* patterns.
 * @returns {Map<string, string[]>} file path -> list of placeholders found
 */
function scanForPlaceholders() {
  const results = new Map();
  for (const rel of TARGET_FILES) {
    const abs = resolve(ROOT, rel);
    if (!existsSync(abs)) continue;
    const content = readFileSync(abs, "utf-8");
    const found = findPlaceholders(content);
    if (found.length > 0) {
      results.set(rel, found);
    }
  }
  return results;
}

/**
 * Build additional README sections for categories beyond the first two.
 * @param {string[]} extraCategories — categories starting from index 2
 * @returns {string}
 */
function buildExtraSections(extraCategories) {
  return extraCategories
    .map(
      (cat) =>
        `\n## ${cat}\n\n_Resources and tools for ${cat}._\n\n- [Example Item](https://example.com) - Brief description of what this resource offers.\n`,
    )
    .join("\n");
}

/**
 * Build additional dropdown options for extra categories in add-item.yml.
 * @param {string[]} extraCategories
 * @returns {string}
 */
function buildExtraDropdownOptions(extraCategories) {
  return extraCategories.map((cat) => `        - ${cat}`).join("\n");
}

/**
 * Build additional TOC entries for extra categories.
 * @param {string[]} extraCategories
 * @returns {string}
 */
function buildExtraTocEntries(extraCategories) {
  return extraCategories
    .map((cat) => {
      const anchor = cat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
      return `- [${cat}](#${anchor})`;
    })
    .join("\n");
}

/**
 * Apply replacements to all target files.
 * @param {object} values
 */
function applyReplacements(values) {
  const extraCats = values.categories.slice(2);

  for (const rel of TARGET_FILES) {
    const abs = resolve(ROOT, rel);
    if (!existsSync(abs)) continue;

    let content = readFileSync(abs, "utf-8");
    content = replacePlaceholders(content, values);

    // For README.md, inject extra category sections + TOC entries if >2 categories.
    if (rel === "README.md" && extraCats.length > 0) {
      // Insert extra sections before "## Related"
      const extraSections = buildExtraSections(extraCats);
      content = content.replace(
        /\n## Related\n/,
        `${extraSections}\n## Related\n`,
      );

      // Insert extra TOC entries before "- [Related]"
      const extraToc = buildExtraTocEntries(extraCats);
      content = content.replace(
        /- \[Related\]/,
        `${extraToc}\n- [Related]`,
      );
    }

    // For add-item.yml, inject extra category dropdown options.
    if (rel === ".github/ISSUE_TEMPLATE/add-item.yml" && extraCats.length > 0) {
      const extraOptions = buildExtraDropdownOptions(extraCats);
      content = content.replace(
        /        - Suggest new category/,
        `${extraOptions}\n        - Suggest new category`,
      );
    }

    // For category-change.yml, inject extra category references.
    if (rel === ".github/ISSUE_TEMPLATE/category-change.yml" && extraCats.length > 0) {
      // Add extra category lines in the placeholder text
      const cat2 = values.categories[1] || values.categories[0];
      const extraPlaceholderLines = extraCats
        .map((cat) => `        ${cat} contains...`)
        .join("\n");
      content = content.replace(
        `        ${cat2} contains...`,
        `        ${cat2} contains...\n${extraPlaceholderLines}`,
      );
    }

    writeFileSync(abs, content, "utf-8");
  }
}

/**
 * Also replace the hardcoded template-repo badge URL in README.md.
 * The template ships with armstrongl/awesome-list-template in the Lint badge;
 * we need to update that to the user's repo.
 * @param {object} values
 */
function replaceTemplateBadgeUrl(values) {
  const readmePath = resolve(ROOT, "README.md");
  if (!existsSync(readmePath)) return;
  let content = readFileSync(readmePath, "utf-8");
  content = content.replaceAll(
    "armstrongl/awesome-list-template",
    `${values.username}/${values.repo}`,
  );
  writeFileSync(readmePath, content, "utf-8");
}

/**
 * Set GitHub topics (awesome, awesome-list, awesome-<slug>) via `gh` CLI.
 * Fails gracefully if `gh` is not installed or not authenticated.
 * @param {object} values
 */
function setGitHubTopics(values) {
  const slug = values.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
  const topics = ["awesome", "awesome-list", `awesome-${slug}`];
  try {
    const addFlags = topics.map((t) => `--add-topic ${t}`).join(" ");
    execSync(`gh repo edit ${addFlags}`, { cwd: ROOT, stdio: "ignore" });
    console.log(`GitHub topics set: ${topics.join(", ")}`);
  } catch {
    console.log(
      "Note: Could not set GitHub topics automatically. Set them manually in your repo settings: awesome, awesome-list",
    );
  }
}

/**
 * Print a human-readable summary of what will be replaced.
 * @param {object} values
 * @param {Map<string, string[]>} placeholderMap
 */
function printSummary(values, placeholderMap) {
  console.log("\n--- Replacement Summary ---\n");
  console.log(`  Topic:           ${values.topic}`);
  console.log(`  GitHub username:  ${values.username}`);
  console.log(`  Repository:      ${values.repo}`);
  console.log(`  Email:           ${values.email}`);
  console.log(`  Description:     ${values.description}`);
  console.log(`  Categories:      ${values.categories.join(", ")}`);
  console.log();
  console.log("Files that will be updated:");
  for (const [file, placeholders] of placeholderMap) {
    console.log(`  ${file}  (${placeholders.join(", ")})`);
  }
  // Also mention the template badge URL replacement
  const readmePath = resolve(ROOT, "README.md");
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, "utf-8");
    if (readme.includes("armstrongl/awesome-list-template")) {
      console.log(`  README.md  (armstrongl/awesome-list-template -> ${values.username}/${values.repo})`);
    }
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Interactive prompting
// ---------------------------------------------------------------------------

/**
 * Prompt the user for a single value via readline.
 * @param {import("node:readline").Interface} rl
 * @param {string} question
 * @param {string} [defaultValue]
 * @returns {Promise<string>}
 */
function ask(rl, question, defaultValue) {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

/**
 * Ask the user a yes/no question. Returns boolean.
 * @param {import("node:readline").Interface} rl
 * @param {string} question
 * @param {boolean} [defaultYes=false]
 * @returns {Promise<boolean>}
 */
function askConfirm(rl, question, defaultYes = false) {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  return new Promise((resolve) => {
    rl.question(`${question} ${hint}: `, (answer) => {
      const val = answer.trim().toLowerCase();
      if (val === "") return resolve(defaultYes);
      resolve(val === "y" || val === "yes");
    });
  });
}

/**
 * Gather all values interactively.
 * @param {import("node:readline").Interface} rl
 * @returns {Promise<object>}
 */
async function promptValues(rl) {
  console.log("\nAwesome List Setup\n");
  console.log("Answer the following prompts to customize your awesome list.\n");

  const topic = await ask(rl, "Topic name (e.g., Docker)");
  const username = await ask(rl, "GitHub username or org (e.g., user)");
  const repo = await ask(rl, "Repository name (e.g., awesome-docker)", `awesome-${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
  const email = await ask(rl, "Contact email (e.g., user@example.com)");
  const description = await ask(rl, "List description (e.g., A curated list of Docker resources)");
  const categoriesRaw = await ask(rl, "Category names, comma-separated (e.g., Tools, Libraries)");
  const categories = categoriesRaw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  if (categories.length === 0) {
    console.error("Error: At least one category is required.");
    process.exit(1);
  }

  return { topic, username, repo, email, description, categories };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const cliValues = parseCliArgs(process.argv);
  const isNonInteractive = cliValues !== null;

  // Determine if --force or --yes were passed (even if other args are missing)
  const forceFlag = process.argv.includes("--force");
  const yesFlag = process.argv.includes("--yes");

  // Step 1: Scan for existing placeholders
  const placeholderMap = scanForPlaceholders();

  if (placeholderMap.size === 0 && !forceFlag) {
    console.log(
      "Setup appears to have already been run. Use --force to run anyway.",
    );
    process.exit(0);
  }

  // Step 2: Gather values
  let values;
  let rl;

  if (isNonInteractive) {
    values = cliValues;
  } else {
    rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      values = await promptValues(rl);
    } catch (err) {
      rl.close();
      throw err;
    }
  }

  // Step 3: Show summary and confirm
  printSummary(values, placeholderMap);

  if (!isNonInteractive && !yesFlag) {
    const proceed = await askConfirm(rl, "Apply these replacements?", true);
    if (!proceed) {
      console.log("Aborted.");
      rl.close();
      process.exit(0);
    }
  }

  // Step 4: Apply replacements
  console.log("Applying replacements...");
  applyReplacements(values);
  replaceTemplateBadgeUrl(values);
  console.log("Replacements applied.");

  setGitHubTopics(values);

  // Step 5: Optionally delete scaffolding files
  if (!isNonInteractive && !yesFlag) {
    const deleteScaffolding = await askConfirm(
      rl,
      "Delete scaffolding file(s) (SETUP.md)?",
      false,
    );
    if (deleteScaffolding) {
      for (const file of SCAFFOLDING_FILES) {
        const abs = resolve(ROOT, file);
        if (existsSync(abs)) {
          const { unlinkSync } = await import("node:fs");
          unlinkSync(abs);
          console.log(`  Deleted: ${file}`);
        }
      }
    }
  }

  if (rl) rl.close();

  // Step 6: Run fix:all to normalize formatting
  console.log("\nRunning npm run fix:all to normalize formatting...");
  try {
    execSync("npm run fix:all", { cwd: ROOT, stdio: "inherit" });
  } catch {
    console.log("Warning: npm run fix:all exited with errors (non-fatal).");
  }

  console.log("\nSetup complete! Your awesome list is ready.");
  console.log('Run "npm test" to validate, or start adding items to your list.');
}

// Run main only when executed directly (not imported for testing).
const isDirectRun =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(__filename);

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
