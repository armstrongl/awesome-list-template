import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

// Import functions under test (will be created in check-staleness.mjs)
import {
  extractGitHubUrls,
  classifyRepo,
  generateReport,
  calculateBackoff,
} from "./check-staleness.mjs";

// ---------------------------------------------------------------------------
// URL Extraction Tests
// ---------------------------------------------------------------------------

describe("extractGitHubUrls", () => {
  it("extracts GitHub repo URLs from markdown content", () => {
    const markdown = `
- [Repo A](https://github.com/owner/repo-a) - A description.
- [Repo B](https://github.com/other/repo-b) - Another description.
`;
    const urls = extractGitHubUrls(markdown);
    assert.deepStrictEqual(urls, [
      { owner: "owner", repo: "repo-a", url: "https://github.com/owner/repo-a" },
      { owner: "other", repo: "repo-b", url: "https://github.com/other/repo-b" },
    ]);
  });

  it("deduplicates URLs", () => {
    const markdown = `
- [Repo A](https://github.com/owner/repo-a) - First mention.
- [Repo A Again](https://github.com/owner/repo-a) - Duplicate.
- [Repo A Deep](https://github.com/owner/repo-a/issues) - Deep link duplicate.
`;
    const urls = extractGitHubUrls(markdown);
    assert.equal(urls.length, 1);
    assert.equal(urls[0].owner, "owner");
    assert.equal(urls[0].repo, "repo-a");
  });

  it("ignores non-GitHub URLs", () => {
    const markdown = `
- [Not GitHub](https://example.com/owner/repo) - Not on GitHub.
- [Also Not](https://gitlab.com/owner/repo) - GitLab.
- [Real](https://github.com/real/repo) - Real GitHub link.
`;
    const urls = extractGitHubUrls(markdown);
    assert.equal(urls.length, 1);
    assert.equal(urls[0].owner, "real");
  });

  it("handles deeper GitHub URLs (extracts owner/repo)", () => {
    const markdown = `
- [Issues](https://github.com/owner/repo/issues) - Issues page.
- [Wiki](https://github.com/owner/repo/wiki/Page) - Wiki page.
- [Blob](https://github.com/owner/repo/blob/main/README.md) - File link.
`;
    const urls = extractGitHubUrls(markdown);
    assert.equal(urls.length, 1);
    assert.equal(urls[0].owner, "owner");
    assert.equal(urls[0].repo, "repo");
  });

  it("ignores example/placeholder URLs", () => {
    const markdown = `
- [Example](https://github.com/example/awesome-related) - Example link.
- [Your Repo](https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME) - Placeholder.
- [Another](https://github.com/YOUR_NAME/project) - Another placeholder.
- [Real](https://github.com/real/project) - Real link.
`;
    const urls = extractGitHubUrls(markdown);
    assert.equal(urls.length, 1);
    assert.equal(urls[0].owner, "real");
  });

  it("returns empty array when no GitHub URLs found", () => {
    const markdown = `
- [Example](https://example.com) - No GitHub links here.
`;
    const urls = extractGitHubUrls(markdown);
    assert.deepStrictEqual(urls, []);
  });
});

// ---------------------------------------------------------------------------
// Classification Tests
// ---------------------------------------------------------------------------

describe("classifyRepo", () => {
  it("classifies archived repos correctly", () => {
    const apiData = {
      archived: true,
      pushed_at: "2024-01-15T00:00:00Z",
      stargazers_count: 100,
    };
    const result = classifyRepo(apiData, new Date("2025-06-01"));
    assert.equal(result.status, "archived");
    assert.equal(result.stars, 100);
  });

  it("classifies stale repos (12+ months) correctly", () => {
    const apiData = {
      archived: false,
      pushed_at: "2023-01-01T00:00:00Z",
      stargazers_count: 50,
    };
    const result = classifyRepo(apiData, new Date("2025-06-01"));
    assert.equal(result.status, "stale");
    assert.ok(result.monthsInactive >= 12);
  });

  it("classifies healthy repos correctly", () => {
    const apiData = {
      archived: false,
      pushed_at: "2025-05-01T00:00:00Z",
      stargazers_count: 200,
    };
    const result = classifyRepo(apiData, new Date("2025-06-01"));
    assert.equal(result.status, "healthy");
    assert.equal(result.stars, 200);
  });

  it("classifies 404 responses as deleted/private", () => {
    const result = classifyRepo(null, new Date("2025-06-01"));
    assert.equal(result.status, "deleted");
  });
});

