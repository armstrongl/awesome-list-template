#!/usr/bin/env node

/**
 * quality-gates.mjs — Validate items added or modified in a PR.
 *
 * Accepts changed lines (from stdin or --input file) and validates each
 * awesome-list item against format, duplicate, link, and GitHub checks.
 *
 * Usage:
 *   node scripts/quality-gates.mjs --input changed-lines.txt --readme README.md
 *   cat changed-lines.txt | node scripts/quality-gates.mjs --readme README.md
 *
 * Environment variables (advanced checks, all OFF by default):
 *   QUALITY_MIN_STARS          — minimum star threshold (e.g., 10)
 *   QUALITY_MIN_AGE_DAYS       — minimum repo age in days (e.g., 30)
 *   QUALITY_CHECK_LICENSE      — if "true", verify license exists
 *   QUALITY_CHECK_MAINTENANCE  — if "true", verify commits in last 12 months
 *   GITHUB_TOKEN               — GitHub API token for authenticated requests
 *
 * Requires: Node 20+ (built-in fetch). No external dependencies.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Exclusion patterns — keep in sync with .lychee.toml
// ---------------------------------------------------------------------------

const EXCLUDE_PATTERNS = [
  /^https?:\/\/example\.com/,
  /^https?:\/\/example\.org/,
  /^https?:\/\/github\.com\/example\//,
  /^https?:\/\/github\.com\/YOUR_/,
  /^https?:\/\/.*YOUR_/,
];
// NOTE: Keep in sync with .lychee.toml exclude patterns

// ---------------------------------------------------------------------------
// Item format regex
// ---------------------------------------------------------------------------

// Matches: - [Name](URL) - Description ending with punctuation.
const ITEM_REGEX =
  /^- \[([^\]]+)\]\((https?:\/\/[^\s)]+)\) - (.+[.!?])$/;

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Validate that a line matches the awesome-list item format.
 * Expected: `- [Name](URL) - Description ending with punctuation.`
 *
 * @param {string} line - A single line to validate.
 * @returns {{ pass: boolean, message: string }}
 */
export function validateFormat(line) {
  if (!line || typeof line !== "string") {
    return { pass: false, message: "Empty or invalid input." };
  }

  const trimmed = line.trim();

  // Must start with "- ["
  if (!trimmed.startsWith("- [")) {
    return { pass: false, message: "Item must start with '- ['." };
  }

  // Must contain a URL in markdown link syntax
  if (!/\]\(https?:\/\//.test(trimmed)) {
    return { pass: false, message: "Item must contain a valid URL in [Name](URL) format." };
  }

  // Must have " - " separator between URL closing paren and description
  if (!/\) - /.test(trimmed)) {
    return {
      pass: false,
      message: "Item must use ' - ' (space-dash-space) between URL and description.",
    };
  }

  // Description must end with punctuation
  if (!/[.!?]$/.test(trimmed)) {
    return {
      pass: false,
      message: "Description must end with punctuation (., !, or ?).",
    };
  }

  // Full regex match for strict validation
  if (!ITEM_REGEX.test(trimmed)) {
    return {
      pass: false,
      message: "Item does not match expected format: - [Name](URL) - Description.",
    };
  }

  return { pass: true, message: "" };
}

/**
 * Check if a URL already exists in the README content.
 *
 * @param {string} url - The URL to check for duplicates.
 * @param {string} readmeContent - The full README.md content.
 * @returns {{ pass: boolean, message: string }}
 */
export function checkDuplicates(url, readmeContent) {
  const normalizedUrl = url.toLowerCase();
  const normalizedReadme = readmeContent.toLowerCase();

  // Count occurrences instead of simple includes — the checked-out README
  // already contains the newly-added URL, so one match is expected.
  // Flag as duplicate only when the URL appears more than once.
  let count = 0;
  let idx = -1;
  while ((idx = normalizedReadme.indexOf(normalizedUrl, idx + 1)) !== -1) {
    count++;
    if (count > 1) {
      return { pass: false, message: `URL is a duplicate: ${url}` };
    }
  }

  return { pass: true, message: "" };
}

/**
 * Check if a URL matches any exclusion pattern.
 *
 * @param {string} url - The URL to check.
 * @returns {boolean} True if the URL should be excluded from checks.
 */
