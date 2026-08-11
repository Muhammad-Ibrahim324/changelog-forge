// Conventional Commits subject line format:
//   <type>[optional scope][optional !]: <description>
// Examples:
//   feat(auth): add OAuth login
//   fix: correct off-by-one error in pagination
//   feat!: drop support for Node 16
//   chore(deps): bump lodash to 4.17.21

const SUBJECT_RE = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;

export const TYPE_LABELS = {
  feat: "✨ Features",
  fix: "🐛 Fixes",
  perf: "⚡ Performance",
  refactor: "♻️ Refactors",
  docs: "📝 Documentation",
  test: "✅ Tests",
  build: "📦 Build",
  ci: "👷 CI",
  chore: "🧹 Chores",
  revert: "⏪ Reverts",
  style: "🎨 Style",
};

// Order in which groups appear in the rendered changelog.
export const TYPE_ORDER = [
  "feat",
  "fix",
  "perf",
  "refactor",
  "docs",
  "test",
  "build",
  "ci",
  "style",
  "chore",
  "revert",
];

/**
 * Parses a single commit's subject line into structured Conventional Commit data.
 * Returns null if the subject doesn't match the Conventional Commits format
 * (e.g. "wip", "fixed typo", merge commits, etc.) — callers should decide
 * whether to bucket those separately or drop them.
 */
export function parseSubject(subject) {
  if (!subject) return null;
  const match = subject.trim().match(SUBJECT_RE);
  if (!match) return null;

  const [, type, scope, breakingBang, description] = match;
  const normalizedType = type.toLowerCase();

  return {
    type: normalizedType,
    scope: scope ?? null,
    breaking: Boolean(breakingBang),
    description: description.trim(),
    known: Object.prototype.hasOwnProperty.call(TYPE_LABELS, normalizedType),
  };
}

/**
 * Parses a full commit object (as returned by git.js) into a changelog entry.
 * Also detects "BREAKING CHANGE:" footers if a full commit body is provided.
 */
export function parseCommit(commit, { body = "" } = {}) {
  const parsed = parseSubject(commit.subject);
  if (!parsed) {
    return {
      ...commit,
      type: "other",
      scope: null,
      breaking: false,
      description: commit.subject,
      known: false,
    };
  }

  const breakingFromBody = /BREAKING CHANGE:/i.test(body);

  return {
    ...commit,
    ...parsed,
    breaking: parsed.breaking || breakingFromBody,
  };
}

/**
 * Groups a list of parsed commits by conventional-commit type.
 * Unrecognized types are collected under "other".
 * Returns a Map preserving TYPE_ORDER, with "other" last (only if non-empty).
 */
export function groupByType(parsedCommits) {
  const groups = new Map();
  for (const type of TYPE_ORDER) groups.set(type, []);
  groups.set("other", []);

  for (const commit of parsedCommits) {
    const key = groups.has(commit.type) ? commit.type : "other";
    groups.get(key).push(commit);
  }

  // Drop empty groups.
  for (const [key, commits] of groups) {
    if (commits.length === 0) groups.delete(key);
  }

  return groups;
}

/**
 * Returns only the commits flagged as breaking changes.
 */
export function getBreakingChanges(parsedCommits) {
  return parsedCommits.filter((c) => c.breaking);
}
