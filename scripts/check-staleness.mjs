#!/usr/bin/env node

/**
 * check-staleness.mjs — Check GitHub URLs in README.md for staleness.
 *
 * Reads the README, extracts GitHub repository URLs, queries the GitHub API
 * for each, classifies them (healthy / stale / archived / deleted), and
 * writes a staleness-report.md summary.
 *
 * Requires: Node 20+ (built-in fetch). No external dependencies.
 *
 * Environment variables:
 *   GITHUB_TOKEN — optional but recommended for 5 000 req/hr rate limit.
 *   README_PATH  — override the default README.md path.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// URL Extraction
// ---------------------------------------------------------------------------

/**
 * Extract unique GitHub owner/repo pairs from markdown content.
 * Ignores non-GitHub URLs, example/placeholder patterns, and deduplicates.
 *
 * @param {string} markdown - Raw markdown content.
 * @returns {Array<{owner: string, repo: string, url: string}>}
 */
export function extractGitHubUrls(markdown) {
  const seen = new Set();
  const results = [];
  const lines = markdown.split(/\r?\n/);

  for (const line of lines) {
    // Only process markdown list items to avoid matching badge/workflow URLs
    if (!/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) continue;

    const regex = /https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/[^\s)]*)?/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      const owner = match[1];
      const repo = match[2].replace(/[/#].*$/, "");
      const key = `${owner}/${repo}`.toLowerCase();

      // Skip example/placeholder patterns
      if (/^example$/i.test(owner)) continue;
      if (/^YOUR_/i.test(owner)) continue;
      if (/^YOUR_/i.test(repo)) continue;

      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        owner,
        repo,
        url: `https://github.com/${owner}/${repo}`,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Classify a repository based on API data.
 *
 * @param {object|null} apiData - Parsed JSON from the GitHub repos API, or null for 404.
 * @param {Date} now - Current date (injectable for testing).
 * @returns {{status: string, lastCommit: string|null, stars: number|null, monthsInactive: number|null}}
 */
export function classifyRepo(apiData, now = new Date()) {
  if (apiData === null) {
    return { status: "deleted", lastCommit: null, stars: null, monthsInactive: null };
  }

  const pushedAt = new Date(apiData.pushed_at);
  const diffMs = now.getTime() - pushedAt.getTime();
  const monthsInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const lastCommit = pushedAt.toISOString().split("T")[0];
  const stars = apiData.stargazers_count ?? 0;

  if (apiData.archived) {
    return { status: "archived", lastCommit, stars, monthsInactive };
  }

  if (monthsInactive >= 12) {
    return { status: "stale", lastCommit, stars, monthsInactive };
  }

  return { status: "healthy", lastCommit, stars, monthsInactive };
}

// ---------------------------------------------------------------------------
// Rate Limiting Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate exponential backoff delay in milliseconds.
 * Base is 1 second, doubles each retry, capped at 30 seconds.
 *
 * @param {number} attempt - Zero-based retry attempt number.
 * @returns {number} Delay in milliseconds.
 */
export function calculateBackoff(attempt) {
  const delay = Math.pow(2, attempt) * 1000;
  return Math.min(delay, 30_000);
}

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// GitHub API Interaction
// ---------------------------------------------------------------------------

/**
 * Fetch a single repo from the GitHub API with retry logic.
 *
 * @param {string} owner
 * @param {string} repo
 * @param {string} [token]
 * @param {typeof globalThis.fetch} [fetchFn] - Injectable fetch for testing.
 * @returns {Promise<{apiData: object|null, error: string|null}>}
 */
async function fetchRepo(owner, repo, token, fetchFn = fetch) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "awesome-list-staleness-checker",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let response;
    try {
      response = await fetchFn(url, { headers });
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        return { apiData: null, error: `Network error: ${err.message}` };
      }
      await sleep(calculateBackoff(attempt));
      continue;
    }

    if (response.status === 200) {
      const data = await response.json();
      return { apiData: data, error: null };
    }

    if (response.status === 404) {
      return { apiData: null, error: null };
    }

    if (response.status === 429 || response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        // Budget exhaustion — stop gracefully
        return { apiData: null, error: "Rate limit budget exhausted" };
      }
      // Transient 429 — retry with backoff
      if (attempt < MAX_RETRIES) {
        await sleep(calculateBackoff(attempt));
        continue;
      }
      return { apiData: null, error: `Rate limited after ${MAX_RETRIES} retries` };
    }

    // Other error
    if (attempt === MAX_RETRIES) {
      return { apiData: null, error: `HTTP ${response.status} ${response.statusText}` };
    }
    await sleep(calculateBackoff(attempt));
  }

  return { apiData: null, error: "Max retries exceeded" };
}

// ---------------------------------------------------------------------------
// Report Generation
// ---------------------------------------------------------------------------

/**
 * Generate a markdown staleness report from classification results.
 *
 * @param {Array<object>} results - Array of result objects with status, owner, repo, etc.
 * @returns {string} Markdown report content.
 */
