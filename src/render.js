import { TYPE_LABELS, groupByType, getBreakingChanges } from "./parser.js";

/**
 * Renders a single commit line, e.g.:
 *   - **auth:** add OAuth login ([a1b2c3d](https://github.com/user/repo/commit/hash))
 */
function renderCommitLine(commit, repoUrl) {
  const scopePart = commit.scope ? `**${commit.scope}:** ` : "";
  const link = repoUrl
    ? ` ([${commit.shortHash}](${repoUrl}/commit/${commit.hash}))`
    : ` (${commit.shortHash})`;
  return `- ${scopePart}${commit.description}${link}`;
}

/**
 * Renders a full changelog section for one version/range.
 *
 * @param {object} opts
 * @param {Array} opts.commits - parsed commits (see parser.js)
 * @param {string} opts.version - e.g. "v1.4.0" or "Unreleased"
 * @param {string|null} opts.date - ISO date string, e.g. "2026-08-10"
 * @param {string|null} opts.repoUrl - base repo URL for commit links
 * @param {boolean} opts.includeOther - whether to render unrecognized commits
 */
export function renderSection({
  commits,
  version,
  date = null,
  repoUrl = null,
  includeOther = false,
}) {
  const heading = date ? `## ${version} (${date})` : `## ${version}`;
  const lines = [heading, ""];

  const breaking = getBreakingChanges(commits);
  if (breaking.length > 0) {
    lines.push("### ⚠ BREAKING CHANGES", "");
    for (const c of breaking) lines.push(renderCommitLine(c, repoUrl));
    lines.push("");
  }

  const grouped = groupByType(commits);
  for (const [type, group] of grouped) {
    if (type === "other" && !includeOther) continue;
    const label = TYPE_LABELS[type] ?? "🔧 Other";
    lines.push(`### ${label}`, "");
    for (const c of group) lines.push(renderCommitLine(c, repoUrl));
    lines.push("");
  }

  if (commits.length === 0) {
    lines.push("_No notable changes._", "");
  }

  return lines.join("\n").trimEnd() + "\n";
}

/**
 * Prepends a new section to an existing changelog string (or creates one).
 */
export function prependToChangelog(existingContent, newSection) {
  const header = "# Changelog\n\n";
  if (!existingContent || !existingContent.trim()) {
    return header + newSection + "\n";
  }

  const body = existingContent.startsWith(header)
    ? existingContent.slice(header.length)
    : existingContent;

  return header + newSection + "\n" + body.trimStart();
}