// ---------------------------------------------------------------------------
// Report Generation Tests
// ---------------------------------------------------------------------------

describe("generateReport", () => {
  it("produces valid markdown with correct summary counts", () => {
    const results = [
      {
        owner: "healthy",
        repo: "project",
        url: "https://github.com/healthy/project",
        status: "healthy",
        lastCommit: "2025-05-01",
        stars: 200,
        monthsInactive: 1,
      },
      {
        owner: "stale",
        repo: "old-lib",
        url: "https://github.com/stale/old-lib",
        status: "stale",
        lastCommit: "2023-01-01",
        stars: 50,
        monthsInactive: 29,
      },
      {
        owner: "archived",
        repo: "legacy",
        url: "https://github.com/archived/legacy",
        status: "archived",
        lastCommit: "2024-01-15",
        stars: 100,
        monthsInactive: 16,
      },
      {
        owner: "gone",
        repo: "deleted",
        url: "https://github.com/gone/deleted",
        status: "deleted",
        lastCommit: null,
        stars: null,
        monthsInactive: null,
      },
      {
        owner: "error",
        repo: "failed",
        url: "https://github.com/error/failed",
        status: "error",
        lastCommit: null,
        stars: null,
        monthsInactive: null,
        errorMessage: "500 Internal Server Error",
      },
    ];

    const report = generateReport(results);

    // Check it's valid markdown with expected structure
    assert.ok(report.includes("# Staleness Report"));
    assert.ok(report.includes("## Summary"));
    assert.ok(report.includes("## Details"));

    // Check counts
    assert.ok(report.includes("Total GitHub repos checked: 5"));
    assert.ok(report.includes("Healthy: 1"));
    assert.ok(report.includes("Stale (12+ months inactive): 1"));
    assert.ok(report.includes("Archived: 1"));
    assert.ok(report.includes("Deleted or private: 1"));
    assert.ok(report.includes("Errors: 1"));

    // Check detail sections exist
    assert.ok(report.includes("### Stale"));
    assert.ok(report.includes("### Archived"));
    assert.ok(report.includes("### Deleted or Private"));
    assert.ok(report.includes("### Errors"));

    // Check stale entry appears in table
    assert.ok(report.includes("[stale/old-lib]"));
    assert.ok(report.includes("29 months"));
  });

  it("omits empty sections from details", () => {
    const results = [
      {
        owner: "healthy",
        repo: "project",
        url: "https://github.com/healthy/project",
        status: "healthy",
        lastCommit: "2025-05-01",
        stars: 200,
        monthsInactive: 1,
      },
    ];

    const report = generateReport(results);
    assert.ok(report.includes("Healthy: 1"));
    assert.ok(!report.includes("### Stale"));
    assert.ok(!report.includes("### Archived"));
    assert.ok(!report.includes("### Deleted or Private"));
    assert.ok(!report.includes("### Errors"));
  });
});

// ---------------------------------------------------------------------------
// Rate Limiting Tests
// ---------------------------------------------------------------------------

describe("calculateBackoff", () => {
  it("returns correct exponential backoff values", () => {
    assert.equal(calculateBackoff(0), 1000); // 1s
    assert.equal(calculateBackoff(1), 2000); // 2s
    assert.equal(calculateBackoff(2), 4000); // 4s
    assert.equal(calculateBackoff(3), 8000); // 8s
    assert.equal(calculateBackoff(4), 16000); // 16s
  });

  it("caps backoff at 30 seconds", () => {
    assert.equal(calculateBackoff(5), 30000); // 32s capped to 30s
    assert.equal(calculateBackoff(10), 30000); // very large capped to 30s
  });
});