export function isExcluded(url) {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Parse an awesome-list item line into its components.
 *
 * @param {string} line - A single line to parse.
 * @returns {{ name: string, url: string, description: string } | null}
 */
export function parseItem(line) {
  if (!line || typeof line !== "string") return null;

  const match = line.trim().match(ITEM_REGEX);
  if (!match) return null;

  return {
    name: match[1],
    url: match[2],
    description: match[3],
  };
}

/**
 * Generate a markdown summary suitable for posting as a PR comment.
 *
 * @param {{ items: Array, summary: object, advanced_checks_enabled: boolean }} results
 * @returns {string} Markdown content with ## Quality Gate Results header.
 */
export function generateMarkdownSummary(results) {
  const { items, summary, advanced_checks_enabled } = results;

  const lines = [];
  lines.push("## Quality Gate Results");
  lines.push("");

  // Summary counts
  lines.push(
    `**${summary.total}** items checked | ` +
      `**${summary.passed}** passed | ` +
      `**${summary.failed}** failed | ` +
      `**${summary.warnings}** warnings`,
  );
  lines.push("");

  if (advanced_checks_enabled) {
    lines.push("> Advanced checks are enabled for this run.");
    lines.push("");
  }

  if (items.length === 0) {
    lines.push("No list items found in the changed lines.");
    return lines.join("\n");
  }

  // Results table
  lines.push("| Item | Format | Duplicate | Link | Details |");
  lines.push("|------|--------|-----------|------|---------|");

  for (const item of items) {
    const checks = item.checks;
    const formatIcon = checks.format?.pass ? "pass" : "fail";
    const dupIcon = checks.duplicate?.pass ? "pass" : "fail";
    const linkIcon = checks.link
      ? checks.link.pass
        ? "pass"
        : "fail"
      : "skipped";

    // Collect failure messages
    const details = [];
    for (const [key, check] of Object.entries(checks)) {
      if (!check.pass && check.message) {
        details.push(check.message);
      }
    }

    const overallStatus = Object.values(checks).every((c) => c.pass)
      ? "passed"
      : "failed";

    const safeName = item.name.replace(/\|/g, "\\|");
    lines.push(
      `| [${safeName}](${item.url}) | ${formatIcon} | ${dupIcon} | ${linkIcon} | ${details.join("; ") || overallStatus} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Link checking
// ---------------------------------------------------------------------------

/**
 * Check if a URL resolves to a valid HTTP response.
 *
 * @param {string} url - The URL to check.
 * @returns {Promise<{ pass: boolean, message: string, status: number }>}
 */
async function checkLink(url) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "awesome-list-quality-gate/1.0" },
    });

    const status = response.status;
    if (status === 200 || status === 301 || status === 302) {
      return { pass: true, message: "", status };
    }

    return {
      pass: false,
      message: `HTTP ${status} response.`,
      status,
    };
  } catch (error) {
    return {
      pass: false,
      message: `Link check failed: ${error.message}`,
      status: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// GitHub checks
// ---------------------------------------------------------------------------

const GITHUB_REPO_REGEX =
  /^https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/?$/;

/**
 * Run GitHub-specific checks on a repository URL.
 *
 * @param {string} url - The GitHub repository URL.
 * @param {string} [token] - Optional GitHub API token.
 * @returns {Promise<{ pass: boolean, message: string, stars?: number, age_days?: number }>}
 */
async function checkGitHub(url, token) {
  const match = url.match(GITHUB_REPO_REGEX);
  if (!match) {
    return { pass: true, message: "Not a GitHub repository URL." };
  }

  const [, owner, repo] = match;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "awesome-list-quality-gate/1.0",
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  try {
    const response = await fetch(apiUrl, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        pass: false,
        message: `GitHub API returned ${response.status} for ${owner}/${repo}.`,
      };
    }

    const data = await response.json();
    const stars = data.stargazers_count ?? 0;
    const createdAt = new Date(data.created_at);
    const ageDays = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const result = { pass: true, message: "", stars, age_days: ageDays };

    // Advanced checks
    const minStars = parseInt(process.env.QUALITY_MIN_STARS, 10);
    if (!isNaN(minStars) && stars < minStars) {
      result.pass = false;
      result.message = `Repository has ${stars} stars (minimum: ${minStars}).`;
    }

    const minAgeDays = parseInt(process.env.QUALITY_MIN_AGE_DAYS, 10);
    if (!isNaN(minAgeDays) && ageDays < minAgeDays) {
      result.pass = false;
      result.message +=
        (result.message ? " " : "") +
        `Repository is ${ageDays} days old (minimum: ${minAgeDays}).`;
    }

    if (process.env.QUALITY_CHECK_LICENSE === "true") {
      if (!data.license || !data.license.spdx_id || data.license.spdx_id === "NOASSERTION") {
        result.pass = false;
        result.message +=
          (result.message ? " " : "") + "No license detected.";
      }
    }

    if (process.env.QUALITY_CHECK_MAINTENANCE === "true") {
      const pushedAt = new Date(data.pushed_at);
      const daysSincePush = Math.floor(
        (Date.now() - pushedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSincePush > 365) {
        result.pass = false;
        result.message +=
          (result.message ? " " : "") +
          `Last push was ${daysSincePush} days ago (max: 365).`;
      }
    }

    return result;
  } catch (error) {
    return {
      pass: false,
      message: `GitHub check failed: ${error.message}`,
    };
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

/**
 * Parse command-line arguments.
 * @returns {{ input: string|null, readme: string }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let input = null;
  let readme = "README.md";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) {
      input = args[i + 1];
      i++;
    } else if (args[i] === "--readme" && args[i + 1]) {
      readme = args[i + 1];
      i++;
    }
  }

  return { input, readme };
}

/**
 * Read input lines from file or stdin.
 * @param {string|null} inputPath - Path to input file, or null for stdin.
 * @returns {Promise<string>}
 */
async function readInput(inputPath) {
  if (inputPath) {
    return readFileSync(resolve(inputPath), "utf-8");
  }

  // Read from stdin
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  const { input, readme } = parseArgs();

  // Read README for duplicate detection
  const readmePath = resolve(readme);
  let readmeContent;
  try {
    readmeContent = readFileSync(readmePath, "utf-8");
  } catch {
    console.error(`Warning: Could not read ${readmePath}. Duplicate checks will be skipped.`);
    readmeContent = "";
  }

  // Read changed lines
  const rawInput = await readInput(input);
  const lines = rawInput
    .split("\n")
    .map((l) => l.replace(/^\+/, "").trim()) // Strip diff "+" prefix
    .filter((l) => l.startsWith("- ["));

  const token = process.env.GITHUB_TOKEN || "";
  const advancedEnabled = !!(
    process.env.QUALITY_MIN_STARS ||
    process.env.QUALITY_MIN_AGE_DAYS ||
    process.env.QUALITY_CHECK_LICENSE === "true" ||
    process.env.QUALITY_CHECK_MAINTENANCE === "true"
  );

  const items = [];

  for (const line of lines) {
    const checks = {};

    // Always evaluate format so malformed items are reported as failures
    checks.format = validateFormat(line);

    const parsed = parseItem(line);

    if (parsed) {
      // Skip excluded URLs
      if (isExcluded(parsed.url)) continue;

      // Duplicate check
      checks.duplicate = checkDuplicates(parsed.url, readmeContent);

      // Link check
      checks.link = await checkLink(parsed.url);

      // GitHub check (only for GitHub URLs)
      if (GITHUB_REPO_REGEX.test(parsed.url)) {
        checks.github = await checkGitHub(parsed.url, token);
      }
    }

    items.push({
      name: parsed ? parsed.name : line,
      url: parsed ? parsed.url : "",
      checks,
    });
  }

  // Build summary
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (const item of items) {
    const allPass = Object.values(item.checks).every((c) => c.pass);
    if (allPass) {
      passed++;
    } else {
      failed++;
    }
  }

  const results = {
    items,
    summary: { total: items.length, passed, failed, warnings },
    advanced_checks_enabled: advancedEnabled,
  };

  // Write JSON results
  const jsonPath = resolve("quality-results.json");
  writeFileSync(jsonPath, JSON.stringify(results, null, 2) + "\n");
  console.log(`Results written to ${jsonPath}`);

  // Write markdown summary
  const markdownSummary = generateMarkdownSummary(results);
  const mdPath = resolve("quality-summary.md");
  writeFileSync(mdPath, markdownSummary + "\n");
  console.log(`Summary written to ${mdPath}`);

  // Exit with non-zero code if any failures
  if (failed > 0) {
    console.log(`\n${failed} item(s) failed quality checks.`);
    process.exit(1);
  }

  console.log(`\nAll ${passed} item(s) passed quality checks.`);
}

// Only run main when executed directly (not when imported for testing)
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url === `file://${resolve(process.argv[1])}`;

if (isMainModule) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(2);
  });
}
