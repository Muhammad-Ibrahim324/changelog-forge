import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseCommit } from "../src/parser.js";
import { renderSection, prependToChangelog } from "../src/render.js";

function commit(subject, overrides = {}) {
  return parseCommit({
    subject,
    hash: "1234567890abcdef",
    shortHash: "1234567",
    author: "Test Author",
    date: "2026-08-10",
    ...overrides,
  });
}

describe("renderSection", () => {
  test("includes a version heading with date", () => {
    const md = renderSection({
      commits: [commit("feat: add thing")],
      version: "v1.0.0",
      date: "2026-08-10",
    });
    assert.match(md, /^## v1\.0\.0 \(2026-08-10\)/);
  });

  test("groups commits under labeled headings", () => {
    const md = renderSection({
      commits: [commit("feat: add thing"), commit("fix: fix thing")],
      version: "v1.0.0",
    });
    assert.match(md, /### ✨ Features/);
    assert.match(md, /### 🐛 Fixes/);
  });

  test("links commits when repoUrl is provided", () => {
    const md = renderSection({
      commits: [commit("feat: add thing")],
      version: "v1.0.0",
      repoUrl: "https://github.com/user/repo",
    });
    assert.match(md, /\[1234567\]\(https:\/\/github\.com\/user\/repo\/commit\/1234567890abcdef\)/);
  });

  test("falls back to bare short hash when no repoUrl", () => {
    const md = renderSection({
      commits: [commit("feat: add thing")],
      version: "v1.0.0",
      repoUrl: null,
    });
    assert.match(md, /\(1234567\)/);
    assert.doesNotMatch(md, /\[1234567\]/);
  });

  test("renders a BREAKING CHANGES section first when present", () => {
    const md = renderSection({
      commits: [commit("feat: normal"), commit("feat!: breaking one")],
      version: "v2.0.0",
    });
    const breakingIdx = md.indexOf("BREAKING CHANGES");
    const featuresIdx = md.indexOf("Features");
    assert.ok(breakingIdx > -1 && breakingIdx < featuresIdx);
  });

  test("excludes 'other' commits by default", () => {
    const md = renderSection({
      commits: [commit("not a conventional commit")],
      version: "v1.0.0",
    });
    assert.doesNotMatch(md, /not a conventional commit/);
  });

  test("includes 'other' commits when includeOther is true", () => {
    const md = renderSection({
      commits: [commit("not a conventional commit")],
      version: "v1.0.0",
      includeOther: true,
    });
    assert.match(md, /not a conventional commit/);
  });

  test("shows placeholder text when there are no commits", () => {
    const md = renderSection({ commits: [], version: "v1.0.0" });
    assert.match(md, /No notable changes/);
  });
});

describe("prependToChangelog", () => {
  test("creates a new changelog with header when none exists", () => {
    const result = prependToChangelog("", "## v1.0.0\n\n- stuff\n");
    assert.match(result, /^# Changelog\n\n## v1\.0\.0/);
  });

  test("prepends new section above existing content", () => {
    const existing = "# Changelog\n\n## v1.0.0\n\n- old stuff\n";
    const result = prependToChangelog(existing, "## v2.0.0\n\n- new stuff\n");
    const v2Idx = result.indexOf("v2.0.0");
    const v1Idx = result.indexOf("v1.0.0");
    assert.ok(v2Idx > -1 && v1Idx > -1 && v2Idx < v1Idx);
  });

  test("only ever has a single '# Changelog' header", () => {
    const existing = "# Changelog\n\n## v1.0.0\n\n- old\n";
    const result = prependToChangelog(existing, "## v2.0.0\n\n- new\n");
    const matches = result.match(/^# Changelog$/gm);
    assert.equal(matches.length, 1);
  });
});
