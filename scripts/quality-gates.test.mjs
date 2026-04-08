#!/usr/bin/env node

/**
 * quality-gates.test.mjs — Unit tests for quality-gates.mjs
 *
 * Run with: node --test scripts/quality-gates.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateFormat,
  checkDuplicates,
  isExcluded,
  parseItem,
  generateMarkdownSummary,
} from "./quality-gates.mjs";

// ---------------------------------------------------------------------------
// Format validation
// ---------------------------------------------------------------------------

describe("validateFormat", () => {
  it("accepts valid format with period", () => {
    const result = validateFormat(
      "- [Name](https://url.com) - Description ending with period.",
    );
    assert.equal(result.pass, true);
    assert.equal(result.message, "");
  });

  it("accepts valid format with exclamation mark", () => {
    const result = validateFormat(
      "- [Name](https://url.com) - Description ending with bang!",
    );
    assert.equal(result.pass, true);
  });

  it("accepts valid format with question mark", () => {
    const result = validateFormat(
      "- [Name](https://url.com) - Description ending with question?",
    );
    assert.equal(result.pass, true);
  });

  it("rejects missing dash separator (colon instead)", () => {
    const result = validateFormat(
      "- [Name](https://url.com): Description.",
    );
    assert.equal(result.pass, false);
    assert.ok(result.message.length > 0);
  });

  it("rejects missing trailing punctuation", () => {
    const result = validateFormat(
      "- [Name](https://url.com) - Description without punctuation",
    );
    assert.equal(result.pass, false);
    assert.ok(result.message.includes("punctuation"));
  });

  it("rejects missing URL", () => {
    const result = validateFormat("- Name - Description.");
    assert.equal(result.pass, false);
    assert.ok(result.message.length > 0);
  });

  it("rejects empty string", () => {
    const result = validateFormat("");
    assert.equal(result.pass, false);
  });
});

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

describe("checkDuplicates", () => {
  const readmeContent = [
    "- [Existing](https://existing-tool.com) - An existing tool.",
    "- [Another](https://ANOTHER-TOOL.com) - Another tool.",
  ].join("\n");

  it("detects duplicate URL already in README", () => {
    const result = checkDuplicates("https://existing-tool.com", readmeContent);
    assert.equal(result.pass, false);
    assert.ok(result.message.includes("duplicate"));
  });

  it("passes for a new URL not in README", () => {
    const result = checkDuplicates("https://brand-new.com", readmeContent);
    assert.equal(result.pass, true);
  });

  it("performs case-insensitive URL comparison", () => {
    const result = checkDuplicates("https://another-tool.com", readmeContent);
    assert.equal(result.pass, false);
    assert.ok(result.message.includes("duplicate"));
  });
});

// ---------------------------------------------------------------------------
// Exclusion list
// ---------------------------------------------------------------------------

describe("isExcluded", () => {
  it("excludes example.com URLs", () => {
    assert.equal(isExcluded("https://example.com"), true);
    assert.equal(isExcluded("https://example.com/path"), true);
  });

  it("excludes example.org URLs", () => {
    assert.equal(isExcluded("https://example.org"), true);
    assert.equal(isExcluded("http://example.org/deep/path"), true);
  });

  it("excludes github.com/example/ URLs", () => {
    assert.equal(isExcluded("https://github.com/example/repo"), true);
  });

  it("excludes YOUR_* URLs", () => {
    assert.equal(isExcluded("https://github.com/YOUR_USERNAME/repo"), true);
    assert.equal(isExcluded("https://www.YOUR_SITE.com"), true);
  });

  it("does not exclude regular URLs", () => {
    assert.equal(isExcluded("https://github.com/sindresorhus/awesome"), false);
    assert.equal(isExcluded("https://nodejs.org"), false);
  });
});

// ---------------------------------------------------------------------------
// Item parsing
// ---------------------------------------------------------------------------

describe("parseItem", () => {
  it("extracts name, URL, and description from valid item", () => {
    const item = parseItem(
      "- [Cool Tool](https://cool.dev) - A very cool tool.",
    );
    assert.deepEqual(item, {
      name: "Cool Tool",
      url: "https://cool.dev",
      description: "A very cool tool.",
    });
  });

  it("returns null for invalid format", () => {
    assert.equal(parseItem("not a list item"), null);
    assert.equal(parseItem("- just text without link"), null);
    assert.equal(parseItem(""), null);
  });

  it("handles URLs with paths and fragments", () => {
    const item = parseItem(
      "- [Docs](https://example.dev/docs#section) - Documentation resource.",
    );
    assert.equal(item.url, "https://example.dev/docs#section");
    assert.equal(item.name, "Docs");
  });
});

// ---------------------------------------------------------------------------
// Markdown summary generation
// ---------------------------------------------------------------------------

describe("generateMarkdownSummary", () => {
  it("includes the Quality Gate Results header", () => {
    const results = {
      items: [],
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
      advanced_checks_enabled: false,
    };
    const md = generateMarkdownSummary(results);
    assert.ok(md.includes("## Quality Gate Results"));
  });

  it("generates correct pass row", () => {
    const results = {
      items: [
        {
          name: "Tool",
          url: "https://tool.com",
          checks: {
            format: { pass: true, message: "" },
            duplicate: { pass: true, message: "" },
            link: { pass: true, message: "", status: 200 },
          },
        },
      ],
      summary: { total: 1, passed: 1, failed: 0, warnings: 0 },
      advanced_checks_enabled: false,
    };
    const md = generateMarkdownSummary(results);
    assert.ok(md.includes("Tool"));
    assert.ok(md.includes("passed"));
  });

  it("generates correct fail row", () => {
    const results = {
      items: [
        {
          name: "Bad Item",
          url: "https://bad.com",
          checks: {
            format: { pass: false, message: "Invalid format" },
            duplicate: { pass: true, message: "" },
          },
        },
      ],
      summary: { total: 1, passed: 0, failed: 1, warnings: 0 },
      advanced_checks_enabled: false,
    };
    const md = generateMarkdownSummary(results);
    assert.ok(md.includes("Bad Item"));
    assert.ok(md.includes("failed") || md.includes("Invalid format"));
  });

  it("shows summary counts", () => {
    const results = {
      items: [],
      summary: { total: 3, passed: 2, failed: 1, warnings: 0 },
      advanced_checks_enabled: false,
    };
    const md = generateMarkdownSummary(results);
    assert.ok(md.includes("3"));
    assert.ok(md.includes("2"));
    assert.ok(md.includes("1"));
  });
});
