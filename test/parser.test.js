import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseSubject,
  parseCommit,
  groupByType,
  getBreakingChanges,
} from "../src/parser.js";

describe("parseSubject", () => {
  test("parses a basic type + description", () => {
    const result = parseSubject("fix: correct off-by-one error");
    assert.deepEqual(result, {
      type: "fix",
      scope: null,
      breaking: false,
      description: "correct off-by-one error",
      known: true,
    });
  });

  test("parses type with scope", () => {
    const result = parseSubject("feat(auth): add OAuth login");
    assert.equal(result.type, "feat");
    assert.equal(result.scope, "auth");
    assert.equal(result.description, "add OAuth login");
  });

  test("detects breaking change marker (!)", () => {
    const result = parseSubject("feat!: drop support for Node 16");
    assert.equal(result.breaking, true);
    assert.equal(result.type, "feat");
  });

  test("detects breaking change marker with scope", () => {
    const result = parseSubject("feat(api)!: remove deprecated endpoint");
    assert.equal(result.breaking, true);
    assert.equal(result.scope, "api");
  });

  test("marks unrecognized types as known:false but still parses them", () => {
    const result = parseSubject("wip: half-finished thing");
    assert.equal(result.type, "wip");
    assert.equal(result.known, false);
  });

  test("returns null for subjects with no colon", () => {
    assert.equal(parseSubject("just a plain commit message"), null);
  });

  test("returns null for empty or missing subject", () => {
    assert.equal(parseSubject(""), null);
    assert.equal(parseSubject(undefined), null);
  });

  test("is case-insensitive on type", () => {
    const result = parseSubject("FIX: uppercase type");
    assert.equal(result.type, "fix");
  });

  test("trims whitespace around description", () => {
    const result = parseSubject("chore:   extra spaces   ");
    assert.equal(result.description, "extra spaces");
  });
});

describe("parseCommit", () => {
  const baseCommit = {
    hash: "abc123def456",
    shortHash: "abc123d",
    author: "Jane Dev",
    date: "2026-08-01",
  };

  test("merges parsed subject fields into the commit object", () => {
    const commit = parseCommit({ ...baseCommit, subject: "feat: add dark mode" });
    assert.equal(commit.type, "feat");
    assert.equal(commit.description, "add dark mode");
    assert.equal(commit.hash, "abc123def456");
  });

  test("falls back to type 'other' for non-conventional subjects", () => {
    const commit = parseCommit({ ...baseCommit, subject: "quick fix for build" });
    assert.equal(commit.type, "other");
    assert.equal(commit.description, "quick fix for build");
    assert.equal(commit.known, false);
  });

  test("detects BREAKING CHANGE footer in body even without a subject !", () => {
    const commit = parseCommit(
      { ...baseCommit, subject: "feat(api): change response shape" },
      { body: "BREAKING CHANGE: response is now paginated" }
    );
    assert.equal(commit.breaking, true);
  });

  test("does not falsely flag breaking when no marker or footer present", () => {
    const commit = parseCommit({ ...baseCommit, subject: "fix: typo in docs" });
    assert.equal(commit.breaking, false);
  });
});

describe("groupByType", () => {
  test("groups commits under their type and drops empty groups", () => {
    const commits = [
      parseCommit({ subject: "feat: a" }),
      parseCommit({ subject: "feat: b" }),
      parseCommit({ subject: "fix: c" }),
    ];
    const groups = groupByType(commits);
    assert.equal(groups.get("feat").length, 2);
    assert.equal(groups.get("fix").length, 1);
    assert.equal(groups.has("docs"), false);
  });

  test("buckets unrecognized types under 'other'", () => {
    const commits = [
      parseCommit({ subject: "wip: something" }),
      parseCommit({ subject: "no format here" }),
    ];
    const groups = groupByType(commits);
    assert.equal(groups.get("other").length, 2);
  });

  test("preserves feat before fix ordering when both present", () => {
    const commits = [parseCommit({ subject: "fix: x" }), parseCommit({ subject: "feat: y" })];
    const groups = groupByType(commits);
    const keys = [...groups.keys()];
    assert.ok(keys.indexOf("feat") < keys.indexOf("fix"));
  });
});

describe("getBreakingChanges", () => {
  test("filters to only breaking commits", () => {
    const commits = [
      parseCommit({ subject: "feat!: breaking one" }),
      parseCommit({ subject: "feat: normal one" }),
      parseCommit(
        { subject: "fix: two" },
        { body: "BREAKING CHANGE: also breaking" }
      ),
    ];
    const breaking = getBreakingChanges(commits);
    assert.equal(breaking.length, 2);
  });
});