export function generateReport(results) {
  const today = new Date().toISOString().split("T")[0];

  const counts = { healthy: 0, stale: 0, archived: 0, deleted: 0, error: 0 };
  for (const r of results) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }

  const lines = [];
  lines.push("# Staleness Report");
  lines.push("");
  lines.push(`Generated: ${today}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total GitHub repos checked: ${results.length}`);
  lines.push(`- Healthy: ${counts.healthy}`);
  lines.push(`- Stale (12+ months inactive): ${counts.stale}`);
  lines.push(`- Archived: ${counts.archived}`);
  lines.push(`- Deleted or private: ${counts.deleted}`);
  lines.push(`- Errors: ${counts.error}`);
  lines.push("");
  lines.push("## Details");
  lines.push("");

  // Stale section
  const stale = results.filter((r) => r.status === "stale");
  if (stale.length > 0) {
    lines.push("### Stale");
    lines.push("");
    lines.push("| Repository | Last Commit | Stars | Status |");
    lines.push("|------------|-------------|-------|--------|");
    for (const r of stale) {
      lines.push(
        `| [${r.owner}/${r.repo}](${r.url}) | ${r.lastCommit} | ${r.stars} | Stale (${r.monthsInactive} months) |`,
      );
    }
    lines.push("");
  }

  // Archived section
  const archived = results.filter((r) => r.status === "archived");
  if (archived.length > 0) {
    lines.push("### Archived");
    lines.push("");
    lines.push("| Repository | Last Commit | Stars | Status |");
    lines.push("|------------|-------------|-------|--------|");
    for (const r of archived) {
      lines.push(
        `| [${r.owner}/${r.repo}](${r.url}) | ${r.lastCommit} | ${r.stars} | Archived |`,
      );
    }
    lines.push("");
  }

  // Deleted or Private section
  const deleted = results.filter((r) => r.status === "deleted");
  if (deleted.length > 0) {
    lines.push("### Deleted or Private");
    lines.push("");
    lines.push("| Repository | Status |");
    lines.push("|------------|--------|");
    for (const r of deleted) {
      lines.push(`| [${r.owner}/${r.repo}](${r.url}) | Deleted or private |`);
    }
    lines.push("");
  }

  // Errors section
  const errors = results.filter((r) => r.status === "error");
  if (errors.length > 0) {
    lines.push("### Errors");
    lines.push("");
    lines.push("| Repository | Error |");
    lines.push("|------------|-------|");
    for (const r of errors) {
      lines.push(`| [${r.owner}/${r.repo}](${r.url}) | ${r.errorMessage} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const readmePath = resolve(process.env.README_PATH || "README.md");
  const reportPath = resolve("staleness-report.md");
  const token = process.env.GITHUB_TOKEN || "";

  console.log(`Reading ${readmePath}...`);
  const markdown = readFileSync(readmePath, "utf-8");

  const repos = extractGitHubUrls(markdown);
  console.log(`Found ${repos.length} unique GitHub repos.`);

  if (repos.length === 0) {
    console.log("No GitHub repository URLs found. Writing empty report.");
    writeFileSync(reportPath, generateReport([]));
    return;
  }

  if (repos.length > 500 && !token) {
    console.warn(
      "WARNING: Found more than 500 GitHub URLs. A personal access token (GITHUB_TOKEN) is strongly recommended to avoid rate limiting.",
    );
  }

  const BATCH_SIZE = 50;
  const BATCH_DELAY_MS = 1000;
  const results = [];
  let rateLimitExhausted = false;

  for (let i = 0; i < repos.length; i += BATCH_SIZE) {
    if (rateLimitExhausted) break;

    const batch = repos.slice(i, i + BATCH_SIZE);
    if (i > 0) {
      console.log(`Waiting ${BATCH_DELAY_MS}ms between batches...`);
      await sleep(BATCH_DELAY_MS);
    }

    console.log(
      `Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (repos ${i + 1}-${i + batch.length} of ${repos.length})...`,
    );

    for (const { owner, repo, url } of batch) {
      const { apiData, error } = await fetchRepo(owner, repo, token);

      if (error === "Rate limit budget exhausted") {
        console.warn("Rate limit budget exhausted. Stopping gracefully.");
        results.push({
          owner,
          repo,
          url,
          status: "error",
          lastCommit: null,
          stars: null,
          monthsInactive: null,
          errorMessage: error,
        });
        rateLimitExhausted = true;
        break;
      }

      if (error) {
        results.push({
          owner,
          repo,
          url,
          status: "error",
          lastCommit: null,
          stars: null,
          monthsInactive: null,
          errorMessage: error,
        });
        continue;
      }

      const classification = classifyRepo(apiData);
      results.push({
        owner,
        repo,
        url,
        ...classification,
      });
    }
  }

  const report = generateReport(results);
  writeFileSync(reportPath, report);
  console.log(`Report written to ${reportPath}`);

  // Print summary to stdout
  const counts = { healthy: 0, stale: 0, archived: 0, deleted: 0, error: 0 };
  for (const r of results) {
    counts[r.status] = (counts[r.status] || 0) + 1;
  }
  console.log(
    `\nSummary: ${results.length} checked — ${counts.healthy} healthy, ${counts.stale} stale, ${counts.archived} archived, ${counts.deleted} deleted, ${counts.error} errors`,
  );
}

// Run main only when executed directly (not imported for testing)
const entryFile = process.argv[1] || "";
const isMainModule = entryFile.endsWith("check-staleness.mjs") && !entryFile.includes(".test.");

if (isMainModule) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
