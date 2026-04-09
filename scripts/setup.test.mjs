import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findPlaceholders, replacePlaceholders, parseCliArgs } from "./setup.mjs";

// ---------------------------------------------------------------------------
// findPlaceholders
// ---------------------------------------------------------------------------

describe("findPlaceholders", () => {
  it("finds all YOUR_* patterns in content", () => {
    const content = [
      "# Awesome YOUR_TOPIC",
      "Description: YOUR_LIST_DESCRIPTION",
      "By YOUR_GITHUB_USERNAME/YOUR_REPO_NAME",
      "Contact: YOUR_EMAIL",
      "## YOUR_CATEGORY_1",
      "## YOUR_CATEGORY_2",
    ].join("\n");

    const result = findPlaceholders(content);

    assert.deepStrictEqual(result, [
      "YOUR_CATEGORY_1",
      "YOUR_CATEGORY_2",
      "YOUR_EMAIL",
      "YOUR_GITHUB_USERNAME",
      "YOUR_LIST_DESCRIPTION",
      "YOUR_REPO_NAME",
      "YOUR_TOPIC",
    ]);
  });

  it("returns empty array for content with no placeholders", () => {
    const content = "# Awesome Docker\n\nA curated list of Docker resources.\n";
    const result = findPlaceholders(content);
    assert.deepStrictEqual(result, []);
  });

  it("deduplicates repeated placeholders", () => {
    const content = "YOUR_TOPIC and YOUR_TOPIC again and YOUR_TOPIC once more";
    const result = findPlaceholders(content);
    assert.deepStrictEqual(result, ["YOUR_TOPIC"]);
  });
});

// ---------------------------------------------------------------------------
// replacePlaceholders
// ---------------------------------------------------------------------------

describe("replacePlaceholders", () => {
  const baseValues = {
    topic: "Docker",
    username: "johndoe",
    repo: "awesome-docker",
    email: "john@example.com",
    description: "A curated list of Docker resources",
    categories: ["Tools", "Libraries"],
  };

  it("replaces all placeholders correctly", () => {
    const content = [
      "# Awesome YOUR_TOPIC",
      "YOUR_LIST_DESCRIPTION",
      "https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME",
      "Contact: YOUR_EMAIL",
      "## YOUR_CATEGORY_1",
      "## YOUR_CATEGORY_2",
    ].join("\n");

    const result = replacePlaceholders(content, baseValues);

    assert.ok(result.includes("# Awesome Docker"));
    assert.ok(result.includes("A curated list of Docker resources"));
    assert.ok(result.includes("https://github.com/johndoe/awesome-docker"));
    assert.ok(result.includes("Contact: john@example.com"));
    assert.ok(result.includes("## Tools"));
    assert.ok(result.includes("## Libraries"));
  });

  it("handles special characters in topic (C++)", () => {
    const content = "# Awesome YOUR_TOPIC resources for YOUR_TOPIC developers";
    const values = { ...baseValues, topic: "C++" };
    const result = replacePlaceholders(content, values);
    assert.ok(result.includes("# Awesome C++ resources for C++ developers"));
  });

  it("handles special characters in topic (Node.js)", () => {
    const content = "# Awesome YOUR_TOPIC\nYOUR_LIST_DESCRIPTION";
    const values = {
      ...baseValues,
      topic: "Node.js",
      description: "Node.js resources and tools",
    };
    const result = replacePlaceholders(content, values);
    assert.ok(result.includes("# Awesome Node.js"));
    assert.ok(result.includes("Node.js resources and tools"));
  });

  it("handles category replacements with two categories", () => {
    const content = [
      "- [YOUR_CATEGORY_1](#cat1)",
      "- [YOUR_CATEGORY_2](#cat2)",
      "",
      "## YOUR_CATEGORY_1",
      "",
      "_Resources and tools for YOUR_CATEGORY_1._",
      "",
      "- [Example](https://example.com) - An example.",
      "",
      "## YOUR_CATEGORY_2",
      "",
      "_Resources and tools for YOUR_CATEGORY_2._",
      "",
      "- [Another](https://example.org) - Another example.",
      "",
    ].join("\n");

    const result = replacePlaceholders(content, baseValues);

    assert.ok(result.includes("## Tools"));
    assert.ok(result.includes("## Libraries"));
    assert.ok(result.includes("_Resources and tools for Tools._"));
    assert.ok(result.includes("_Resources and tools for Libraries._"));
  });

  it("removes YOUR_CATEGORY_2 section when only one category provided", () => {
    const content = [
      "- [YOUR_CATEGORY_1](#cat1)",
      "- [YOUR_CATEGORY_2](#cat2)",
      "",
      "## YOUR_CATEGORY_1",
      "",
      "_Resources and tools for YOUR_CATEGORY_1._",
      "",
      "- [Example](https://example.com) - An example.",
      "",
      "## YOUR_CATEGORY_2",
      "",
      "_Resources and tools for YOUR_CATEGORY_2._",
      "",
      "- [Another](https://example.org) - Another example.",
      "",
      "## Related",
    ].join("\n");

    const values = { ...baseValues, categories: ["Tools"] };
    const result = replacePlaceholders(content, values);

    assert.ok(result.includes("## Tools"));
    assert.ok(!result.includes("YOUR_CATEGORY_2"));
    assert.ok(!result.includes("## Libraries"));
    assert.ok(result.includes("## Related"));
  });

  it("removes YOUR_CATEGORY_2 from dropdown options when one category", () => {
    const content = [
      "      options:",
      "        - YOUR_CATEGORY_1",
      "        - YOUR_CATEGORY_2",
      "        - Suggest new category",
    ].join("\n");

    const values = { ...baseValues, categories: ["Tools"] };
    const result = replacePlaceholders(content, values);

    assert.ok(result.includes("- Tools"));
    assert.ok(!result.includes("YOUR_CATEGORY_2"));
  });
});

// ---------------------------------------------------------------------------
// parseCliArgs
// ---------------------------------------------------------------------------

describe("parseCliArgs", () => {
  it("parses all flags correctly", () => {
    const args = [
      "node",
      "scripts/setup.mjs",
      "--topic",
      "Docker",
      "--username",
      "johndoe",
      "--repo",
      "awesome-docker",
      "--email",
      "john@example.com",
      "--description",
      "A curated list of Docker resources",
      "--categories",
      "Tools,Libraries",
      "--yes",
      "--force",
    ];

    const result = parseCliArgs(args);

    assert.strictEqual(result.topic, "Docker");
    assert.strictEqual(result.username, "johndoe");
    assert.strictEqual(result.repo, "awesome-docker");
    assert.strictEqual(result.email, "john@example.com");
    assert.strictEqual(result.description, "A curated list of Docker resources");
    assert.deepStrictEqual(result.categories, ["Tools", "Libraries"]);
    assert.strictEqual(result.yes, true);
    assert.strictEqual(result.force, true);
  });

  it("returns null for missing required flags", () => {
    const args = ["node", "scripts/setup.mjs", "--topic", "Docker"];
    const result = parseCliArgs(args);
    assert.strictEqual(result, null);
  });

  it("returns null when no flags provided", () => {
    const args = ["node", "scripts/setup.mjs"];
    const result = parseCliArgs(args);
    assert.strictEqual(result, null);
  });

  it("parses categories with spaces after commas", () => {
    const args = [
      "node",
      "scripts/setup.mjs",
      "--topic",
      "Go",
      "--username",
      "user",
      "--repo",
      "awesome-go",
      "--email",
      "u@e.com",
      "--description",
      "Go stuff",
      "--categories",
      "Tools, Libraries, Frameworks",
    ];

    const result = parseCliArgs(args);
    assert.deepStrictEqual(result.categories, [
      "Tools",
      "Libraries",
      "Frameworks",
    ]);
  });

  it("sets yes and force to false when flags are absent", () => {
    const args = [
      "node",
      "scripts/setup.mjs",
      "--topic",
      "Go",
      "--username",
      "user",
      "--repo",
      "awesome-go",
      "--email",
      "u@e.com",
      "--description",
      "Go stuff",
      "--categories",
      "Tools,Libraries",
    ];

    const result = parseCliArgs(args);
    assert.strictEqual(result.yes, false);
    assert.strictEqual(result.force, false);
  });
});

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

describe("idempotency", () => {
  it("leaves no YOUR_* patterns after replacement", () => {
    const content = [
      "# Awesome YOUR_TOPIC [![Badge](https://awesome.re/badge.svg)](https://awesome.re)",
      "",
      "> A curated list of awesome YOUR_TOPIC resources.",
      "",
      "YOUR_LIST_DESCRIPTION",
      "",
      "[![Lint](https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/actions/workflows/validate.yml/badge.svg)](https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME/actions/workflows/validate.yml)",
      "",
      "## YOUR_CATEGORY_1",
      "",
      "_Resources and tools for YOUR_CATEGORY_1._",
      "",
      "- [Example](https://example.com) - An example.",
      "",
      "## YOUR_CATEGORY_2",
      "",
      "_Resources and tools for YOUR_CATEGORY_2._",
      "",
      "- [Another](https://example.org) - Another.",
      "",
      "Contact: YOUR_EMAIL",
    ].join("\n");

    const values = {
      topic: "Docker",
      username: "johndoe",
      repo: "awesome-docker",
      email: "john@example.com",
      description: "A curated list of Docker resources",
      categories: ["Tools", "Libraries"],
    };

    const result = replacePlaceholders(content, values);
    const remaining = findPlaceholders(result);

    assert.deepStrictEqual(
      remaining,
      [],
      `Found remaining placeholders: ${remaining.join(", ")}`,
    );
  });

  it("leaves no YOUR_* patterns with single category", () => {
    const content = [
      "YOUR_TOPIC YOUR_GITHUB_USERNAME YOUR_REPO_NAME",
      "YOUR_LIST_DESCRIPTION YOUR_EMAIL",
      "YOUR_CATEGORY_1",
      "## YOUR_CATEGORY_2",
      "",
      "_Resources and tools for YOUR_CATEGORY_2._",
      "",
      "- [Item](https://example.com) - Desc.",
      "",
    ].join("\n");

    const values = {
      topic: "Rust",
      username: "rustacean",
      repo: "awesome-rust",
      email: "rust@example.com",
      description: "Rust resources",
      categories: ["Crates"],
    };

    const result = replacePlaceholders(content, values);
    const remaining = findPlaceholders(result);

    assert.deepStrictEqual(
      remaining,
      [],
      `Found remaining placeholders: ${remaining.join(", ")}`,
    );
  });
});
